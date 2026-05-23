/**
 * Market Intelligence System — Core background engine
 * Orchestrates API aggregation, AI analysis, and alert evaluation
 */
import { initializeAllStocks, refreshQuotes } from "./dataAggregator"
import { loadApiKeys } from "./apiConfig"
import { useStockStore } from "~src/store/stockStore"
import { useAlertStore } from "~src/store/alertStore"
import { usePortfolioStore } from "~src/store/portfolioStore"
import { checkAlerts, sendBrowserNotification, playAlertSound } from "./alertService"
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from "./storageService"
import { generateMarketSummary } from "./geminiService"
import type { Stock, Prediction, Alert } from "~src/types"

export const marketIntelligence = {
  isScanning: false,

  /** Start the system and perform initial scan */
  async startSystem() {
    console.log("Initializing Market Intelligence System...")
    const keys = await loadApiKeys()
    if (!keys.finnhub) {
      console.warn("Finnhub API key missing. Background scans will be limited.")
    }
  },

  /** Perform a full background intelligence scan */
  async performBackgroundScan() {
    if (this.isScanning) return
    this.isScanning = true

    try {
      // 1. Get symbols from watchlist and portfolio
      const watchlist = await loadFromStorage<string[]>(STORAGE_KEYS.WATCHLIST) || []
      const portfolio = await loadFromStorage<any[]>(STORAGE_KEYS.CACHED_PORTFOLIO) || []
      const symbols = Array.from(new Set([...watchlist, ...portfolio.map(p => p.symbol)]))
      
      if (symbols.length === 0) {
        this.isScanning = false
        return
      }

      // 2. Fetch fresh market data
      const stocks = await initializeAllStocks(symbols)
      
      // 3. Evaluate Alerts
      const alertsJson = await loadFromStorage<string>(STORAGE_KEYS.ALERTS) || "[]"
      const alerts: Alert[] = JSON.parse(alertsJson)
      const activeAlerts = alerts.filter(a => a.isActive)

      if (activeAlerts.length > 0) {
        const { triggered, notifications } = checkAlerts(activeAlerts, stocks)
        
        // Handle triggered alerts
        if (notifications.length > 0) {
          notifications.forEach(n => {
            sendBrowserNotification(n.title, n.message)
          })
          
          // Update alert statuses in storage
          const updatedAlerts = alerts.map(a => {
            const isTriggered = triggered.find(t => t.id === a.id)
            if (isTriggered) return { ...a, isActive: false, triggeredAt: Date.now() }
            return a
          })
          await saveToStorage(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts))
        }
      }

      // 4. Update Cache
      await saveToStorage(STORAGE_KEYS.CACHED_STOCKS, stocks)
      console.log(`Scan complete. Analyzed ${stocks.length} assets.`)

    } catch (err) {
      console.error("Background scan failed:", err)
    } finally {
      this.isScanning = false
    }
  },

  /** Generate high-level AI market report */
  async generateMarketReport(): Promise<string | null> {
    const stocks = await loadFromStorage<Stock[]>(STORAGE_KEYS.CACHED_STOCKS)
    if (!stocks || stocks.length === 0) return null
    
    // Simple heuristic-based predictions if real ones aren't available
    const mockPredictions = new Map<string, Prediction>() 
    return await generateMarketSummary(stocks, mockPredictions)
  }
}
