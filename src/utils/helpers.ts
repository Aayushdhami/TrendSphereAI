/**
 * Utility helper functions used across the extension
 */

import { useSettingsStore } from "~src/store/settingsStore"

/** Format a number as currency, converting dynamically based on detected country currency */
export function formatCurrency(value: number): string {
  try {
    const state = useSettingsStore.getState()
    const currency = state?.localCurrency || "USD"
    const rate = state?.exchangeRates?.[currency] || 1
    
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value * rate)
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }
}

/** Get currency symbol based on current settings */
export function getCurrencySymbol(): string {
  try {
    const state = useSettingsStore.getState()
    const currency = state?.localCurrency || "USD"
    return (0).toLocaleString(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).replace(/\d/g, "").trim()
  } catch {
    return "$"
  }
}

/** Format simple prices for charts with 0 decimals */
export function formatChartPrice(value: number): string {
  try {
    const state = useSettingsStore.getState()
    const currency = state?.localCurrency || "USD"
    const rate = state?.exchangeRates?.[currency] || 1
    
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value * rate)
  } catch {
    return `$${value.toFixed(0)}`
  }
}

/** Format large numbers with abbreviations (1.2B, 34.5M) */
export function formatLargeNumber(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return value.toFixed(2)
}

/** Format percentage with sign */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

/** Format change with sign */
export function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}`
}

/** Get color class based on value (green for positive, red for negative) */
export function getChangeColor(value: number): string {
  if (value > 0) return "text-gain"
  if (value < 0) return "text-loss"
  return "text-surface-400"
}

/** Get background color class based on value */
export function getChangeBgColor(value: number): string {
  if (value > 0) return "bg-gain-muted"
  if (value < 0) return "bg-loss-muted"
  return "bg-surface-700/50"
}

/** Generate a unique ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Format a timestamp to readable date/time */
export function formatTimestamp(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts))
}

/** Format relative time (e.g., "5m ago", "2h ago") */
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Debounce function */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/** Linear interpolation */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/** Random number in range */
export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/** Calculate Simple Moving Average */
export function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0
  const slice = data.slice(-period)
  return slice.reduce((sum, v) => sum + v, 0) / period
}

/** Calculate Exponential Moving Average */
export function calculateEMA(data: number[], period: number): number {
  if (data.length === 0) return 0
  const multiplier = 2 / (period + 1)
  let ema = data[0]
  for (let i = 1; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema
  }
  return ema
}

/** Calculate RSI (Relative Strength Index) */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50
  let gains = 0
  let losses = 0
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff >= 0) gains += diff
    else losses += Math.abs(diff)
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}
