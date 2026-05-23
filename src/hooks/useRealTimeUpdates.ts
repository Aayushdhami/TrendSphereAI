/**
 * Custom hook for real-time stock price updates and alert checking
 * Uses real API data when configured, falls back to simulation
 * Enhanced to handle Portfolio sync and Sound Alerts
 */
import { useEffect, useRef } from "react"
import { useStockStore } from "~src/store/stockStore"
import { useAlertStore } from "~src/store/alertStore"
import { useSettingsStore } from "~src/store/settingsStore"
import { usePortfolioStore } from "~src/store/portfolioStore"
import { checkAlerts, sendBrowserNotification, playAlertSound } from "~src/services/alertService"

export function useRealTimeUpdates() {
  const initStocks = useStockStore((s) => s.initStocks)
  const refreshPrices = useStockStore((s) => s.refreshPrices)
  const updatePredictions = useStockStore((s) => s.updatePredictions)
  const stocks = useStockStore((s) => s.stocks)
  const predictions = useStockStore((s) => s.predictions)
  const isLoading = useStockStore((s) => s.isLoading)
  
  const alerts = useAlertStore((s) => s.alerts)
  const addNotification = useAlertStore((s) => s.addNotification)
  const triggerAlert = useAlertStore((s) => s.triggerAlert)
  const loadAlerts = useAlertStore((s) => s.loadAlerts)

  const loadPortfolio = usePortfolioStore((s) => s.loadPortfolio)
  const refreshPortfolioPrices = usePortfolioStore((s) => s.refreshPrices)
  
  const loadStoredSettings = useSettingsStore((s) => s.loadStoredSettings)
  const updateInterval = useSettingsStore((s) => s.dashboardPreferences.updateInterval)
  const enableNotifications = useSettingsStore((s) => s.alertPreferences.enableBrowserNotifications)
  const enableSound = useSettingsStore((s) => s.alertPreferences.enableSoundAlerts)
  
  const initialized = useRef(false)

  // Load configuration and data on mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      const init = async () => {
        await loadStoredSettings()
        await Promise.all([
          initStocks(),
          loadAlerts(),
          loadPortfolio()
        ])
      }
      init()
    }
  }, [])

  // Use a ref for stocks to avoid re-triggering the refresh effect
  const stocksRef = useRef(stocks)
  useEffect(() => {
    stocksRef.current = stocks
  }, [stocks])

  // Real-time price refresh (uses Finnhub API or simulation)
  useEffect(() => {
    if (isLoading) return
    const interval = setInterval(() => {
      refreshPrices()
      refreshPortfolioPrices(stocksRef.current)
    }, updateInterval)
    return () => clearInterval(interval)
  }, [isLoading, refreshPrices, refreshPortfolioPrices, updateInterval])

  // Prediction updates (every 60s to save API calls)
  useEffect(() => {
    if (isLoading) return
    const interval = setInterval(updatePredictions, 60000)
    return () => clearInterval(interval)
  }, [isLoading, updatePredictions])

  // Alert checking (every 5s)
  useEffect(() => {
    if (isLoading || stocks.length === 0) return
    const interval = setInterval(() => {
      const activeAlerts = alerts.filter((a) => a.isActive)
      if (activeAlerts.length === 0) return

      const { triggered, notifications } = checkAlerts(activeAlerts, stocks, predictions)
      
      triggered.forEach((a) => triggerAlert(a.id))
      notifications.forEach((n) => {
        addNotification(n)
        
        if (enableNotifications) {
          sendBrowserNotification(n.title, n.message)
        }
        
        if (enableSound) {
          playAlertSound(n.type === "alert" ? "urgent" : "default")
        }
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [isLoading, stocks, alerts, predictions, enableNotifications, enableSound])
}

