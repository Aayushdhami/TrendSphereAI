/**
 * API Configuration & Key Management
 * Manages API keys for all data providers with Chrome storage persistence
 */

export interface ApiKeys {
  finnhub: string
  alphaVantage: string
  fmp: string
}

/** Default keys from environment variables */
const DEFAULT_KEYS: ApiKeys = {
  finnhub: process.env.PLASMO_PUBLIC_FINNHUB_API_KEY || "",
  alphaVantage: process.env.PLASMO_PUBLIC_ALPHA_VANTAGE_API_KEY || "",
  fmp: process.env.PLASMO_PUBLIC_FMP_API_KEY || "",
}

/** Base URLs for each provider */
export const API_ENDPOINTS = {
  FINNHUB: "https://finnhub.io/api/v1",
  ALPHA_VANTAGE: "https://www.alphavantage.co/query",
  YAHOO_FINANCE: "https://query1.finance.yahoo.com/v8/finance/chart",
  FMP: "https://financialmodelingprep.com/api/v3",
} as const

/** Rate limit tracking to stay within free tier limits */
interface RateLimitState {
  finnhub: { count: number; resetAt: number }      // 60/min
  alphaVantage: { count: number; resetAt: number }  // 5/min, 25/day
  fmp: { count: number; resetAt: number }           // 250/day
}

let rateLimits: RateLimitState = {
  finnhub: { count: 0, resetAt: Date.now() + 60000 },
  alphaVantage: { count: 0, resetAt: Date.now() + 60000 },
  fmp: { count: 0, resetAt: Date.now() + 86400000 },
}

/** Check if we can make a request to a given provider */
export function canMakeRequest(provider: keyof RateLimitState): boolean {
  const limit = rateLimits[provider]
  if (Date.now() > limit.resetAt) {
    limit.count = 0
    limit.resetAt = Date.now() + (provider === "fmp" ? 86400000 : 60000)
  }
  const maxCalls = provider === "finnhub" ? 55 : provider === "alphaVantage" ? 4 : 240
  return limit.count < maxCalls
}

/** Track a request made to a provider */
export function trackRequest(provider: keyof RateLimitState): void {
  if (Date.now() > rateLimits[provider].resetAt) {
    rateLimits[provider].count = 0
    rateLimits[provider].resetAt = Date.now() +
      (provider === "fmp" ? 86400000 : 60000)
  }
  rateLimits[provider].count++
}

/** Load API keys from Chrome storage or Environment */
export async function loadApiKeys(): Promise<ApiKeys> {
  const envKeys: ApiKeys = {
    finnhub: process.env.PLASMO_PUBLIC_FINNHUB_API_KEY || "",
    alphaVantage: process.env.PLASMO_PUBLIC_ALPHA_VANTAGE_API_KEY || "",
    fmp: process.env.PLASMO_PUBLIC_FMP_API_KEY || "",
  }

  // If environment variables are set, prioritize them
  if (envKeys.finnhub || envKeys.alphaVantage || envKeys.fmp) {
    return {
      finnhub: envKeys.finnhub,
      alphaVantage: envKeys.alphaVantage,
      fmp: envKeys.fmp,
    }
  }

  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const result = await chrome.storage.local.get("stockai_api_keys")
      return result.stockai_api_keys
        ? JSON.parse(result.stockai_api_keys)
        : DEFAULT_KEYS
    }
    const raw = localStorage.getItem("stockai_api_keys")
    return raw ? JSON.parse(raw) : DEFAULT_KEYS
  } catch {
    return DEFAULT_KEYS
  }
}

/** Save API keys to Chrome storage */
export async function saveApiKeys(keys: ApiKeys): Promise<void> {
  try {
    const data = JSON.stringify(keys)
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ stockai_api_keys: data })
    } else {
      localStorage.setItem("stockai_api_keys", data)
    }
  } catch (err) {
    console.warn("Failed to save API keys:", err)
    localStorage.setItem("stockai_api_keys", JSON.stringify(keys))
  }
}

/** Check which APIs are configured */
export function getApiStatus(keys: ApiKeys): Record<string, boolean> {
  return {
    finnhub: keys.finnhub.length > 0,
    alphaVantage: keys.alphaVantage.length > 0,
    yahooFinance: true, // No key required
    fmp: keys.fmp.length > 0,
  }
}

/** Safe fetch wrapper with timeout and error handling */
export async function safeFetch<T>(
  url: string,
  timeoutMs: number = 10000
): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) {
      console.warn(`API request failed: ${response.status} ${url.split("?")[0]}`)
      return null
    }
    return await response.json()
  } catch (err) {
    console.warn(`API request error: ${(err as Error).message}`)
    return null
  }
}
