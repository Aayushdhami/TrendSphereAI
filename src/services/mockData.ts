/**
 * Mock data generation service
 * Generates realistic historical stock data and simulated market feeds
 */
import type { HistoricalDataPoint, Stock } from "~src/types"
import { STOCK_DATABASE } from "~src/utils/constants"
import { randomInRange } from "~src/utils/helpers"

/** Generate historical OHLCV data for a stock */
export function generateHistoricalData(
  basePrice: number,
  days: number = 365
): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = []
  let price = basePrice * (1 - randomInRange(0.05, 0.25))
  const now = Date.now()

  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 86400000)
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue

    const volatility = randomInRange(0.008, 0.035)
    const trend = randomInRange(-0.002, 0.003)
    const change = price * (trend + randomInRange(-volatility, volatility))
    price = Math.max(price + change, 1)

    // Calculate open and close first
    const open = price + randomInRange(-price * 0.01, price * 0.01)
    
    // Ensure day high and low bounds are mathematically valid
    const dayHigh = Math.max(open, price) * (1 + randomInRange(0.001, 0.015))
    let dayLow = Math.min(open, price) * (1 - randomInRange(0.001, 0.015))
    // Prevent zero or negative prices
    dayLow = Math.max(dayLow, 0.01)

    const volume = Math.floor(randomInRange(5000000, 80000000))

    data.push({
      date: date.toISOString().split("T")[0],
      timestamp: date.getTime(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(dayHigh.toFixed(2)),
      low: parseFloat(dayLow.toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      volume,
    })
  }

  // Adjust last entry to match current price
  if (data.length > 0) {
    const last = data[data.length - 1]
    const stockEntry = STOCK_DATABASE.find((s) => Math.abs(s.price - basePrice) < basePrice * 0.3)
    if (stockEntry) {
      last.close = stockEntry.price
      last.high = Math.max(last.high, stockEntry.price)
      last.low = Math.min(last.low, stockEntry.price)
    }
  }

  return data
}

/** Initialize all stocks with generated historical data */
export function initializeStocks(): Stock[] {
  return STOCK_DATABASE.map((stockDef) => ({
    ...stockDef,
    historicalData: generateHistoricalData(stockDef.price),
    lastUpdated: Date.now(),
  }))
}

/** Simulate a price tick for a single stock */
export function simulatePriceTick(stock: Stock): Stock {
  const volatility = getVolatilityFactor(stock.symbol)
  const maxChange = stock.price * volatility
  const change = randomInRange(-maxChange, maxChange)
  const newPrice = parseFloat(Math.max(stock.price + change, 0.01).toFixed(2))
  const totalChange = parseFloat((newPrice - stock.previousClose).toFixed(2))
  const totalChangePercent = parseFloat(
    ((totalChange / stock.previousClose) * 100).toFixed(2)
  )

  const newHigh = Math.max(stock.high, newPrice)
  const newLow = Math.min(stock.low, newPrice)
  const volumeChange = Math.floor(randomInRange(-50000, 150000))

  return {
    ...stock,
    price: newPrice,
    change: totalChange,
    changePercent: totalChangePercent,
    high: parseFloat(newHigh.toFixed(2)),
    low: parseFloat(newLow.toFixed(2)),
    volume: Math.max(0, stock.volume + volumeChange),
    lastUpdated: Date.now(),
  }
}

/** Get volatility factor per stock (some stocks are more volatile) */
function getVolatilityFactor(symbol: string): number {
  const highVolatility = ["TSLA", "NVDA", "COIN", "AMD", "SQ"]
  const mediumVolatility = ["META", "NFLX", "BA", "PYPL", "AMZN"]
  if (highVolatility.includes(symbol)) return 0.003
  if (mediumVolatility.includes(symbol)) return 0.002
  return 0.001
}

/** Simulate intraday data (1-minute candles for today) */
export function generateIntradayData(
  currentPrice: number,
  hours: number = 7
): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = []
  const now = Date.now()
  const startTime = now - hours * 3600000
  let price = currentPrice * (1 + randomInRange(-0.02, 0.02))

  for (let t = startTime; t <= now; t += 60000) {
    const volatility = 0.001
    const change = price * randomInRange(-volatility, volatility)
    price = Math.max(price + change, 0.01)
    const high = price * (1 + randomInRange(0, 0.003))
    const low = price * (1 - randomInRange(0, 0.003))
    const open = price + randomInRange(-price * 0.002, price * 0.002)

    data.push({
      date: new Date(t).toISOString(),
      timestamp: t,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      volume: Math.floor(randomInRange(10000, 500000)),
    })
  }

  return data
}
