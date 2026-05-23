/**
 * Yahoo Finance Service — Historical chart data (no API key required)
 * Uses the unofficial Yahoo Finance v8 chart endpoint
 * Works from Chrome extensions due to host_permissions
 */
import { safeFetch } from "./apiConfig"
import type { HistoricalDataPoint } from "~src/types"

/** Yahoo Finance chart response shape */
interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        currency: string
        symbol: string
        regularMarketPrice: number
        previousClose: number
        regularMarketVolume: number
        fiftyTwoWeekHigh: number
        fiftyTwoWeekLow: number
      }
      timestamp: number[]
      indicators: {
        quote: Array<{
          open: number[]
          high: number[]
          low: number[]
          close: number[]
          volume: number[]
        }>
      }
    }>
    error: null | { code: string; description: string }
  }
}

/** Time range to Yahoo Finance range parameter mapping */
const RANGE_MAP: Record<string, string> = {
  "1D": "1d",
  "1W": "5d",
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  "ALL": "5y",
}

/** Time range to interval mapping */
const INTERVAL_MAP: Record<string, string> = {
  "1D": "5m",
  "1W": "15m",
  "1M": "1d",
  "3M": "1d",
  "6M": "1d",
  "1Y": "1wk",
  "ALL": "1wk",
}

/** Fetch historical chart data from Yahoo Finance */
export async function fetchHistoricalData(
  symbol: string,
  range: string = "1Y"
): Promise<HistoricalDataPoint[]> {
  const yahooRange = RANGE_MAP[range] || "1y"
  const interval = INTERVAL_MAP[range] || "1d"

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${yahooRange}&interval=${interval}&includePrePost=false`

  const data = await safeFetch<YahooChartResponse>(url, 5000)
  if (!data?.chart?.result?.[0]) return []

  const result = data.chart.result[0]
  const { timestamp, indicators } = result
  const quote = indicators.quote[0]

  if (!timestamp || !quote) return []

  const points: HistoricalDataPoint[] = []
  for (let i = 0; i < timestamp.length; i++) {
    // Skip null values (market holidays, etc.)
    if (
      quote.open[i] == null ||
      quote.high[i] == null ||
      quote.low[i] == null ||
      quote.close[i] == null
    ) continue

    points.push({
      date: new Date(timestamp[i] * 1000).toISOString().split("T")[0],
      timestamp: timestamp[i] * 1000,
      open: parseFloat(quote.open[i].toFixed(2)),
      high: parseFloat(quote.high[i].toFixed(2)),
      low: parseFloat(quote.low[i].toFixed(2)),
      close: parseFloat(quote.close[i].toFixed(2)),
      volume: quote.volume[i] || 0,
    })
  }

  return points
}

/** Fetch stock metadata from Yahoo Finance chart endpoint */
export async function fetchYahooMeta(symbol: string): Promise<{
  price: number
  previousClose: number
  volume: number
  week52High: number
  week52Low: number
} | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`
  const data = await safeFetch<YahooChartResponse>(url, 10000)

  if (!data?.chart?.result?.[0]?.meta) return null

  const meta = data.chart.result[0].meta
  return {
    price: meta.regularMarketPrice,
    previousClose: meta.previousClose,
    volume: meta.regularMarketVolume,
    week52High: meta.fiftyTwoWeekHigh,
    week52Low: meta.fiftyTwoWeekLow,
  }
}

/** Fetch intraday data (5-minute candles for today) */
export async function fetchIntradayData(
  symbol: string
): Promise<HistoricalDataPoint[]> {
  return fetchHistoricalData(symbol, "1D")
}
