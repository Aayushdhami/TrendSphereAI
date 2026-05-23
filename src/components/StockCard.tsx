/**
 * StockCard - Compact stock display card for dashboard and watchlist
 */
import React, { useMemo } from "react"
import { useStockStore } from "~src/store/stockStore"
import SparklineChart from "./SparklineChart"
import { formatCurrency, formatPercent, formatLargeNumber } from "~src/utils/helpers"
import { RECOMMENDATION_COLORS } from "~src/utils/constants"
import type { Prediction } from "~src/types"

interface StockCardProps {
  symbol: string
  compact?: boolean
  onSelect?: (symbol: string) => void
}

const StockCard: React.FC<StockCardProps> = ({ symbol, compact = false, onSelect }) => {
  const stock = useStockStore((s) => s.stocks.find((st) => st.symbol === symbol))
  const prediction = useStockStore((s) => s.predictions.get(symbol))
  const isPinned = useStockStore((s) => s.pinnedStocks.includes(symbol))
  const togglePin = useStockStore((s) => s.togglePin)

  const sparkData = useMemo(() => {
    if (!stock) return []
    return stock.historicalData.slice(-30).map((d) => d.close)
  }, [stock?.historicalData])

  if (!stock) return null

  const isUp = stock.change >= 0

  if (compact) {
    return (
      <div
        className="flex items-center justify-between py-2.5 px-3 hover:bg-surface-800/40 rounded-lg cursor-pointer transition-colors group"
        onClick={() => onSelect?.(symbol)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500/20 to-brand-600/10 flex items-center justify-center border border-brand-500/20">
            <span className="text-xs font-bold text-brand-300">
              {symbol.slice(0, 2)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{symbol}</div>
            <div className="text-2xs text-surface-500 truncate">{stock.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 h-8">
            <SparklineChart data={sparkData} positive={isUp} height={32} />
          </div>
          <div className="text-right min-w-[80px]">
            <div className="text-sm font-mono font-semibold text-white">
              {formatCurrency(stock.price)}
            </div>
            <div className={`text-xs font-mono font-medium ${isUp ? "text-gain" : "text-loss"}`}>
              {formatPercent(stock.changePercent)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`glass-card-hover ${isUp ? "premium-card-gain" : "premium-card-loss"} p-5 cursor-pointer group`}
      onClick={() => onSelect?.(symbol)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 flex items-center justify-center border border-brand-500/20">
            <span className="text-sm font-bold text-brand-300">{symbol.slice(0, 2)}</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">{symbol}</div>
            <div className="text-xs text-surface-400 truncate max-w-[100px]">{stock.name}</div>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); togglePin(symbol) }}
          className={`p-1 rounded transition-colors ${isPinned ? "text-warning" : "text-surface-600 hover:text-surface-400"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </div>

      {/* Price */}
      <div className="mb-3">
        <div className="text-xl font-mono font-bold text-white">
          {formatCurrency(stock.price)}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-sm font-mono font-semibold ${isUp ? "text-gain" : "text-loss"}`}>
            {isUp ? "▲" : "▼"} {formatPercent(stock.changePercent)}
          </span>
          <span className="text-xs text-surface-500">
            ({isUp ? "+" : ""}{stock.change.toFixed(2)})
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-10 mb-3">
        <SparklineChart data={sparkData} positive={isUp} height={40} />
      </div>

      {/* Quick Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="text-surface-500">
          Vol: <span className="text-surface-300 font-mono">{formatLargeNumber(stock.volume)}</span>
        </div>
        {prediction && (
          <span
            className="text-2xs font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${RECOMMENDATION_COLORS[prediction.recommendation]}15`,
              color: RECOMMENDATION_COLORS[prediction.recommendation],
            }}
          >
            {prediction.recommendation.replace("-", " ").toUpperCase()}
          </span>
        )}
      </div>
    </div>
  )
}

export default React.memo(StockCard)
