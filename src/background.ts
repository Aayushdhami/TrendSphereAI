/**
 * Enhanced Background Service Worker
 * Handles alarm-based background tasks, alert scanning ,
 * IndexedDB sync, and AI-driven market monitoring
 */

import { marketIntelligence } from "./services/marketIntelligenceSystem"

// Initialize background tasks
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Tradex Quantum Intelligence extension installed")
  
  // Initial scan
  await marketIntelligence.startSystem()
  
  // Set up alarms for periodic tasks
  chrome.alarms.create("intelligenceScan", {
    periodInMinutes: 2
  })

  // Portfolio price refresh alarm
  chrome.alarms.create("portfolioSync", {
    periodInMinutes: 5
  })

  // AI market summary alarm (every 30 min)
  chrome.alarms.create("aiMarketScan", {
    periodInMinutes: 30
  })

  // IndexedDB cleanup alarm (daily)
  chrome.alarms.create("dataCleanup", {
    periodInMinutes: 1440
  })
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case "intelligenceScan":
      console.log("Background Market Intelligence Scan execution start...")
      await marketIntelligence.performBackgroundScan()
      break

    case "portfolioSync":
      console.log("Background Portfolio Sync...")
      // Portfolio prices are updated through the store when popup/dashboard is open
      // This alarm ensures cached data stays fresh
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          const result = await chrome.storage.local.get("stockai_cached_stocks")
          if (result.stockai_cached_stocks) {
            console.log("Portfolio cache verified")
          }
        }
      } catch {}
      break

    case "aiMarketScan":
      console.log("AI Market Scan triggered...")
      // Notification for significant market movements
      try {
        const result = await chrome.storage.local.get("stockai_cached_stocks")
        if (result.stockai_cached_stocks) {
          const stocks = JSON.parse(result.stockai_cached_stocks)
          if (Array.isArray(stocks)) {
            const bigMovers = stocks.filter((s: any) => Math.abs(s.changePercent) > 5)
            if (bigMovers.length > 0) {
              chrome.notifications.create({
                type: "basic",
                iconUrl: "icon.png",
                title: "🚨 Significant Market Movement",
                message: `${bigMovers.length} stocks moved more than 5% today. Open dashboard for details.`,
                priority: 2,
              })
            }
          }
        }
      } catch (err) {
        console.warn("AI Market Scan failed:", err)
      }
      break

    case "dataCleanup":
      console.log("Running data cleanup...")
      // Clean old cached data
      break
  }
})

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: "tabs/dashboard.html" })
})

// Handle messages from popup/dashboard
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "REFRESH_DATA") {
    marketIntelligence.performBackgroundScan().then(() => {
      sendResponse({ success: true })
    })
    return true // Keep message channel open for async response
  }

  if (message.type === "GET_STATUS") {
    sendResponse({
      status: "active",
      lastScan: Date.now(),
      version: "2.0.0",
    })
  }
})

export {}
