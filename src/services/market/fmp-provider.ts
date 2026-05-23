import type { IMarketProvider, MarketQuote, MarketCandle, ProviderMetrics } from "./types";
import { CircuitBreaker } from "./circuit-breaker";
import { RateLimitManager } from "./rate-limit-manager";

export class FMPProvider implements IMarketProvider {
  public id = "fmp";
  public priority = 2;
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
    this.breaker = new CircuitBreaker(5, 45000); // Slightly more conservative for secondary
    this.limiter = new RateLimitManager(250, 10); // FMP free tier is very limited
  }

  private async fetchWithMetrics<T>(url: string): Promise<T> {
    await this.limiter.throttle();
    
    return this.breaker.execute(async () => {
      const start = Date.now();
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`FMP error: ${response.status}`);
        
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
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const data = await this.fetchWithMetrics<any[]>(
      `https://financialmodelingprep.com/api/v3/quote/${symbol.toUpperCase()}?apikey=${this.apiKey}`
    );
    
    if (!data || data.length === 0) throw new Error("No data from FMP");
    const q = data[0];

    return {
      symbol: symbol.toUpperCase(),
      price: q.price,
      change: q.change,
      changePercent: q.changesPercentage,
      open: q.open,
      high: q.dayHigh,
      low: q.dayLow,
      previousClose: q.previousClose,
      volume: q.volume,
      timestamp: q.timestamp * 1000,
      provider: this.id
    };
  }

  async getHistorical(symbol: string, days: number = 30): Promise<MarketCandle[]> {
    const data = await this.fetchWithMetrics<any>(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol.toUpperCase()}?timeseries=${days}&apikey=${this.apiKey}`
    );

    if (!data || !data.historical) return [];

    return data.historical.map((item: any) => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      timestamp: new Date(item.date).getTime()
    }));
  }

  getMetrics(): ProviderMetrics { return this.metrics; }
  isHealthy(): boolean { return this.breaker.getState() === "CLOSED"; }
}
