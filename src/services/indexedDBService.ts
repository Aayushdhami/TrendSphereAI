/**
 * IndexedDB Service — Offline-first persistence layer
 * Uses idb-keyval for simple key-value storage backed by IndexedDB
 * Handles: portfolio, alerts, chat history, stock cache, settings
 */
import { get, set, del, keys, clear, createStore } from "idb-keyval"
import type { 
  PortfolioPosition, PortfolioTransaction, Alert, 
  AIChatMessage, Stock, UserSettings 
} from "~src/types"

// ==================== STORES ====================

const portfolioStore = createStore("stockai-portfolio", "positions")
const transactionStore = createStore("stockai-transactions", "transactions")
const alertStore = createStore("stockai-alerts", "alerts")
const chatStore = createStore("stockai-chat", "history")
const cacheStore = createStore("stockai-cache", "stockData")
const settingsStore = createStore("stockai-settings", "userSettings")

// ==================== PORTFOLIO ====================

export async function savePortfolioPosition(position: PortfolioPosition): Promise<void> {
  await set(position.id, position, portfolioStore)
}

export async function getPortfolioPosition(id: string): Promise<PortfolioPosition | undefined> {
  return await get(id, portfolioStore)
}

export async function getAllPortfolioPositions(): Promise<PortfolioPosition[]> {
  const allKeys = await keys(portfolioStore)
  const positions: PortfolioPosition[] = []
  for (const key of allKeys) {
    const pos = await get<PortfolioPosition>(key, portfolioStore)
    if (pos) positions.push(pos)
  }
  return positions
}

export async function deletePortfolioPosition(id: string): Promise<void> {
  await del(id, portfolioStore)
}

export async function clearPortfolio(): Promise<void> {
  await clear(portfolioStore)
}

// ==================== TRANSACTIONS ====================

export async function saveTransaction(transaction: PortfolioTransaction): Promise<void> {
  await set(transaction.id, transaction, transactionStore)
}

export async function getAllTransactions(): Promise<PortfolioTransaction[]> {
  const allKeys = await keys(transactionStore)
  const transactions: PortfolioTransaction[] = []
  for (const key of allKeys) {
    const tx = await get<PortfolioTransaction>(key, transactionStore)
    if (tx) transactions.push(tx)
  }
  return transactions.sort((a, b) => b.date - a.date)
}

export async function getTransactionsBySymbol(symbol: string): Promise<PortfolioTransaction[]> {
  const all = await getAllTransactions()
  return all.filter(tx => tx.symbol === symbol)
}

export async function deleteTransaction(id: string): Promise<void> {
  await del(id, transactionStore)
}

// ==================== ALERTS ====================

export async function saveAlert(alert: Alert): Promise<void> {
  await set(alert.id, alert, alertStore)
}

export async function getAllAlerts(): Promise<Alert[]> {
  const allKeys = await keys(alertStore)
  const alerts: Alert[] = []
  for (const key of allKeys) {
    const alert = await get<Alert>(key, alertStore)
    if (alert) alerts.push(alert)
  }
  return alerts.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteAlert(id: string): Promise<void> {
  await del(id, alertStore)
}

export async function clearAlerts(): Promise<void> {
  await clear(alertStore)
}

// ==================== CHAT HISTORY ====================

export async function saveChatSession(sessionId: string, messages: AIChatMessage[]): Promise<void> {
  await set(sessionId, {
    id: sessionId,
    messages,
    updatedAt: Date.now(),
  }, chatStore)
}

export async function getChatSession(sessionId: string): Promise<AIChatMessage[]> {
  const session = await get<{ messages: AIChatMessage[] }>(sessionId, chatStore)
  return session?.messages || []
}

export async function getAllChatSessions(): Promise<{ id: string; messages: AIChatMessage[]; updatedAt: number }[]> {
  const allKeys = await keys(chatStore)
  const sessions: any[] = []
  for (const key of allKeys) {
    const session = await get(key, chatStore)
    if (session) sessions.push(session)
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await del(sessionId, chatStore)
}

export async function clearChatHistory(): Promise<void> {
  await clear(chatStore)
}

// ==================== STOCK CACHE ====================

export async function cacheStockData(symbol: string, stock: Stock): Promise<void> {
  await set(symbol, { data: stock, cachedAt: Date.now() }, cacheStore)
}

export async function getCachedStock(symbol: string, maxAgeMs: number = 300000): Promise<Stock | null> {
  const entry = await get<{ data: Stock; cachedAt: number }>(symbol, cacheStore)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > maxAgeMs) return null
  return entry.data
}

export async function cacheMultipleStocks(stocks: Stock[]): Promise<void> {
  for (const stock of stocks) {
    await cacheStockData(stock.symbol, stock)
  }
}

export async function getAllCachedStocks(): Promise<Stock[]> {
  const allKeys = await keys(cacheStore)
  const stocks: Stock[] = []
  for (const key of allKeys) {
    const entry = await get<{ data: Stock; cachedAt: number }>(key, cacheStore)
    if (entry?.data) stocks.push(entry.data)
  }
  return stocks
}

export async function clearStockCache(): Promise<void> {
  await clear(cacheStore)
}

// ==================== USER SETTINGS ====================

export async function saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const existing = await getUserSettings()
  await set("user_settings", { ...existing, ...settings, updatedAt: Date.now() }, settingsStore)
}

export async function getUserSettings(): Promise<UserSettings | null> {
  return await get("user_settings", settingsStore) || null
}

// ==================== DATA MANAGEMENT ====================

/** Get total IndexedDB storage usage estimate */
export async function getStorageEstimate(): Promise<{ used: number; quota: number; usedMB: string; quotaMB: string }> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate()
    return {
      used: est.usage || 0,
      quota: est.quota || 0,
      usedMB: ((est.usage || 0) / (1024 * 1024)).toFixed(2),
      quotaMB: ((est.quota || 0) / (1024 * 1024)).toFixed(2),
    }
  }
  return { used: 0, quota: 0, usedMB: "0", quotaMB: "0" }
}

/** Clear all IndexedDB stores */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    clear(portfolioStore),
    clear(transactionStore),
    clear(alertStore),
    clear(chatStore),
    clear(cacheStore),
  ])
}

/** Export all data as JSON for backup */
export async function exportAllData(): Promise<string> {
  const data = {
    exportedAt: new Date().toISOString(),
    portfolio: await getAllPortfolioPositions(),
    transactions: await getAllTransactions(),
    alerts: await getAllAlerts(),
    settings: await getUserSettings(),
  }
  return JSON.stringify(data, null, 2)
}

/** Import data from JSON backup */
export async function importData(jsonString: string): Promise<{ imported: number }> {
  const data = JSON.parse(jsonString)
  let count = 0

  if (data.portfolio) {
    for (const pos of data.portfolio) {
      await savePortfolioPosition(pos)
      count++
    }
  }

  if (data.transactions) {
    for (const tx of data.transactions) {
      await saveTransaction(tx)
      count++
    }
  }

  if (data.alerts) {
    for (const alert of data.alerts) {
      await saveAlert(alert)
      count++
    }
  }

  if (data.settings) {
    await saveUserSettings(data.settings)
    count++
  }

  return { imported: count }
}
