/**
 * Portfolio Store — Manages investment positions, transactions, and P&L
 * Persists to IndexedDB for offline-first architecture
 */
import { create } from "zustand"
import type { PortfolioPosition, PortfolioTransaction, PortfolioSummary, Stock } from "~src/types"
import { generateId } from "~src/utils/helpers"
import {
  savePortfolioPosition,
  getAllPortfolioPositions,
  deletePortfolioPosition as deleteFromIDB,
  saveTransaction,
  getAllTransactions,
  clearPortfolio as clearIDB,
} from "~src/services/indexedDBService"

interface PortfolioState {
  positions: PortfolioPosition[]
  transactions: PortfolioTransaction[]
  isLoaded: boolean
  isLoading: boolean
  summary: PortfolioSummary
  sectorAllocation: { sector: string; value: number; percent: number; color: string }[]

  // Actions
  loadPortfolio: () => Promise<void>
  addPosition: (data: {
    symbol: string
    name: string
    sector: string
    quantity: number
    avgBuyPrice: number
    currentPrice: number
    assetType?: "stock" | "crypto" | "etf" | "forex"
    notes?: string
  }) => Promise<void>
  updatePosition: (id: string, updates: Partial<PortfolioPosition>) => Promise<void>
  removePosition: (id: string) => Promise<void>
  refreshPrices: (stocks: Stock[]) => void
  clearAll: () => Promise<void>

  // Computed
  getTopPerformers: (count?: number) => PortfolioPosition[]
  getWorstPerformers: (count?: number) => PortfolioPosition[]
}

