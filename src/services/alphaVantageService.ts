/**
 * Alpha Vantage Service — Technical indicators (RSI, MACD, SMA, EMA, BBANDS)
 * Free tier: 25 calls/day, 5 calls/min
 * Docs: https://www.alphavantage.co/documentation/
 */
import { API_ENDPOINTS, canMakeRequest, trackRequest, safeFetch } from "./apiConfig"
import type { MACDData, MovingAverages, BollingerBands } from "~src/types"

/** Alpha Vantage technical indicator data point */
interface AVDataPoint {
  [key: string]: string
}

/** Alpha Vantage response wrapper */
interface AVIndicatorResponse {
  "Meta Data": Record<string, string>
  [key: string]: Record<string, AVDataPoint> | Record<string, string>
}

/** Fetch RSI indicator */
export async function fetchRSI(
  symbol: string,
  apiKey: string,
  interval: string = "daily",
  timePeriod: number = 14
): Promise<number | null> {
  if (!apiKey || !canMakeRequest("alphaVantage")) return null
  trackRequest("alphaVantage")

  const url = `${API_ENDPOINTS.ALPHA_VANTAGE}?function=RSI&symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${apiKey}`
  const data = await safeFetch<AVIndicatorResponse>(url)
  if (!data) return null

  const seriesKey = Object.keys(data).find((k) => k.startsWith("Technical"))
  if (!seriesKey) return null

  const series = data[seriesKey] as Record<string, AVDataPoint>
  const dates = Object.keys(series).sort().reverse()
  if (dates.length === 0) return null

  return parseFloat(series[dates[0]]["RSI"])
}

/** Fetch MACD indicator */
export async function fetchMACD(
  symbol: string,
  apiKey: string,
  interval: string = "daily"
): Promise<MACDData | null> {
  if (!apiKey || !canMakeRequest("alphaVantage")) return null
  trackRequest("alphaVantage")

  const url = `${API_ENDPOINTS.ALPHA_VANTAGE}?function=MACD&symbol=${symbol}&interval=${interval}&series_type=close&apikey=${apiKey}`
  const data = await safeFetch<AVIndicatorResponse>(url)
  if (!data) return null

  const seriesKey = Object.keys(data).find((k) => k.startsWith("Technical"))
  if (!seriesKey) return null

  const series = data[seriesKey] as Record<string, AVDataPoint>
  const dates = Object.keys(series).sort().reverse()
  if (dates.length === 0) return null

  const latest = series[dates[0]]
  return {
    value: parseFloat(latest["MACD"] || "0"),
    signal: parseFloat(latest["MACD_Signal"] || "0"),
    histogram: parseFloat(latest["MACD_Hist"] || "0"),
  }
}

/** Fetch SMA for a given time period */
export async function fetchSMA(
  symbol: string,
  apiKey: string,
  timePeriod: number,
  interval: string = "daily"
): Promise<number | null> {
  if (!apiKey || !canMakeRequest("alphaVantage")) return null
  trackRequest("alphaVantage")

  const url = `${API_ENDPOINTS.ALPHA_VANTAGE}?function=SMA&symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${apiKey}`
  const data = await safeFetch<AVIndicatorResponse>(url)
  if (!data) return null

  const seriesKey = Object.keys(data).find((k) => k.startsWith("Technical"))
  if (!seriesKey) return null

  const series = data[seriesKey] as Record<string, AVDataPoint>
  const dates = Object.keys(series).sort().reverse()
  if (dates.length === 0) return null

  return parseFloat(series[dates[0]]["SMA"])
}

/** Fetch EMA for a given time period */
export async function fetchEMA(
  symbol: string,
  apiKey: string,
  timePeriod: number,
  interval: string = "daily"
): Promise<number | null> {
  if (!apiKey || !canMakeRequest("alphaVantage")) return null
  trackRequest("alphaVantage")

  const url = `${API_ENDPOINTS.ALPHA_VANTAGE}?function=EMA&symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${apiKey}`
  const data = await safeFetch<AVIndicatorResponse>(url)
  if (!data) return null

  const seriesKey = Object.keys(data).find((k) => k.startsWith("Technical"))
  if (!seriesKey) return null

  const series = data[seriesKey] as Record<string, AVDataPoint>
  const dates = Object.keys(series).sort().reverse()
  if (dates.length === 0) return null

  return parseFloat(series[dates[0]]["EMA"])
}

/** Fetch Bollinger Bands */
export async function fetchBBands(
  symbol: string,
  apiKey: string,
  interval: string = "daily"
): Promise<BollingerBands | null> {
  if (!apiKey || !canMakeRequest("alphaVantage")) return null
  trackRequest("alphaVantage")

  const url = `${API_ENDPOINTS.ALPHA_VANTAGE}?function=BBANDS&symbol=${symbol}&interval=${interval}&time_period=20&series_type=close&apikey=${apiKey}`
  const data = await safeFetch<AVIndicatorResponse>(url)
  if (!data) return null

  const seriesKey = Object.keys(data).find((k) => k.startsWith("Technical"))
  if (!seriesKey) return null

  const series = data[seriesKey] as Record<string, AVDataPoint>
  const dates = Object.keys(series).sort().reverse()
  if (dates.length === 0) return null

  const latest = series[dates[0]]
  return {
    upper: parseFloat(latest["Real Upper Band"] || "0"),
    middle: parseFloat(latest["Real Middle Band"] || "0"),
    lower: parseFloat(latest["Real Lower Band"] || "0"),
  }
}

/** Fetch all available technical indicators for a symbol (batched) */
export async function fetchAllIndicators(
  symbol: string,
  apiKey: string
): Promise<{
  rsi: number | null
  macd: MACDData | null
  bollingerBands: BollingerBands | null
}> {
  // Fetch RSI and MACD in parallel (careful with rate limits)
  const [rsi, macd] = await Promise.all([
    fetchRSI(symbol, apiKey),
    fetchMACD(symbol, apiKey),
  ])

  // Bollinger Bands separately (rate limit)
  await new Promise((r) => setTimeout(r, 1200))
  const bollingerBands = await fetchBBands(symbol, apiKey)

  return { rsi, macd, bollingerBands }
}
