/**
 * Financial Modeling Prep (FMP) Service — Company financials and analysis
 * Free tier: 250 calls/day
 * Docs: https://financialmodelingprep.com/developer/docs
 */
import { API_ENDPOINTS, canMakeRequest, trackRequest, safeFetch } from "./apiConfig"

/** FMP Company profile */
export interface FMPProfile {
  symbol: string
  companyName: string
  currency: string
  exchange: string
  industry: string
  sector: string
  description: string
  ceo: string
  website: string
  image: string
  mktCap: number
  price: number
  changes: number
  beta: number
  volAvg: number
  lastDiv: number
  range: string
  ipoDate: string
  fullTimeEmployees: string
  dcfDiff: number
  dcf: number
}

/** FMP Key metrics */
export interface FMPKeyMetrics {
  symbol: string
  date: string
  peRatio: number
  priceToSalesRatio: number
  pbRatio: number
  enterpriseValue: number
  revenuePerShare: number
  netIncomePerShare: number
  earningsYield: number
  dividendYield: number
  debtToEquity: number
  currentRatio: number
  roe: number
  roic: number
}

/** FMP Stock rating */
export interface FMPRating {
  symbol: string
  date: string
  rating: string
  ratingScore: number
  ratingRecommendation: string
  ratingDetailsDCFScore: number
  ratingDetailsROEScore: number
  ratingDetailsROAScore: number
  ratingDetailsDEScore: number
  ratingDetailsPEScore: number
  ratingDetailsPBScore: number
}

/** Fetch company profile from FMP */
export async function fetchFMPProfile(
  symbol: string,
  apiKey: string
): Promise<FMPProfile | null> {
  if (!apiKey || !canMakeRequest("fmp")) return null
  trackRequest("fmp")

  const data = await safeFetch<FMPProfile[]>(
    `${API_ENDPOINTS.FMP}/profile/${symbol}?apikey=${apiKey}`
  )
  return data?.[0] || null
}

/** Fetch key metrics */
export async function fetchKeyMetrics(
  symbol: string,
  apiKey: string
): Promise<FMPKeyMetrics | null> {
  if (!apiKey || !canMakeRequest("fmp")) return null
  trackRequest("fmp")

  const data = await safeFetch<FMPKeyMetrics[]>(
    `${API_ENDPOINTS.FMP}/key-metrics-ttm/${symbol}?apikey=${apiKey}`
  )
  return data?.[0] || null
}

/** Fetch stock rating/recommendation */
export async function fetchRating(
  symbol: string,
  apiKey: string
): Promise<FMPRating | null> {
  if (!apiKey || !canMakeRequest("fmp")) return null
  trackRequest("fmp")

  const data = await safeFetch<FMPRating[]>(
    `${API_ENDPOINTS.FMP}/rating/${symbol}?apikey=${apiKey}`
  )
  return data?.[0] || null
}

/** Fetch gainers list from FMP */
export async function fetchGainers(
  apiKey: string
): Promise<Array<{ symbol: string; name: string; change: number; price: number; changesPercentage: number }>> {
  if (!apiKey || !canMakeRequest("fmp")) return []
  trackRequest("fmp")

  const data = await safeFetch<any[]>(
    `${API_ENDPOINTS.FMP}/stock_market/gainers?apikey=${apiKey}`
  )
  return (data || []).slice(0, 10)
}

/** Fetch losers list from FMP */
export async function fetchLosers(
  apiKey: string
): Promise<Array<{ symbol: string; name: string; change: number; price: number; changesPercentage: number }>> {
  if (!apiKey || !canMakeRequest("fmp")) return []
  trackRequest("fmp")

  const data = await safeFetch<any[]>(
    `${API_ENDPOINTS.FMP}/stock_market/losers?apikey=${apiKey}`
  )
  return (data || []).slice(0, 10)
}

/** Fetch most active stocks */
export async function fetchMostActive(
  apiKey: string
): Promise<Array<{ symbol: string; name: string; change: number; price: number; changesPercentage: number; volume: number }>> {
  if (!apiKey || !canMakeRequest("fmp")) return []
  trackRequest("fmp")

  const data = await safeFetch<any[]>(
    `${API_ENDPOINTS.FMP}/stock_market/actives?apikey=${apiKey}`
  )
  return (data || []).slice(0, 10)
}

/** Map FMP profile data to our Stock model partial */
export function mapFMPProfile(profile: FMPProfile) {
  return {
    name: profile.companyName,
    sector: profile.sector || profile.industry || "Unknown",
    marketCap: profile.mktCap,
    avgVolume: profile.volAvg,
    week52High: 0,
    week52Low: 0,
    pe: 0,
    eps: 0,
  }
}