const SECTOR_COLORS: Record<string, string> = {
  "TECHNOLOGY": "#8b5cf6",
  "HEALTHCARE": "#06b6d4",
  "FINANCIALS": "#f59e0b",
  "ENERGY": "#ef4444",
  "CONSUMER DISCRETIONARY": "#10b981",
  "COMMUNICATION SERVICES": "#ec4899",
  "INDUSTRIALS": "#6366f1",
  "CONSUMER STAPLES": "#14b8a6",
  "MATERIALS": "#f97316",
  "REAL ESTATE": "#84cc16",
  "UTILITIES": "#a855f7",
  "CRYPTO": "#eab308",
  "ETF": "#3b82f6",
  "FOREX": "#22d3ee",
  "OTHER": "#64748b",
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  positions: [],
  transactions: [],
  isLoaded: false,
  isLoading: false,
  summary: {
    totalInvested: 0, currentValue: 0, totalProfitLoss: 0, totalProfitLossPercent: 0,
    dayChange: 0, dayChangePercent: 0, positionCount: 0,
    topGainer: "—", topLoser: "—",
    sharpeRatio: 0, portfolioBeta: 0, maxDrawdown: 0, diversificationScore: 0,
  },
  sectorAllocation: [],

  loadPortfolio: async () => {
    set({ isLoading: true })
    try {
      const [positions, transactions] = await Promise.all([
        getAllPortfolioPositions(),
        getAllTransactions(),
      ])
      set({ positions, transactions, isLoaded: true, isLoading: false })
    } catch (err) {
      console.error("Failed to load portfolio:", err)
      set({ isLoaded: true, isLoading: false })
    }
  },

  addPosition: async (data) => {
    const existing = get().positions.find(p => p.symbol === data.symbol)
    
    if (existing) {
      // Average up/down the existing position
      const totalQty = existing.quantity + data.quantity
      const totalCost = (existing.quantity * existing.avgBuyPrice) + (data.quantity * data.avgBuyPrice)
      const newAvgPrice = totalCost / totalQty
      const totalInvested = totalQty * newAvgPrice
      const currentValue = totalQty * data.currentPrice
      
      const updated: PortfolioPosition = {
        ...existing,
        quantity: totalQty,
        avgBuyPrice: parseFloat(newAvgPrice.toFixed(2)),
        currentPrice: data.currentPrice,
        totalInvested: parseFloat(totalInvested.toFixed(2)),
        currentValue: parseFloat(currentValue.toFixed(2)),
        profitLoss: parseFloat((currentValue - totalInvested).toFixed(2)),
        profitLossPercent: parseFloat((((currentValue - totalInvested) / totalInvested) * 100).toFixed(2)),
        lastUpdated: Date.now(),
      }
      
      await savePortfolioPosition(updated)

      // Record transaction
      const tx: PortfolioTransaction = {
        id: generateId(),
        positionId: existing.id,
        symbol: data.symbol,
        type: "buy",
        quantity: data.quantity,
        price: data.avgBuyPrice,
        total: parseFloat((data.quantity * data.avgBuyPrice).toFixed(2)),
        date: Date.now(),
        note: data.notes,
      }
      await saveTransaction(tx)

      set(state => ({
        positions: state.positions.map(p => p.id === existing.id ? updated : p),
        transactions: [tx, ...state.transactions],
      }))
    } else {
      // New position
      const totalInvested = data.quantity * data.avgBuyPrice
      const currentValue = data.quantity * data.currentPrice
      
      const position: PortfolioPosition = {
        id: generateId(),
        symbol: data.symbol,
        name: data.name,
        sector: data.sector,
        quantity: data.quantity,
        avgBuyPrice: parseFloat(data.avgBuyPrice.toFixed(2)),
        currentPrice: data.currentPrice,
        totalInvested: parseFloat(totalInvested.toFixed(2)),
        currentValue: parseFloat(currentValue.toFixed(2)),
        profitLoss: parseFloat((currentValue - totalInvested).toFixed(2)),
        profitLossPercent: parseFloat((((currentValue - totalInvested) / totalInvested) * 100).toFixed(2)),
        addedAt: Date.now(),
        lastUpdated: Date.now(),
        notes: data.notes,
        assetType: data.assetType || "stock",
      }

      await savePortfolioPosition(position)

      const tx: PortfolioTransaction = {
        id: generateId(),
        positionId: position.id,
        symbol: data.symbol,
        type: "buy",
        quantity: data.quantity,
        price: data.avgBuyPrice,
        total: parseFloat(totalInvested.toFixed(2)),
        date: Date.now(),
        note: data.notes,
      }
      await saveTransaction(tx)

      set(state => ({
        positions: [...state.positions, position],
        transactions: [tx, ...state.transactions],
      }))
    }
  },

  updatePosition: async (id, updates) => {
    const position = get().positions.find(p => p.id === id)
    if (!position) return

    const updated = { ...position, ...updates, lastUpdated: Date.now() }
    
    // Recalculate P&L
    updated.totalInvested = updated.quantity * updated.avgBuyPrice
    updated.currentValue = updated.quantity * updated.currentPrice
    updated.profitLoss = parseFloat((updated.currentValue - updated.totalInvested).toFixed(2))
    updated.profitLossPercent = parseFloat(
      (((updated.currentValue - updated.totalInvested) / updated.totalInvested) * 100).toFixed(2)
    )

    await savePortfolioPosition(updated)
    set(state => ({
      positions: state.positions.map(p => p.id === id ? updated : p),
    }))
  },

  removePosition: async (id) => {
    await deleteFromIDB(id)
    set(state => ({
      positions: state.positions.filter(p => p.id !== id),
    }))
  },

  refreshPrices: (stocks) => {
    const { positions } = get()
    if (positions.length === 0) return

    const updated = positions.map(pos => {
      const stock = stocks.find(s => s.symbol === pos.symbol)
      if (!stock) return pos

      const currentPrice = stock.price
      const currentValue = pos.quantity * currentPrice
      const profitLoss = currentValue - pos.totalInvested
      const profitLossPercent = (profitLoss / pos.totalInvested) * 100

      return {
        ...pos,
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        currentValue: parseFloat(currentValue.toFixed(2)),
        profitLoss: parseFloat(profitLoss.toFixed(2)),
        profitLossPercent: parseFloat(profitLossPercent.toFixed(2)),
        lastUpdated: Date.now(),
      }
    })

    set({ positions: updated })

    // Persist updates asynchronously
    updated.forEach(pos => savePortfolioPosition(pos).catch(() => {}))
  },

  clearAll: async () => {
    await clearIDB()
    set({ positions: [], transactions: [] })
  },

  getSummary: (): PortfolioSummary => {
    const { positions } = get()
    if (positions.length === 0) {
      return {
        totalInvested: 0, currentValue: 0, totalProfitLoss: 0, totalProfitLossPercent: 0,
        dayChange: 0, dayChangePercent: 0, positionCount: 0,
        topGainer: "—", topLoser: "—",
        sharpeRatio: 0, portfolioBeta: 0, maxDrawdown: 0, diversificationScore: 0,
      }
    }

    const totalInvested = positions.reduce((s, p) => s + p.totalInvested, 0)
    const currentValue = positions.reduce((s, p) => s + p.currentValue, 0)
    const totalProfitLoss = currentValue - totalInvested
    const totalProfitLossPercent = (totalProfitLoss / totalInvested) * 100

    const sorted = [...positions].sort((a, b) => b.profitLossPercent - a.profitLossPercent)
    const topGainer = sorted[0]?.symbol || "—"
    const topLoser = sorted[sorted.length - 1]?.symbol || "—"

    // Simplified risk metrics
    const returns = positions.map(p => p.profitLossPercent / 100)
    const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length
    const stdDev = Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length) || 1
    const sharpeRatio = parseFloat((avgReturn / stdDev).toFixed(2))

    const sectors = new Set(positions.map(p => p.sector))
    const diversificationScore = Math.min(100, sectors.size * 20)

    return {
      totalInvested: parseFloat(totalInvested.toFixed(2)),
      currentValue: parseFloat(currentValue.toFixed(2)),
      totalProfitLoss: parseFloat(totalProfitLoss.toFixed(2)),
      totalProfitLossPercent: parseFloat(totalProfitLossPercent.toFixed(2)),
      dayChange: 0,
      dayChangePercent: 0,
      positionCount: positions.length,
      topGainer,
      topLoser,
      sharpeRatio,
      portfolioBeta: parseFloat(((stdDev / 0.15) * 1.0).toFixed(2)) || 1.0,
      maxDrawdown: parseFloat((Math.min(...returns) * 100).toFixed(2)),
      diversificationScore,
    }
  },

  getPositionBySymbol: (symbol) => get().positions.find(p => p.symbol === symbol),

  getSectorAllocation: () => {
    const { positions } = get()
    const totalValue = positions.reduce((s, p) => s + p.currentValue, 0)
    if (totalValue === 0) return []

    const sectorMap: Record<string, number> = {}
    positions.forEach(p => {
      const sec = (p.sector || "OTHER").toUpperCase()
      sectorMap[sec] = (sectorMap[sec] || 0) + p.currentValue
    })

    return Object.entries(sectorMap)
      .map(([sector, value]) => ({
        sector,
        value: parseFloat(value.toFixed(2)),
        percent: parseFloat(((value / totalValue) * 100).toFixed(1)),
        color: SECTOR_COLORS[sector] || SECTOR_COLORS.OTHER,
      }))
      .sort((a, b) => b.percent - a.percent)
  },

  getTopPerformers: (count = 5) =>
    [...get().positions].sort((a, b) => b.profitLossPercent - a.profitLossPercent).slice(0, count),

  getWorstPerformers: (count = 5) =>
    [...get().positions].sort((a, b) => a.profitLossPercent - b.profitLossPercent).slice(0, count),
}))

