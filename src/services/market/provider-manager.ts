import type { IMarketProvider, MarketQuote, MarketCandle, MarketIndicators, MarketNews } from "./types";
import { FinnhubProvider } from "./finnhub-provider";
import { FMPProvider } from "./fmp-provider";
import { AlphaVantageProvider } from "./alpha-provider";
import { CacheProvider } from "./cache-provider";

export class ProviderManager {
  private providers: IMarketProvider[] = [];
  private cache: CacheProvider;
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(keys: { finnhub: string; fmp: string; alpha: string }) {
    this.cache = new CacheProvider();
    
    if (keys.finnhub) this.providers.push(new FinnhubProvider(keys.finnhub));
    if (keys.fmp) this.providers.push(new FMPProvider(keys.fmp));
    if (keys.alpha) this.providers.push(new AlphaVantageProvider(keys.alpha));
    
    // Sort by priority initially
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Request Deduplication & Failover Wrapper
   */
  private async executeWithFailover<T>(
    key: string,
    operation: (provider: IMarketProvider) => Promise<T>,
    onSuccess?: (data: T) => void
  ): Promise<T> {
    // 1. Check for pending identical request (Deduplication)
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = (async () => {
      // 2. Dynamic Provider Steering (Sort by health score & latency)
      const rankedProviders = [...this.providers].sort((a, b) => {
        const scoreA = a.getMetrics().healthScore - (a.getMetrics().avgLatency / 100);
        const scoreB = b.getMetrics().healthScore - (b.getMetrics().avgLatency / 100);
        return scoreB - scoreA;
      });

      // 3. Sequential Failover
      for (const provider of rankedProviders) {
        if (!provider.isHealthy()) continue;

        try {
          const data = await operation(provider);
          if (onSuccess) onSuccess(data);
          return data;
        } catch (err) {
          console.warn(`Provider ${provider.id} failed:`, err);
          continue; // Try next provider
        }
      }

      // 4. Final Fallback to Cache
      try {
        return await operation(this.cache);
      } catch (err) {
        throw new Error("All market data providers failed and no cache available.");
      }
    })();

    this.pendingRequests.set(key, promise);
    try {
      return await promise;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    return this.executeWithFailover(
      `quote_${symbol}`,
      (p) => p.getQuote(symbol),
      (data) => this.cache.saveQuote(data)
    );
  }

  async getHistorical(symbol: string, days: number = 30): Promise<MarketCandle[]> {
    return this.executeWithFailover(
      `hist_${symbol}`,
      (p) => p.getHistorical(symbol, days),
      (data) => this.cache.saveHistorical(symbol, data)
    );
  }

  async getIndicators(symbol: string): Promise<MarketIndicators> {
    return this.executeWithFailover(
      `ind_${symbol}`,
      async (p) => {
        if (p.getIndicators) return p.getIndicators(symbol);
        throw new Error("Provider does not support indicators");
      }
    );
  }

  async getNews(symbol: string): Promise<MarketNews[]> {
    return this.executeWithFailover(
      `news_${symbol}`,
      async (p) => {
        if (p.getNews) return p.getNews(symbol);
        throw new Error("Provider does not support news");
      }
    );
  }

  getHealthStatus() {
    return this.providers.map(p => ({
      id: p.id,
      status: p.isHealthy() ? "healthy" : "failing",
      metrics: p.getMetrics()
    }));
  }
}
