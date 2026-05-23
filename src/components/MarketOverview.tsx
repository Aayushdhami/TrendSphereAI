/**
 * MarketOverview - Dashboard section showing market categories
 */
import React from "react"
import { useStockStore } from "~src/store/stockStore"
import { formatCurrency, formatPercent, formatLargeNumber } from "~src/utils/helpers"

interface MarketOverviewProps {
  onSelectStock?: (symbol: string) => void
}

const MarketOverview: React.FC<MarketOverviewProps> = ({ onSelectStock }) => {
  const stocks = useStockStore((s) => s.stocks)
  
  const { gainers, losers, trending, volatile } = React.useMemo(() => {
    const list = [...stocks]
    return {
      gainers: [...list].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
      losers: [...list].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
      trending: [...list].sort((a, b) => b.volume - a.volume).slice(0, 5),
      volatile: [...list].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 5),
    }
  }, [stocks])

  const sections = [
    { title: "🔥 Trending", subtitle: "Most Active Assets", items: trending, icon: "🔥" },
    { title: "📈 Top Gainers", subtitle: "Bullish Momentum", items: gainers, icon: "📈" },
    { title: "📉 Top Losers", subtitle: "Bearish Pressure", items: losers, icon: "📉" },
    { title: "⚡ High Volatility", subtitle: "Delta Extremes", items: volatile, icon: "⚡" },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {sections.map((section) => (
        <div key={section.title} className="glass-card-hover p-5 transition-all duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border flex-shrink-0 ${
              section.title.includes("Gainers") 
                ? "bg-gain/10 border-gain/20 text-gain" 
                : section.title.includes("Losers") 
                  ? "bg-loss/10 border-loss/20 text-loss" 
                  : section.title.includes("Trending") 
                    ? "bg-brand-500/10 border-brand-500/20 text-brand-300"
                    : "bg-warning/10 border-warning/20 text-warning"
            }`}>
              <span className="text-xs">{section.icon}</span>
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider leading-none mb-1 font-display">
                {section.title.replace(/^[^\s]+\s/, "")}
              </h3>
              <p className="text-[9px] font-bold text-surface-500 uppercase tracking-widest leading-none">{section.subtitle}</p>
            </div>
          </div>
          <div className="space-y-2">
            {section.items.map((stock, idx) => {
              const isUp = stock.changePercent >= 0
              return (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/[0.04] cursor-pointer transition-all duration-300 group/item"
                  onClick={() => onSelectStock?.(stock.symbol)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-extrabold text-surface-500 bg-white/[0.04] border border-white/[0.04] w-5 h-5 rounded-lg flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-white tracking-wide group-hover/item:text-brand-300 transition-colors">{stock.symbol}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-surface-300 font-medium">
                      {formatCurrency(stock.price)}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold min-w-[65px] text-right px-2 py-0.5 rounded-md border ${
                        isUp 
                          ? "text-gain bg-gain/10 border-gain/20 shadow-sm shadow-gain/5" 
                          : "text-loss bg-loss/10 border-loss/20 shadow-sm shadow-loss/5"
                      }`}
                    >
                      {formatPercent(stock.changePercent)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default React.memo(MarketOverview)
