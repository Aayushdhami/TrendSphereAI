import type { IMarketProvider, MarketQuote, MarketCandle, ProviderMetrics } from "./types";
import { saveToStorage, loadFromStorage } from "../storageService";

export class CacheProvider implements IMarketProvider {
  public id = "cache";
  public priority = 99;
  private metrics: ProviderMetrics = {
    successCount: 0,
    failureCount: 0,
    totalLatency: 0,
    avgLatency: 0,
    rateLimitHits: 0,
    circuitBreakerOpens: 0,
    healthScore: 100
  };

  async getQuote(symbol: string): Promise<MarketQuote> {
    const cached = await storageService.getItem<MarketQuote>(`quote_${symbol.toUpperCase()}`);
    if (cached) {
      this.metrics.successCount++;
      return { ...cached, provider: "cache" };
    }
    this.metrics.failureCount++;
    throw new Error("No cached quote found");
  }

  async getHistorical(symbol: string): Promise<MarketCandle[]> {
    const cached = await storageService.getItem<MarketCandle[]>(`hist_${symbol.toUpperCase()}`);
    if (cached) return cached;
    return [];
  }

  async saveQuote(quote: MarketQuote) {
    await storageService.setItem(`quote_${quote.symbol}`, quote);
  }

  async saveHistorical(symbol: string, candles: MarketCandle[]) {
    await storageService.setItem(`hist_${symbol}`, candles);
  }

  getMetrics(): ProviderMetrics { return this.metrics; }
  isHealthy(): boolean { return true; } // Cache is always healthy
}
