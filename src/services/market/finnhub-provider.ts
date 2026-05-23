import type { IMarketProvider, MarketQuote, MarketCandle, MarketNews, ProviderMetrics } from "./types";
import { CircuitBreaker } from "./circuit-breaker";
import { RateLimitManager } from "./rate-limit-manager";

export class FinnhubProvider implements IMarketProvider {
  public id = "finnhub";
  public priority = 1;
  private apiKey: string;
  private breaker: CircuitBreaker;
  private limiter: RateLimitManager;
  private metrics: ProviderMetrics = {
    successCount: 0,
    failureCount: 0,
    totalLatency: 0,
    avgLatency: 0,
    rateLimitHits: 0,
    circuitBreakerOpens: 0,
    healthScore: 100
  };

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.breaker = new CircuitBreaker(5, 30000);
    // Finnhub free tier: 60 calls/minute
    this.limiter = new RateLimitManager(3600, 55); 
  }

  private async fetchWithMetrics<T>(url: string): Promise<T> {
    await this.limiter.throttle();
    
    return this.breaker.execute(async () => {
      const start = Date.now();
      try {
        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 429) {
            this.metrics.rateLimitHits++;
            throw new Error("Rate limit exceeded");
          }
          throw new Error(`Finnhub error: ${response.status}`);
        }
        
        const data = await response.json();
        const latency = Date.now() - start;
        this.updateMetrics(true, latency);
        return data;
      } catch (err) {
        this.updateMetrics(false, 0);
        throw err;
      }
    });
  }

  private updateMetrics(success: boolean, latency: number) {
    if (success) {
      this.metrics.successCount++;
      this.metrics.totalLatency += latency;
      this.metrics.avgLatency = this.metrics.totalLatency / this.metrics.successCount;
    } else {
      this.metrics.failureCount++;
    }
    
    // Simple health scoring
    const totalRequests = this.metrics.successCount + this.metrics.failureCount;
    const successRate = (this.metrics.successCount / totalRequests) * 100;
    this.metrics.healthScore = Math.max(0, Math.min(100, successRate));
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const data = await this.fetchWithMetrics<any>(
      `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${this.apiKey}`
    );
    
    return {
      symbol: symbol.toUpperCase(),
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      open: data.o,
      high: data.h,
      low: data.l,
      previousClose: data.pc,
      volume: 0, // Finnhub quote endpoint doesn't return real-time vol easily
      timestamp: data.t * 1000,
      provider: this.id
    };
  }

  async getHistorical(symbol: string, days: number = 30): Promise<MarketCandle[]> {
    const to = Math.floor(Date.now() / 1000);
    const from = to - (days * 24 * 60 * 60);
    
    const data = await this.fetchWithMetrics<any>(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`
    );

    if (data.s !== "ok") return [];

    return data.t.map((timestamp: number, i: number) => ({
      date: new Date(timestamp * 1000).toISOString().split("T")[0],
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
      timestamp: timestamp * 1000
    }));
  }

  async getNews(symbol: string): Promise<MarketNews[]> {
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 30 * 24 * 60 * 60000).toISOString().split("T")[0];
    
    const data = await this.fetchWithMetrics<any[]>(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol.toUpperCase()}&from=${from}&to=${to}&token=${this.apiKey}`
    );

    return data.slice(0, 10).map(item => ({
      id: item.id.toString(),
      headline: item.headline,
      summary: item.summary,
      url: item.url,
      source: item.source,
      timestamp: item.datetime * 1000,
      category: item.category
    }));
  }

  getMetrics(): ProviderMetrics { return this.metrics; }
  isHealthy(): boolean { return this.breaker.getState() === "CLOSED"; }
}
