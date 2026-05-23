import type { IMarketProvider, MarketQuote, MarketCandle, MarketIndicators, ProviderMetrics } from "./types";
import { CircuitBreaker } from "./circuit-breaker";
import { RateLimitManager } from "./rate-limit-manager";

export class AlphaVantageProvider implements IMarketProvider {
  public id = "alphavantage";
  public priority = 3;
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
    this.breaker = new CircuitBreaker(3, 60000); 
    // Alpha Vantage free tier: 25 calls/day (very strict), maybe 5/min
    this.limiter = new RateLimitManager(25, 2); 
  }

  private async fetchWithMetrics<T>(url: string): Promise<T> {
    await this.limiter.throttle();
    
    return this.breaker.execute(async () => {
      const start = Date.now();
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Alpha Vantage returns 200 OK even for rate limit errors in the body
        if (data["Note"] || data["Information"]) {
          this.metrics.rateLimitHits++;
          throw new Error("Alpha Vantage rate limit or info message");
        }

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
    const data = await this.fetchWithMetrics<any>(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol.toUpperCase()}&apikey=${this.apiKey}`
    );
    
    const q = data["Global Quote"];
    if (!q) throw new Error("No data from Alpha Vantage");

    return {
      symbol: symbol.toUpperCase(),
      price: parseFloat(q["05. price"]),
      change: parseFloat(q["09. change"]),
      changePercent: parseFloat(q["10. change percent"].replace("%", "")),
      open: parseFloat(q["02. open"]),
      high: parseFloat(q["03. high"]),
      low: parseFloat(q["04. low"]),
      previousClose: parseFloat(q["08. previous close"]),
      volume: parseInt(q["06. volume"]),
      timestamp: Date.now(), // AV quote doesn't have a clear timestamp in Global Quote sometimes
      provider: this.id
    };
  }

  async getHistorical(symbol: string): Promise<MarketCandle[]> {
    const data = await this.fetchWithMetrics<any>(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol.toUpperCase()}&apikey=${this.apiKey}`
    );

    const series = data["Time Series (Daily)"];
    if (!series) return [];

    return Object.entries(series).slice(0, 30).map(([date, vals]: [string, any]) => ({
      date,
      open: parseFloat(vals["1. open"]),
      high: parseFloat(vals["2. high"]),
      low: parseFloat(vals["3. low"]),
      close: parseFloat(vals["4. close"]),
      volume: parseInt(vals["5. volume"]),
      timestamp: new Date(date).getTime()
    }));
  }

  async getIndicators(symbol: string): Promise<MarketIndicators> {
    const rsiData = await this.fetchWithMetrics<any>(
      `https://www.alphavantage.co/query?function=RSI&symbol=${symbol.toUpperCase()}&interval=daily&time_period=14&series_type=close&apikey=${this.apiKey}`
    );

    const rsiValue = rsiData["Technical Analysis: RSI"];
    const latestDate = Object.keys(rsiValue || {})[0];

    return {
      rsi: rsiValue && latestDate ? parseFloat(rsiValue[latestDate].RSI) : undefined,
      timestamp: Date.now()
    };
  }

  getMetrics(): ProviderMetrics { return this.metrics; }
  isHealthy(): boolean { return this.breaker.getState() === "CLOSED"; }
}
