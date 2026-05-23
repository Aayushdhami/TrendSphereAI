/**
 * New Enterprise Data Aggregator
 * Orchestrates MarketService for dashboard data
 */
import type { MarketQuote, MarketIndicators } from "./market";
import { marketService } from "./market";
import type { Stock } from "~src/types";
import { STOCK_DATABASE } from "~src/utils/constants";

export async function initializeAllStocks(symbols: string[]): Promise<Stock[]> {
  const promises = symbols.map(sym => fetchFullStockData(sym));
  return Promise.all(promises);
}
  
function generateMockHistoricalData(currentPrice: number) {
  const data = [];
  let price = currentPrice * 0.4; // Start 60% lower 5 years ago
  const now = Date.now();
  for (let i = 1825; i >= 0; i--) {
    price = price * (1 + (Math.random() * 0.04 - 0.019)); // Random daily movement with slight upward drift
    data.push({
      date: new Date(now - i * 86400000).toISOString().split('T')[0],
      timestamp: now - i * 86400000,
      open: price * (1 - Math.random() * 0.01),
      high: price * (1 + Math.random() * 0.02),
      low: price * (1 - Math.random() * 0.02),
      close: price,
      volume: Math.floor(Math.random() * 5000000) + 1000000
    });
  }
  return data;
}

export async function fetchFullStockData(symbol: string): Promise<Stock> {
  const engine = marketService.engine;
  
  // Parallel fetch for speed
  const [quote, indicators, historicalData] = await Promise.all([
    engine.getQuote(symbol).catch(() => null),
    engine.getIndicators(symbol).catch(() => null),
    engine.getHistorical(symbol, 90).catch(() => null)
  ]);

  const dbInfo = STOCK_DATABASE.find(s => s.symbol === symbol) || { name: symbol, sector: "General" };

  return {
    symbol: symbol.toUpperCase(),
    name: dbInfo.name,
    price: quote?.price || (dbInfo as any).price || 0,
    change: quote?.change || (dbInfo as any).change || 0,
    changePercent: quote?.changePercent || (dbInfo as any).changePercent || 0,
    open: quote?.open || (dbInfo as any).open || 0,
    high: quote?.high || (dbInfo as any).high || 0,
    low: quote?.low || (dbInfo as any).low || 0,
    volume: quote?.volume || (dbInfo as any).volume || 0,
    previousClose: quote?.previousClose || (dbInfo as any).previousClose || 0,
    sector: dbInfo.sector as any,
    marketCap: (dbInfo as any).marketCap || 0,
    pe: (dbInfo as any).pe || 0,
    eps: (dbInfo as any).eps || 0,
    avgVolume: (dbInfo as any).avgVolume || 0,
    week52High: (dbInfo as any).week52High || 0,
    week52Low: (dbInfo as any).week52Low || 0,
    historicalData: historicalData && historicalData.length > 0 ? historicalData.map((d: any) => ({
      date: new Date(d.time * 1000).toISOString().split('T')[0],
      timestamp: d.time * 1000,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume
    })) : generateMockHistoricalData(quote?.price || (dbInfo as any).price || 100),
    indicators: {
      rsi: indicators?.rsi || 50,
      ema20: indicators?.ema50 || 0, // Better mapping
      sma50: indicators?.sma20 || 0, // Better mapping
      volatility: 0
    },
    lastUpdated: Date.now()
  };
}

export async function refreshQuotes(stocks: Stock[]): Promise<Stock[]> {
  const promises = stocks.map(async (s) => {
    try {
      const q = await marketService.engine.getQuote(s.symbol);
      return {
        ...s,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        lastUpdated: Date.now()
      };
    } catch {
      return s;
    }
  });
  return Promise.all(promises);
}

/**
 * Returns health status of all data providers
 */
export function getDataSourceStatus() {
  try {
    return marketService.engine.getHealthStatus();
  } catch {
    return [
      { id: "finnhub", status: "degraded", metrics: { healthScore: 0 } },
      { id: "fmp", status: "degraded", metrics: { healthScore: 0 } },
      { id: "alpha", status: "degraded", metrics: { healthScore: 0 } }
    ];
  }
}
