/**
 * Finnhub Service — Real-time stock quotes and market data
 * Free tier: 60 calls/min
 * Docs: https://finnhub.io/docs/api
 */
import { API_ENDPOINTS, canMakeRequest, trackRequest, safeFetch } from "./apiConfig"

/** Finnhub quote response shape */
interface FinnhubQuote {
  c: number   // Current price
  d: number   // Change
  dp: number  // Percent change
  h: number   // High of the day
  l: number   // Low of the day
  o: number   // Open price
  pc: number  // Previous close
  t: number   // Timestamp
}

/** Finnhub company profile response */
interface FinnhubProfile {
  country: string
  currency: string
  exchange: string
  ipo: string
  marketCapitalization: number
  name: string
  phone: string
  shareOutstanding: number
  ticker: string
  weburl: string
  logo: string
  finnhubIndustry: string
}

/** Finnhub market news item */
interface FinnhubNews {
  category: string
  datetime: number
  headline: string
  id: number
  image: string
  related: string
  source: string
  summary: string
  url: string
}

/** Fetch real-time quote for a single stock */
export async function fetchQuote(
  symbol: string,
  apiKey: string
): Promise<FinnhubQuote | null> {
  if (!apiKey || !canMakeRequest("finnhub")) return null
  trackRequest("finnhub")
  return safeFetch<FinnhubQuote>(
    `${API_ENDPOINTS.FINNHUB}/quote?symbol=${symbol}&token=${apiKey}`
  )
}

/** Fetch quotes for multiple symbols (batched with small delays) */
export async function fetchMultipleQuotes(
  symbols: string[],
  apiKey: string
): Promise<Map<string, FinnhubQuote>> {
  const results = new Map<string, FinnhubQuote>()
  if (!apiKey) return results

  // Process in batches of 10 with 200ms delay between batches
  for (let i = 0; i < symbols.length; i += 10) {
    const batch = symbols.slice(i, i + 10)
    const promises = batch.map(async (symbol) => {
      const quote = await fetchQuote(symbol, apiKey)
      if (quote && quote.c > 0) results.set(symbol, quote)
    })
    await Promise.allSettled(promises)
    if (i + 10 < symbols.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  return results
}

/** Fetch company profile */
export async function fetchCompanyProfile(
  symbol: string,
  apiKey: string
): Promise<FinnhubProfile | null> {
  if (!apiKey || !canMakeRequest("finnhub")) return null
  trackRequest("finnhub")
  return safeFetch<FinnhubProfile>(
    `${API_ENDPOINTS.FINNHUB}/stock/profile2?symbol=${symbol}&token=${apiKey}`
  )
}

/** Fetch market news */
export async function fetchMarketNews(
  apiKey: string,
  category: string = "general"
): Promise<FinnhubNews[]> {
  if (!apiKey || !canMakeRequest("finnhub")) return []
  trackRequest("finnhub")
  const result = await safeFetch<FinnhubNews[]>(
    `${API_ENDPOINTS.FINNHUB}/news?category=${category}&token=${apiKey}`
  )
  return result || []
}

/** Search for symbols by query string */
export async function searchSymbols(
  query: string,
  apiKey: string
): Promise<{ symbol: string; displaySymbol: string; description: string; type: string }[]> {
  if (!apiKey || !query || !canMakeRequest("finnhub")) return []
  trackRequest("finnhub")
  const result = await safeFetch<{ count: number; result: any[] }>(
    `${API_ENDPOINTS.FINNHUB}/search?q=${query}&token=${apiKey}`
  )
  return result?.result || []
}

/** Map Finnhub quote to our Stock model partial */
export function mapFinnhubQuote(symbol: string, quote: FinnhubQuote) {
  return {
    price: quote.c,
    previousClose: quote.pc,
    open: quote.o,
    high: quote.h,
    low: quote.l,
    change: quote.d || 0,
    changePercent: quote.dp || 0,
    lastUpdated: Date.now(),
  }
}

export type { FinnhubQuote, FinnhubProfile, FinnhubNews }
