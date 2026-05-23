/**
 * Extension Popup — Compact stock monitoring panel (400×600)
 * Shows quick watchlist, market pulse, and navigation to full dashboard
 */
import React, { useEffect, useMemo, useState } from "react"
import { useStockStore } from "~src/store/stockStore"
import { useAlertStore } from "~src/store/alertStore"
import { useSettingsStore } from "~src/store/settingsStore"
import { useRealTimeUpdates } from "~src/hooks/useRealTimeUpdates"
import StockCard from "~src/components/StockCard"
import { formatCurrency, formatPercent, formatRelativeTime } from "~src/utils/helpers"
import "~style.css"

function IndexPopup() {
  useRealTimeUpdates()
  const stocks = useStockStore((s) => s.stocks)
  const watchlist = useStockStore((s) => s.watchlist)
  const getWatchlistStocks = useStockStore((s) => s.getWatchlistStocks)
  const isLoading = useStockStore((s) => s.isLoading)
  const lastUpdate = useStockStore((s) => s.lastUpdate)
  const dataSource = useStockStore((s) => s.dataSource)
  const predictions = useStockStore((s) => s.predictions)
  const unreadCount = useAlertStore((s) => s.unreadCount)
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted)
  const [searchQuery, setSearchQuery] = useState("")

  // Check if onboarding needed
  useEffect(() => {
    if (!onboardingCompleted) {
      chrome.tabs?.create?.({ url: "tabs/onboarding.html" })
    }
  }, [onboardingCompleted])

  const watchlistStocks = useMemo(() => getWatchlistStocks(), [stocks, watchlist])

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return watchlistStocks
    const q = searchQuery.toLowerCase()
    return watchlistStocks.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    )
  }, [watchlistStocks, searchQuery])

  // Market summary
  const marketSummary = useMemo(() => {
    if (stocks.length === 0) return { up: 0, down: 0, avgChange: 0 }
    const up = stocks.filter((s) => s.changePercent > 0).length
    const down = stocks.filter((s) => s.changePercent < 0).length
    const avgChange = stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length
    return { up, down, avgChange }
  }, [stocks])

  const openTab = (page: string) => {
    chrome.tabs?.create?.({ url: `tabs/${page}.html` })
  }

  const openStockDetail = (symbol: string) => {
    chrome.tabs?.create?.({ url: `tabs/dashboard.html?symbol=${symbol}` })
  }

  return (
    <div className="w-[400px] h-[580px] bg-surface-950 text-surface-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-3.5 pb-2.5 border-b border-white/[0.04] bg-surface-950/80 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 via-indigo-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25 border border-white/[0.06]">
              <span className="text-white font-extrabold text-xs">S</span>
            </div>
            <div>
              <h1 className="text-xs font-extrabold text-white tracking-tight leading-none mb-0.5">
                Stock<span className="gradient-text">AI</span>
              </h1>
              <div className="flex items-center gap-1">
                <div className={`w-1 h-1 rounded-full ${dataSource === "live" ? "bg-gain animate-pulse" : "bg-warning"}`} />
                <span className="text-[9px] font-bold text-surface-500 uppercase tracking-wider">
                  {dataSource === "live" ? "Live Pulse" : "Cached"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => openTab("notifications")} className="relative p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] transition-all text-surface-400 hover:text-surface-100">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-loss text-white text-[9px] font-extrabold flex items-center justify-center border border-surface-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => openTab("settings")} className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] transition-all text-surface-400 hover:text-surface-100">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            </button>
            <button onClick={() => openTab("dashboard")} className="btn-primary text-xs py-1.5 px-3 rounded-xl font-bold tracking-wide active:scale-[0.97]">
              Console
            </button>
          </div>
        </div>

        {/* Market Pulse */}
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          <div className="glass-card p-2.5 text-center hover:border-white/[0.08] transition-all duration-300">
            <div className="text-[9px] font-bold text-surface-500 uppercase tracking-widest mb-1 leading-none">SENTIMENT</div>
            <div className={`text-xs font-extrabold font-display leading-none ${marketSummary.avgChange >= 0 ? "text-gain" : "text-loss"}`}>
              {formatPercent(marketSummary.avgChange)}
            </div>
          </div>
          <div className="glass-card p-2.5 text-center hover:border-white/[0.08] transition-all duration-300">
            <div className="text-[9px] font-bold text-surface-500 uppercase tracking-widest mb-1 leading-none">▲ ADVANCING</div>
            <div className="text-xs font-extrabold text-gain font-display leading-none">{marketSummary.up}</div>
          </div>
          <div className="glass-card p-2.5 text-center hover:border-white/[0.08] transition-all duration-300">
            <div className="text-[9px] font-bold text-surface-500 uppercase tracking-widest mb-1 leading-none">▼ DECLINING</div>
            <div className="text-xs font-extrabold text-loss font-display leading-none">{marketSummary.down}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder="Search stocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark pl-8 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Watchlist */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-xs text-surface-500">Loading market data...</p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-surface-500">
            <span className="text-2xl">📭</span>
            <p className="text-xs">No stocks found</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredStocks.map((stock) => (
              <StockCard
                key={stock.symbol}
                symbol={stock.symbol}
                compact
                onSelect={openStockDetail}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-1.5 border-t border-white/[0.06] flex items-center justify-between bg-surface-950/80">
        <span className="text-2xs text-surface-600">
          Updated {formatRelativeTime(lastUpdate)}
        </span>
        <span className="text-2xs text-surface-600">
          {watchlist.length} stocks tracked
        </span>
      </div>
    </div>
  )
}

export default IndexPopup
