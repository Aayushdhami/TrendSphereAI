/**
 * Core TypeScript interfaces for StockAI extension
 * Enhanced with Portfolio, AI Chat, Advanced Alerts, and IndexedDB schemas
 */

// ==================== STOCK DATA ====================

export interface HistoricalDataPoint {
  date: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Stock {
  symbol: string
  name: string
  sector: string
  price: number
  previousClose: number
  open: number
  high: number
  low: number
  change: number
  changePercent: number
  volume: number
  avgVolume: number
  marketCap: number
  pe: number
  eps: number
  week52High: number
  week52Low: number
  historicalData: HistoricalDataPoint[]
  indicators?: {
    rsi: number
    ema20: number
    sma50: number
    volatility: number
    macd?: MACDData
  }
  lastUpdated: number
}

export interface WatchlistStock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  isPinned: boolean
  addedAt: number
  alertCount: number
}

// ==================== TECHNICAL INDICATORS ====================

export interface MACDData {
  value: number
  signal: number
  histogram: number
}

export interface MovingAverages {
  sma20: number
  sma50: number
  sma200: number
  ema12: number
  ema26: number
}

export interface BollingerBands {
  upper: number
  middle: number
  lower: number
}

export type TrendDirection = "bullish" | "bearish" | "neutral"
export type RiskLevel = "low" | "medium" | "high" | "very-high"
export type Recommendation = "strong-buy" | "buy" | "hold" | "sell" | "strong-sell"

export interface Prediction {
  symbol: string
  upProbability: number
  downProbability: number
  trendDirection: TrendDirection
  riskLevel: RiskLevel
  momentumScore: number
  volumeStrength: number
  recommendation: Recommendation
  confidenceScore: number
  rsi: number
  macd: MACDData
  movingAverages: MovingAverages
  bollingerBands: BollingerBands
  supportLevel: number
  resistanceLevel: number
  volatilityIndex: number
  updatedAt: number
}

// ==================== ALERTS ====================

export type AlertType =
  | "price-above"
  | "price-below"
  | "percent-increase"
  | "percent-decrease"
  | "high-volatility"
  | "rsi-overbought"
  | "rsi-oversold"
  | "volume-spike"
  | "trend-reversal"
  | "ai-prediction"

export interface Alert {
  id: string
  symbol: string
  type: AlertType
  targetValue: number
  isActive: boolean
  createdAt: number
  triggeredAt?: number
  cooldownMinutes?: number
  lastTriggeredAt?: number
  priority?: "low" | "medium" | "high" | "critical"
  note?: string
}

export type NotificationType = "alert" | "prediction" | "system" | "market" | "ai" | "portfolio"

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: number
  read: boolean
  symbol?: string
  actionUrl?: string
}

// ==================== PORTFOLIO ====================

export interface PortfolioPosition {
  id: string
  symbol: string
  name: string
  sector: string
  quantity: number
  avgBuyPrice: number
  currentPrice: number
  totalInvested: number
  currentValue: number
  profitLoss: number
  profitLossPercent: number
  addedAt: number
  lastUpdated: number
  notes?: string
  assetType: "stock" | "crypto" | "etf" | "forex"
}

export interface PortfolioSummary {
  totalInvested: number
  currentValue: number
  totalProfitLoss: number
  totalProfitLossPercent: number
  dayChange: number
  dayChangePercent: number
  positionCount: number
  topGainer: string
  topLoser: string
  sharpeRatio: number
  portfolioBeta: number
  maxDrawdown: number
  diversificationScore: number
}

export interface PortfolioTransaction {
  id: string
  positionId: string
  symbol: string
  type: "buy" | "sell"
  quantity: number
  price: number
  total: number
  date: number
  note?: string
}

// ==================== AI CHATBOT ====================

export interface AIChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  isLoading?: boolean
  metadata?: {
    model?: string
    tokensUsed?: number
    analysisType?: string
    symbols?: string[]
  }
}

export interface AIAnalysisRequest {
  type: "stock-analysis" | "portfolio-review" | "market-summary" | "prediction" | "screener" | "general"
  symbols?: string[]
  context?: string
  historicalData?: HistoricalDataPoint[]
  predictions?: Prediction[]
  portfolio?: PortfolioPosition[]
}

export interface GeminiConfig {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

// ==================== SETTINGS ====================

export interface AlertPreferences {
  enableBrowserNotifications: boolean
  enableSoundAlerts: boolean
  enableEmailSimulation: boolean
  cooldownMinutes: number
  alertBatchingEnabled: boolean
  maxAlertsPerHour: number
}

export interface DashboardPreferences {
  showMarketOverview: boolean
  showPredictions: boolean
  showWatchlist: boolean
  showCharts: boolean
  defaultChartType: "candlestick" | "line" | "area"
  updateInterval: number
}

export interface UserSettings {
  favoriteStocks: string[]
  alertPreferences: AlertPreferences
  dashboardPreferences: DashboardPreferences
  email: string
  theme: "dark" | "light"
  onboardingCompleted: boolean
  installedAt: number
  localCurrency?: string
  exchangeRates?: Record<string, number>
  groqApiKey?: string
  enableAIChatbot?: boolean
  enableVoiceAssistant?: boolean
  enableKeyboardShortcuts?: boolean
}

// ==================== ENUMS & UTILITY TYPES ====================

export type WatchlistSortBy = "name" | "price" | "change" | "volatility" | "alerts" | "pinned"
export type TimeRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL"
export type MarketStatus = "open" | "closed" | "pre-market" | "after-hours"
export type MarketCategory = "trending" | "gainers" | "losers" | "volatile" | "most-monitored"

// ==================== INDEXEDDB SCHEMAS ====================

export interface IDBStockCache {
  symbol: string
  data: Stock
  cachedAt: number
}

export interface IDBPortfolioRecord {
  id: string
  position: PortfolioPosition
  updatedAt: number
}

export interface IDBAlertRecord {
  id: string
  alert: Alert
  updatedAt: number
}

export interface IDBChatHistory {
  id: string
  messages: AIChatMessage[]
  sessionStart: number
  sessionEnd: number
}
