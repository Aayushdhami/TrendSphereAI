/**
 * Main stock store — manages all stock data with real API integration
 * Uses Finnhub for real-time, Yahoo for history, Alpha Vantage for indicators, FMP for fundamentals
 */
import { create } from "zustand"
import type { Stock, Prediction, WatchlistSortBy } from "~src/types"
import { initializeAllStocks, refreshQuotes } from "~src/services/dataAggregator"
import { generatePrediction } from "~src/services/predictionEngine"
import { STOCK_DATABASE } from "~src/utils/constants"
import { marketService } from "~src/services/market"
import { useSettingsStore } from "./settingsStore"
import { saveToStorage, STORAGE_KEYS } from "~src/services/storageService"

interface StockState {
  stocks: Stock[]
  predictions: Map<string, Prediction>
  watchlist: string[]
  pinnedStocks: string[]
  sortBy: WatchlistSortBy
  selectedSymbol: string | null
  isLoading: boolean
  lastUpdate: number
  dataSource: "live" | "cached" | "mock"

  // Actions
  initStocks: () => Promise<void>
  refreshPrices: () => Promise<void>
  updatePredictions: () => Promise<void>
  addToWatchlist: (symbol: string) => Promise<void>
  removeFromWatchlist: (symbol: string) => void
  togglePin: (symbol: string) => void
  setSortBy: (sort: WatchlistSortBy) => void
  setSelectedSymbol: (symbol: string | null) => void
  getStock: (symbol: string) => Stock | undefined
  getWatchlistStocks: () => Stock[]
  getTopGainers: () => Stock[]
  getTopLosers: () => Stock[]
  getTrending: () => Stock[]
  getHighVolatility: () => Stock[]
}

export const useStockStore = create<StockState>((set, get) => ({
  stocks: [],
  predictions: new Map(),
  watchlist: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA"],
  pinnedStocks: ["AAPL", "NVDA"],
  sortBy: "pinned",
  selectedSymbol: null,
  isLoading: true,
  lastUpdate: Date.now(),
  dataSource: "mock",

  initStocks: async () => {
    set({ isLoading: true })
    try {
      const { apiKeys } = useSettingsStore.getState()
      marketService.initialize({
        finnhub: apiKeys.finnhub,
        fmp: apiKeys.fmp,
        alpha: apiKeys.alphaVantage
      })

      // Get all symbols (watchlist + database)
      const { watchlist } = get()
      const allSymbols = Array.from(
        new Set([...watchlist, ...STOCK_DATABASE.map((s) => s.symbol)])
      )

      // Fetch real data from APIs (with failover engine)
      const stocks = await initializeAllStocks(allSymbols)

      // Generate predictions from real data
      const predictions = new Map<string, Prediction>()
      stocks.forEach((s) => predictions.set(s.symbol, generatePrediction(s)))

      set({
        stocks,
        predictions,
        isLoading: false,
        lastUpdate: Date.now(),
        dataSource: "live"
      })

      // Start Real-Time WebSocket Streaming for Watchlist
      watchlist.forEach(symbol => {
        marketService.streaming.subscribe(symbol, (trade) => {
          set(state => ({
            stocks: state.stocks.map(st => 
              st.symbol === symbol ? { ...st, price: trade.p, lastUpdated: Date.now() } : st
            )
          }))
        })
      })
    } catch (err) {
      console.error("Failed to initialize stocks:", err)
      set({ isLoading: false, dataSource: "cached" })
    }
  },

  refreshPrices: async () => {
    const { stocks } = get()
    if (stocks.length === 0) return
    try {
      const updated = await refreshQuotes(stocks)
      set({ stocks: updated, lastUpdate: Date.now() })
    } catch {
      // Silently fail — keep existing data
    }
  },

  updatePredictions: async () => {
    const { stocks } = get()
    const predictions = new Map<string, Prediction>()
    stocks.forEach((s) => predictions.set(s.symbol, generatePrediction(s)))
    set({ predictions })
  },

  addToWatchlist: async (symbol) => {
    const { stocks, watchlist } = get()
    if (watchlist.includes(symbol)) return

    // Immediately add to watchlist string array
    set((state) => ({
      watchlist: [...state.watchlist, symbol],
    }))

    // If store is still loading initially, initStocks will handle it
    if (get().isLoading) return

    // If it's not in the stocks array, fetch it immediately
    if (!stocks.find((s) => s.symbol === symbol)) {
      try {
        const newStocks = await initializeAllStocks([symbol])
        if (newStocks.length > 0) {
          const newStock = newStocks[0]
          const prediction = generatePrediction(newStock)
          
          set((state) => {
            const newPredictions = new Map(state.predictions)
            newPredictions.set(newStock.symbol, prediction)
            return {
              stocks: [...state.stocks, newStock],
              predictions: newPredictions
            }
          })
        }
      } catch (err) {
        console.error(`Failed to fetch new stock ${symbol}:`, err)
      }
    }
  },

  removeFromWatchlist: (symbol) => {
    set((state) => ({
      watchlist: state.watchlist.filter((s) => s !== symbol),
      pinnedStocks: state.pinnedStocks.filter((s) => s !== symbol),
    }))
  },

  togglePin: (symbol) => {
    set((state) => ({
      pinnedStocks: state.pinnedStocks.includes(symbol)
        ? state.pinnedStocks.filter((s) => s !== symbol)
        : [...state.pinnedStocks, symbol],
    }))
  },

  setSortBy: (sortBy) => set({ sortBy }),
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),

  getStock: (symbol) => get().stocks.find((s) => s.symbol === symbol),

  getWatchlistStocks: () => {
    const { stocks, watchlist, pinnedStocks, sortBy } = get()
    let list = stocks.filter((s) => watchlist.includes(s.symbol))

    switch (sortBy) {
      case "price":
        list.sort((a, b) => b.price - a.price)
        break
      case "change":
        list.sort((a, b) => b.changePercent - a.changePercent)
        break
      case "name":
        list.sort((a, b) => a.symbol.localeCompare(b.symbol))
        break
      case "volatility":
        list.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        break
      case "pinned":
        list.sort((a, b) => {
          const aPin = pinnedStocks.includes(a.symbol) ? 0 : 1
          const bPin = pinnedStocks.includes(b.symbol) ? 0 : 1
          return aPin - bPin || a.symbol.localeCompare(b.symbol)
        })
        break
    }
    return list
  },

  getTopGainers: () =>
    [...get().stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),

  getTopLosers: () =>
    [...get().stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),

  getTrending: () =>
    [...get().stocks].sort((a, b) => b.volume - a.volume).slice(0, 5),

  getHighVolatility: () =>
    [...get().stocks]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 5),
}))

// Auto-save watchlist to storage on change
useStockStore.subscribe((state, prevState) => {
  if (state.isLoading) return
  
  const watchlistToSave = state.watchlist
  const pinnedToSave = state.pinnedStocks
  
  saveToStorage(STORAGE_KEYS.WATCHLIST, watchlistToSave)
})
