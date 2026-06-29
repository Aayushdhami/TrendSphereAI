import React, { useState, useEffect } from "react"
import { usePortfolioStore } from "~src/store/portfolioStore"
import { useStockStore } from "~src/store/stockStore"
import { fetchFullStockData } from "~src/services/dataAggregator"

interface AddPositionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddPositionModal({ isOpen, onClose }: AddPositionModalProps) {
  const [symbol, setSymbol] = useState("")
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [assetName, setAssetName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingPrice, setIsFetchingPrice] = useState(false)

  const addPosition = usePortfolioStore(s => s.addPosition)
  const stocks = useStockStore(s => s.stocks)
  
  // Auto-fetch price & name when symbol is typed
  useEffect(() => {
    const sym = symbol.toUpperCase().trim()
    if (sym.length < 2) {
      setAssetName("")
      return
    }
    
    const timer = setTimeout(async () => {
      setIsFetchingPrice(true)
      try {
        // 1. Check local realtime store first for instant load
        const existingStock = stocks.find(s => s.symbol === sym)
        if (existingStock) {
          setPrice(existingStock.price.toString())
          setAssetName(existingStock.name)
        } else {
          // 2. Fall back to external API fetch
          const data = await fetchFullStockData(sym)
          if (data && data.price > 0) {
            setPrice(data.price.toString())
            setAssetName(data.name !== sym ? data.name : "Global Asset")
          }
        }
      } catch (e) {
        console.error("Failed to fetch live price for", sym, e)
      } finally {
        setIsFetchingPrice(false)
      }
    }, 500) // 500ms debounce
    
    return () => clearTimeout(timer)
  }, [symbol, stocks])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!symbol || !quantity || !price) return
    setIsSubmitting(true)
    
    try {
      const sym = symbol.toUpperCase().trim()
      // find stock from store, or fallback
      const stock = stocks.find(s => s.symbol === sym)
      
      await addPosition({
        symbol: sym,
        name: assetName || stock?.name || sym,
        sector: stock?.sector || "Other",
        quantity: parseFloat(quantity),
        avgBuyPrice: parseFloat(price),
        currentPrice: stock?.price || parseFloat(price),
        assetType: "stock"
      })
      
      onClose()
      setSymbol("")
      setQuantity("")
      setPrice("")
      setAssetName("")
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-950 border border-white/[0.08] shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden animate-fadeIn">
        <div className="px-6 py-4 border-b border-white/[0.04] flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-sm font-black text-white uppercase tracking-wider font-display flex items-center gap-2">
            <span className="text-brand-400">💼</span> Add Position
          </h3>
          <button onClick={onClose} className="text-surface-500 hover:text-white transition-colors bg-white/[0.05] p-1.5 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest">Asset Symbol</label>
              {isFetchingPrice ? (
                <span className="text-[9px] font-bold text-brand-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400" /> Fetching Live Data...
                </span>
              ) : assetName ? (
                <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest truncate max-w-[150px]">
                  {assetName}
                </span>
              ) : null}
            </div>
            <div className="relative">
              <input 
                type="text" 
                required
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                placeholder="e.g. AAPL"
                className="input-dark w-full text-xs py-2.5 px-3 pl-8 uppercase font-bold text-white tracking-widest"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 font-black">#</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5">Quantity</label>
              <input 
                type="number" 
                required
                min="0.0001"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0.00"
                className="input-dark w-full text-sm py-2.5 px-3 font-mono font-bold text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5">Avg Price</label>
              <div className="relative">
                <input 
                  type="number" 
                  required
                  min="0.01"
                  step="any"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="input-dark w-full text-sm py-2.5 px-3 pl-7 font-mono font-bold text-white"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500 font-mono">$</span>
              </div>
            </div>
          </div>
          
          {symbol && (
            <div className="p-3 bg-surface-900 border border-white/[0.04] rounded-xl flex items-center justify-between">
              <span className="text-[10px] font-bold text-surface-500 uppercase">Estimated Total</span>
              <span className="text-sm font-mono font-black text-brand-300">
                ${((parseFloat(quantity) || 0) * (parseFloat(price) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-primary w-full text-xs py-3 font-black tracking-widest uppercase shadow-lg shadow-brand-500/20"
            >
              {isSubmitting ? "Registering Asset..." : "Add to Vault"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
