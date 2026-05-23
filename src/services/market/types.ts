/**
 * Institutional-Grade Market Data Engine Types
 */

export type ProviderStatus = "healthy" | "degraded" | "failing" | "circuit-open" | "recovering";

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  timestamp: number;
  provider: string;
}

export interface MarketCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface MarketNews {
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  timestamp: number;
  category: string;
}

export interface MarketIndicators {
  rsi?: number;
  macd?: { value: number; signal: number; histogram: number };
  sma20?: number;
  ema50?: number;
  ema200?: number;
  bollinger?: { upper: number; middle: number; lower: number };
  timestamp: number;
}

export interface ProviderMetrics {
  successCount: number;
  failureCount: number;
  totalLatency: number;
  avgLatency: number;
  lastFailureTime?: number;
  rateLimitHits: number;
  circuitBreakerOpens: number;
  healthScore: number; // 0-100
}

/**
 * Unified Interface for all Market Providers
 */
export interface IMarketProvider {
  id: string;
  priority: number;
  getQuote(symbol: string): Promise<MarketQuote>;
  getHistorical(symbol: string, days?: number): Promise<MarketCandle[]>;
  getIndicators?(symbol: string): Promise<MarketIndicators>;
  getNews?(symbol: string): Promise<MarketNews[]>;
  getMetrics(): ProviderMetrics;
  isHealthy(): boolean;
}