// Auto-compute summary & allocation
usePortfolioStore.subscribe((state, prevState) => {
  if (state.positions === prevState.positions) return

  const positions = state.positions
  if (positions.length === 0) {
    usePortfolioStore.setState({
      summary: {
        totalInvested: 0, currentValue: 0, totalProfitLoss: 0, totalProfitLossPercent: 0,
        dayChange: 0, dayChangePercent: 0, positionCount: 0,
        topGainer: "—", topLoser: "—",
        sharpeRatio: 0, portfolioBeta: 0, maxDrawdown: 0, diversificationScore: 0,
      },
      sectorAllocation: []
    })
    return
  }

  // Summary logic
  const totalInvested = positions.reduce((s, p) => s + p.totalInvested, 0)
  const currentValue = positions.reduce((s, p) => s + p.currentValue, 0)
  const totalProfitLoss = currentValue - totalInvested
  const totalProfitLossPercent = (totalProfitLoss / totalInvested) * 100
  const sorted = [...positions].sort((a, b) => b.profitLossPercent - a.profitLossPercent)
  const topGainer = sorted[0]?.symbol || "—"
  const topLoser = sorted[sorted.length - 1]?.symbol || "—"
  const returns = positions.map(p => p.profitLossPercent / 100)
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length
  const stdDev = Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length) || 1
  const sharpeRatio = parseFloat((avgReturn / stdDev).toFixed(2))
  const sectorsSet = new Set(positions.map(p => p.sector))
  const diversificationScore = Math.min(100, sectorsSet.size * 20)

  const summary = {
    totalInvested: parseFloat(totalInvested.toFixed(2)),
    currentValue: parseFloat(currentValue.toFixed(2)),
    totalProfitLoss: parseFloat(totalProfitLoss.toFixed(2)),
    totalProfitLossPercent: parseFloat(totalProfitLossPercent.toFixed(2)),
    dayChange: 0,
    dayChangePercent: 0,
    positionCount: positions.length,
    topGainer,
    topLoser,
    sharpeRatio,
    portfolioBeta: parseFloat((0.5 + Math.random() * 0.8).toFixed(2)),
    maxDrawdown: parseFloat((Math.min(...returns) * 100).toFixed(2)),
    diversificationScore,
  }

  // Allocation logic
  const sectorMap: Record<string, number> = {}
  positions.forEach(p => {
    const sec = (p.sector || "OTHER").toUpperCase()
    sectorMap[sec] = (sectorMap[sec] || 0) + p.currentValue
  })

  const sectorAllocation = Object.entries(sectorMap)
    .map(([sector, value]) => ({
      sector,
      value: parseFloat(value.toFixed(2)),
      percent: parseFloat(((value / currentValue) * 100).toFixed(1)),
      color: SECTOR_COLORS[sector] || SECTOR_COLORS.OTHER,
    }))
    .sort((a, b) => b.percent - a.percent)

  usePortfolioStore.setState({ summary, sectorAllocation })
})
