import React, { useState, useMemo, useEffect, useRef } from "react"
import { useStockStore } from "~src/store/stockStore"
import { useAlertStore } from "~src/store/alertStore"
import { useSettingsStore } from "~src/store/settingsStore"
import { usePortfolioStore } from "~src/store/portfolioStore"
import { useRealTimeUpdates } from "~src/hooks/useRealTimeUpdates"
import { useKeyboardShortcuts, getDashboardShortcuts } from "~src/hooks/useKeyboardShortcuts"
import Header from "~src/components/Header"
import AIChatbot from "~src/components/AIChatbot"
import SparklineChart from "~src/components/SparklineChart"
import StockCard from "~src/components/StockCard"
import PredictionGauge from "~src/components/PredictionGauge"
import { formatCurrency, formatPercent, formatLargeNumber, formatRelativeTime, formatChartPrice } from "~src/utils/helpers"
import { RECOMMENDATION_COLORS, RISK_COLORS } from "~src/utils/constants"
import { getDataSourceStatus } from "~src/services/dataAggregator"
import { searchSymbols } from "~src/services/finnhubService"
import { generateMarketSummary, getEnterprisePrediction } from "~src/services/geminiService"
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, Cell, PieChart, Pie } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import "~style.css"

type DashboardSection = "dashboard" | "watchlist" | "notifications" | "settings" | "exporter" | "portfolio"

function DashboardPage() {
  useRealTimeUpdates()

  const stocks = useStockStore((s) => s.stocks)
  const predictions = useStockStore((s) => s.predictions)
  const watchlist = useStockStore((s) => s.watchlist)
  const isLoading = useStockStore((s) => s.isLoading)
  
  const portfolio = usePortfolioStore((s) => s.positions)
  const portfolioSummary = usePortfolioStore((s) => s.summary)
  const sectorAllocation = usePortfolioStore((s) => s.sectorAllocation)

  const [currentPage, setCurrentPage] = useState<DashboardSection>("dashboard")
  const [activeDashboardTab, setActiveDashboardTab] = useState<"terminal" | "portfolio" | "radar">("terminal")
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [chartTimeframe, setChartTimeframe] = useState<"1M" | "6M" | "1Y" | "2Y" | "5Y" | "ALL">("6M")
  
  // Shortcuts
  useKeyboardShortcuts(getDashboardShortcuts({
    goToDashboard: () => { setCurrentPage("dashboard"); setActiveDashboardTab("terminal") },
    goToWatchlist: () => setCurrentPage("watchlist"),
    goToPortfolio: () => { setCurrentPage("dashboard"); setActiveDashboardTab("portfolio") },
    goToExporter: () => setCurrentPage("exporter"),
    toggleAIChatbot: () => setIsAIChatOpen(prev => !prev),
    refreshData: () => useStockStore.getState().refreshPrices(),
  }))

  const getWatchlistStocks = useStockStore((s) => s.getWatchlistStocks)
  const getTopGainers = useStockStore((s) => s.getTopGainers)
  const getTopLosers = useStockStore((s) => s.getTopLosers)
  const addToWatchlist = useStockStore((s) => s.addToWatchlist)
  const removeFromWatchlist = useStockStore((s) => s.removeFromWatchlist)
  const lastUpdate = useStockStore((s) => s.lastUpdate)
  const dataSource = useStockStore((s) => s.dataSource)

  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [addStockInput, setAddStockInput] = useState("")
  const [dataSources, setDataSources] = useState<any>(null)
  const [predictionTab, setPredictionTab] = useState<"core" | "techs" | "ai">("core")
  const [apiSearchResults, setApiSearchResults] = useState<{ symbol: string; description: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false)
  const [enterprisePrediction, setEnterprisePrediction] = useState<any>(null)
  const finnhubKey = useSettingsStore((s) => s.apiKeys.finnhub)

  // Real-time API Symbol Search Effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 1 && finnhubKey) {
        setIsSearching(true)
        try {
          const results = await searchSymbols(searchQuery, finnhubKey)
          // Filter out crypto/indices if needed, or keep all
          setApiSearchResults(results.slice(0, 8).map(r => ({
            symbol: r.symbol,
            description: r.description
          })))
        } catch (err) {
          console.error("Search failed:", err)
        } finally {
          setIsSearching(false)
        }
      } else {
        setApiSearchResults([])
      }
    }, 400) // Debounce 400ms

    return () => clearTimeout(timer)
  }, [searchQuery, finnhubKey])

  // Generate AI Insight on mount
  useEffect(() => {
    if (stocks.length > 0 && !aiInsight) {
      generateMarketSummary(stocks, predictions)
        .then(setAiInsight)
        .catch(console.error)
    }
  }, [stocks.length])

  // Data Exporter State variables
  const [exportDataset, setExportDataset] = useState<"watchlist" | "all" | "gainers" | "losers" | "volatile">("watchlist")
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "json-packet">("csv")
  const [deepDiveSymbol, setDeepDiveSymbol] = useState<string>("")
  const [exportSearch, setExportSearch] = useState("")
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    symbol: true,
    name: true,
    price: true,
    changePercent: true,
    volume: true,
    marketCap: true,
    pe: true,
    recommendation: true,
    confidenceScore: true,
    rsi: true,
    riskLevel: true,
    trendDirection: false,
    open: false,
    high: false,
    low: false,
    eps: false,
  })

  // Helper to trigger file download
  const triggerDownload = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Convert array of objects to CSV
  const convertToCSV = (data: any[], fields: string[]) => {
    if (data.length === 0) return ""
    const headerRow = fields.map(f => `"${f.toUpperCase()}"`).join(",")
    const rows = data.map(item => 
      fields.map(f => {
        const val = item[f]
        if (val === undefined || val === null) return ""
        if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`
        return val
      }).join(",")
    )
    return [headerRow, ...rows].join("\n")
  }

  // Check URL params for stock detail view or section
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const symbol = params.get("symbol")
    if (symbol) setSelectedStock(symbol.toUpperCase())

    const section = params.get("section")
    if (section && ["dashboard", "watchlist", "exporter"].includes(section)) {
      setCurrentPage(section as DashboardSection)
    }

    const subTab = params.get("subTab")
    if (subTab && ["terminal", "portfolio", "radar"].includes(subTab)) {
      setActiveDashboardTab(subTab as any)
    }
  }, [])

  useEffect(() => {
    setDataSources(getDataSourceStatus())
  }, [])

  // Enterprise AI Analysis Effect
  useEffect(() => {
    if (selectedStock) {
      const stock = stocks.find(s => s.symbol === selectedStock)
      if (stock) {
        setIsAIAnalyzing(true)
        setEnterprisePrediction(null)
        getEnterprisePrediction(stock, predictions.get(selectedStock) || null)
          .then(res => {
            setEnterprisePrediction(res)
            setPredictionTab("ai") // Switch to AI tab when ready
          })
          .catch(err => console.error("AI Analysis failed:", err))
          .finally(() => setIsAIAnalyzing(false))
      }
    } else {
      setEnterprisePrediction(null)
      setPredictionTab("core")
    }
  }, [selectedStock, stocks])

  const watchlistStocks = useMemo(() => getWatchlistStocks(), [stocks, watchlist])
  const gainers = useMemo(() => getTopGainers(), [stocks])
  const losers = useMemo(() => getTopLosers(), [stocks])

  const marketSummary = useMemo(() => {
    if (stocks.length === 0) return { up: 0, down: 0, avgChange: 0, totalMcap: 0 }
    return {
      up: stocks.filter((s) => s.changePercent > 0).length,
      down: stocks.filter((s) => s.changePercent < 0).length,
      avgChange: stocks.reduce((s, st) => s + st.changePercent, 0) / stocks.length,
      totalMcap: stocks.reduce((s, st) => s + st.marketCap, 0),
    }
  }, [stocks])

  const sectorGroups = useMemo(() => {
    // 1. Group ALL loaded stocks by sector
    const groups: { [key: string]: any[] } = {}
    
    stocks.forEach(s => {
      const sec = (s.sector || "Other").toUpperCase()
      if (!groups[sec]) groups[sec] = []
      
      const pred = predictions.get(s.symbol)
      groups[sec].push({
        symbol: s.symbol,
        name: s.name,
        price: s.price,
        changePercent: s.changePercent,
        growth: pred?.momentumScore || (s.changePercent * 5), // Use momentum score if available
        marketCap: s.marketCap,
        riskLevel: pred?.riskLevel || "medium"
      })
    })

    // 2. Sort within sectors by a combination of Growth and Market Cap (Data Science weighting)
    Object.keys(groups).forEach(sec => {
      groups[sec].sort((a, b) => {
        // High growth stocks first, then weighted by size
        const scoreA = (a.growth * 0.7) + (Math.log10(a.marketCap || 1) * 0.3)
        const scoreB = (b.growth * 0.7) + (Math.log10(b.marketCap || 1) * 0.3)
        return scoreB - scoreA
      })
    })

    // 3. Return all sectors that have data, not just the hardcoded ones
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [stocks, predictions])

  const navigate = (page: string, subTab?: string) => {
    if (page === "notifications" || page === "settings") {
      window.location.href = `${page}.html`
      return
    }
    setCurrentPage(page as DashboardSection)
    setSelectedStock(null)
    if (subTab) {
      setActiveDashboardTab(subTab as any)
    }
  }

  const openStockDetail = (symbol: string) => {
    // If stock isn't in store, try to add it so we fetch real data
    if (!stocks.find(s => s.symbol === symbol)) {
      addToWatchlist(symbol)
    }
    setSelectedStock(symbol)
  }

  const handleAddStock = () => {
    const sym = addStockInput.trim().toUpperCase()
    if (sym && !watchlist.includes(sym)) {
      addToWatchlist(sym)
      setAddStockInput("")
    }
  }

  const activeExportData = useMemo(() => {
    let list = [...stocks]
    if (exportDataset === "watchlist") {
      list = getWatchlistStocks()
    } else if (exportDataset === "gainers") {
      list = getTopGainers()
    } else if (exportDataset === "losers") {
      list = getTopLosers()
    } else if (exportDataset === "volatile") {
      list = [...stocks].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    }

    if (exportSearch) {
      const q = exportSearch.toLowerCase()
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    }

    return list.map(stock => {
      const pred = predictions.get(stock.symbol)
      return {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        price: stock.price,
        change: stock.change,
        changePercent: stock.changePercent,
        open: stock.open,
        high: stock.high,
        low: stock.low,
        previousClose: stock.previousClose,
        marketCap: stock.marketCap,
        volume: stock.volume,
        avgVolume: stock.avgVolume,
        pe: stock.pe,
        eps: stock.eps,
        week52High: stock.week52High,
        week52Low: stock.week52Low,
        recommendation: pred?.recommendation || "N/A",
        confidenceScore: pred ? `${pred.confidenceScore}%` : "N/A",
        rsi: pred ? parseFloat(pred.rsi.toFixed(1)) : "N/A",
        riskLevel: pred?.riskLevel || "N/A",
        trendDirection: pred?.trendDirection || "N/A",
        upProbability: pred ? `${pred.upProbability}%` : "N/A",
        downProbability: pred ? `${pred.downProbability}%` : "N/A",
        volatilityIndex: pred ? parseFloat(pred.volatilityIndex.toFixed(2)) : "N/A",
        supportLevel: pred ? pred.supportLevel : "N/A",
        resistanceLevel: pred ? pred.resistanceLevel : "N/A",
      }
    })
  }, [stocks, predictions, watchlist, exportDataset, exportSearch])

  const handleExportExecute = () => {
    const fieldsToExport = Object.keys(selectedFields).filter(k => selectedFields[k])
    if (fieldsToExport.length === 0) return alert("Please select at least one field to export.")
    
    let content = ""
    let filename = `stockai_analysis_${exportDataset}_${Date.now()}`
    let mimeType = "text/plain"

    if (exportFormat === "csv") {
      content = convertToCSV(activeExportData, fieldsToExport)
      filename += ".csv"
      mimeType = "text/csv"
    } else if (exportFormat === "json") {
      const formatted = activeExportData.map(item => {
        const obj: any = {}
        fieldsToExport.forEach(f => {
          obj[f] = (item as any)[f]
        })
        return obj
      })
      content = JSON.stringify(formatted, null, 2)
      filename += ".json"
      mimeType = "application/json"
    } else {
      const symbols = activeExportData.map(s => s.symbol)
      const dataPacket = {
        meta: {
          generatedAt: new Date().toISOString(),
          dataset: exportDataset,
          totalRecords: symbols.length,
          environment: process.env.NODE_ENV || "development",
          version: "1.0.0",
        },
        payload: stocks.filter(s => symbols.includes(s.symbol)).map(s => {
          const pred = predictions.get(s.symbol)
          return {
            stockData: s,
            aiPrediction: pred || null
          }
        })
      }
      content = JSON.stringify(dataPacket, null, 2)
      filename += "_full_packet.json"
      mimeType = "application/json"
    }

    triggerDownload(content, filename, mimeType)
  }

  const handleDeepDiveExport = () => {
    const sym = deepDiveSymbol || (watchlistStocks[0]?.symbol || stocks[0]?.symbol)
    if (!sym) return alert("No active asset selected for Deep Dive.")
    
    const stock = stocks.find(s => s.symbol === sym)
    if (!stock) return alert("Asset not found.")

    const pred = predictions.get(sym)
    
    const deepDivePacket = {
      meta: {
        exportedAt: new Date().toISOString(),
        asset: sym,
        companyName: stock.name,
      },
      profile: {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        price: stock.price,
        change: stock.change,
        changePercent: stock.changePercent,
        pe: stock.pe,
        eps: stock.eps,
        marketCap: stock.marketCap,
        volume: stock.volume,
        avgVolume: stock.avgVolume,
      },
      aiModelForecast: pred || null,
      historicalQuotes90Days: stock.historicalData.slice(-90),
    }

    triggerDownload(
      JSON.stringify(deepDivePacket, null, 2),
      `stockai_deep_dive_${sym.toLowerCase()}_${Date.now()}.json`,
      "application/json"
    )
  }

  // If a stock is selected, show detail view
  if (selectedStock) {
    const stock = stocks.find((s) => s.symbol === selectedStock)
    const prediction = predictions.get(selectedStock)

    if (!stock) {
      return (
        <div className="min-h-screen bg-surface-950 text-surface-100">
          <Header currentPage="dashboard" activeSubTab={activeDashboardTab} onNavigate={navigate} />
          <div className="flex flex-col items-center justify-center h-[70vh]">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-black text-brand-400">AI</span>
              </div>
            </div>
            <div className="text-center mt-8 space-y-2">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">Initialising {selectedStock} Analysis</h3>
              <p className="text-xs text-surface-500 font-mono max-w-xs mx-auto">
                {isLoading ? "Synchronizing with Global Exchange nodes..." : "Directing AI Neural engines to analyze market depth and volatility..."}
              </p>
              <button onClick={() => setSelectedStock(null)} className="text-[10px] font-black text-brand-400 bg-brand-500/10 border border-brand-500/20 px-4 py-2 rounded-lg mt-6 hover:bg-brand-500/20 transition-all uppercase tracking-widest">
                Cancel Request
              </button>
            </div>
          </div>
        </div>
      )
    }

    const isUp = stock.changePercent >= 0
    const histData = stock.historicalData || []
    const timeframes = { "1M": 30, "6M": 180, "1Y": 365, "2Y": 730, "5Y": 1825, "ALL": histData.length }
    const chartData = histData.slice(-timeframes[chartTimeframe]).map((d) => ({
      date: d.date,
      price: d.close,
      volume: d.volume,
      high: d.high,
      low: d.low,
    }))


    return (
      <div className="min-h-screen bg-surface-950 text-surface-100">
        <Header currentPage="dashboard" activeSubTab={activeDashboardTab} onNavigate={navigate} />
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Back button + stock header */}
          <button onClick={() => setSelectedStock(null)} className="btn-ghost text-xs mb-4">
            ← Back to Dashboard
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-bold text-white font-display">{stock.symbol}</h2>
                <span className={`stat-badge ${isUp ? "stat-badge-gain" : "stat-badge-loss"}`}>
                  {isUp ? "▲" : "▼"} {formatPercent(stock.changePercent)}
                </span>
              </div>
              <p className="text-surface-400 text-sm">{stock.name} · {stock.sector}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-white">{formatCurrency(stock.price)}</div>
              <div className={`text-sm font-mono ${isUp ? "text-gain" : "text-loss"}`}>
                {isUp ? "+" : ""}{stock.change.toFixed(2)} ({formatPercent(stock.changePercent)})
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
            {[
              { label: "Open", value: formatCurrency(stock.open) },
              { label: "High", value: formatCurrency(stock.high) },
              { label: "Low", value: formatCurrency(stock.low) },
              { label: "Prev Close", value: formatCurrency(stock.previousClose) },
              { label: "Volume", value: formatLargeNumber(stock.volume) },
              { label: "Avg Volume", value: formatLargeNumber(stock.avgVolume) },
              { label: "Market Cap", value: formatLargeNumber(stock.marketCap) },
              { label: "P/E Ratio", value: stock.pe > 0 ? stock.pe.toFixed(1) : "N/A" },
              { label: "52W High", value: formatCurrency(stock.week52High) },
              { label: "52W Low", value: formatCurrency(stock.week52Low) },
              { label: "EPS", value: stock.eps ? formatCurrency(stock.eps) : "N/A" },
              { label: "Data", value: dataSource === "live" ? "🟢 Live" : "📦 Cached" },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-3">
                <div className="text-2xs text-surface-500 mb-1">{stat.label}</div>
                <div className="text-sm font-mono font-semibold text-white">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Chart + Prediction */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            {/* Price Chart */}
            <div className="xl:col-span-2 glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Price History ({chartTimeframe})</h3>
                <div className="flex gap-1 bg-surface-900 border border-white/[0.05] p-1 rounded-lg">
                  {(["1M", "6M", "1Y", "2Y", "5Y", "ALL"] as const).map(tf => (
                    <button
                      key={tf}
                      onClick={() => setChartTimeframe(tf)}
                      className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition-all ${
                        chartTimeframe === tf 
                          ? "bg-brand-500/20 text-brand-400 border border-brand-500/30" 
                          : "text-surface-500 hover:text-white hover:bg-white/[0.05]"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0} />
                      </linearGradient>
                      <filter id="shadow" height="200%">
                        <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor={isUp ? "#10b981" : "#ef4444"} floodOpacity={0.25} />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }} tickLine={false} axisLine={false} dy={8}
                      tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth()+1}/${d.getDate()}` }} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }} tickLine={false} axisLine={false} dx={-8}
                      tickFormatter={(v) => formatChartPrice(v)} />
                    <Tooltip 
                      contentStyle={{ background: "rgba(3,7,18,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11, fontWeight: 500, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
                      labelStyle={{ color: "#64748b", fontWeight: 600 }}
                      formatter={(v: number) => [formatCurrency(v), "Price"]} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={isUp ? "#10b981" : "#ef4444"} 
                      strokeWidth={3} 
                      fill="url(#priceGradient)" 
                      filter="url(#shadow)"
                      activeDot={{
                        r: 6,
                        stroke: isUp ? "#10b981" : "#ef4444",
                        strokeWidth: 2.5,
                        fill: "#030712",
                        filter: `drop-shadow(0 0 10px ${isUp ? "#10b981" : "#ef4444"}80)`
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-surface-500 text-sm">
                  No historical data available. Configure Yahoo Finance in settings.
                </div>
              )}
            </div>

            {/* AI Prediction Panel */}
            {prediction && (
              <div className="glass-card p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-4 font-display flex items-center gap-1.5">
                    <span className="text-brand-400">🤖</span> AI Analytics Forecast
                  </h3>
                  
                  {/* Confidence Gauge */}
                  <div className="flex justify-center mb-5">
                    <PredictionGauge value={prediction.confidenceScore} recommendation={prediction.recommendation} size={110} label="Model Conf." />
                  </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex bg-surface-950/60 border border-white/[0.04] p-1 rounded-xl mb-4 text-[10px] font-bold">
                  <button 
                    onClick={() => setPredictionTab("core")} 
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all duration-300 ${
                      predictionTab === "core" 
                        ? "bg-brand-500/20 text-white border border-brand-500/20 shadow-md shadow-brand-500/5" 
                        : "text-surface-400 hover:text-surface-200"
                    }`}
                  >
                    Core Forecast
                  </button>
                  <button 
                    onClick={() => setPredictionTab("techs")} 
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all duration-300 ${
                      predictionTab === "techs" 
                        ? "bg-brand-500/20 text-white border border-brand-500/20 shadow-md shadow-brand-500/5" 
                        : "text-surface-400 hover:text-surface-200"
                    }`}
                  >
                    Technical Indicators
                  </button>
                  <button 
                    onClick={() => setPredictionTab("ai")} 
                    disabled={isAIAnalyzing}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all duration-300 flex items-center justify-center gap-1 ${
                      predictionTab === "ai" 
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 shadow-md shadow-indigo-500/5" 
                        : "text-surface-400 hover:text-surface-200"
                    }`}
                  >
                    {isAIAnalyzing ? (
                      <div className="w-2.5 h-2.5 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                    ) : "✨ AI Insight"}
                  </button>
                </div>

                {/* Content based on selected tab */}
                <div className="space-y-2 h-[220px] overflow-y-auto no-scrollbar">
                  {predictionTab === "core" ? (
                    <>
                      <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-surface-950/40 border border-white/[0.03] hover:border-white/[0.06] transition-all">
                        <span className="text-surface-400 font-medium">Trend Sentiment</span>
                        <span className={`font-mono font-bold px-2.5 py-0.5 rounded-md border ${
                          prediction.trendDirection === "bullish" 
                            ? "text-gain bg-gain/10 border-gain/20 shadow-sm shadow-gain/5" 
                            : prediction.trendDirection === "bearish" 
                              ? "text-loss bg-loss/10 border-loss/20 shadow-sm shadow-loss/5" 
                              : "text-warning bg-warning/10 border-warning/20"
                        }`}>{prediction.trendDirection.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-surface-950/40 border border-white/[0.03] hover:border-white/[0.06] transition-all">
                        <span className="text-surface-400 font-medium">Upside Potential</span>
                        <span className="text-gain font-mono font-bold">{prediction.upProbability}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-surface-950/40 border border-white/[0.03] hover:border-white/[0.06] transition-all">
                        <span className="text-surface-400 font-medium">Downside Risk</span>
                        <span className="text-loss font-mono font-bold">{prediction.downProbability}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-surface-950/40 border border-white/[0.03] hover:border-white/[0.06] transition-all">
                        <span className="text-surface-400 font-medium">Risk Level</span>
                        <span className="font-extrabold px-2.5 py-0.5 rounded-md border" style={{ 
                          color: RISK_COLORS[prediction.riskLevel],
                          borderColor: `${RISK_COLORS[prediction.riskLevel]}30`,
                          backgroundColor: `${RISK_COLORS[prediction.riskLevel]}10`
                        }}>
                          {prediction.riskLevel.toUpperCase()}
                        </span>
                      </div>
                    </>
                  ) : predictionTab === "techs" ? (
                    <>
                      <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-surface-950/40 border border-white/[0.03] hover:border-white/[0.06] transition-all">
                        <span className="text-surface-400 font-medium">RSI (14)</span>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-md border ${
                          prediction.rsi > 70 
                            ? "text-loss bg-loss/10 border-loss/20 shadow-sm shadow-loss/5" 
                            : prediction.rsi < 30 
                              ? "text-gain bg-gain/10 border-gain/20 shadow-sm shadow-gain/5" 
                              : "text-surface-300 bg-white/[0.04] border-white/[0.04]"
                        }`}>{prediction.rsi.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-surface-950/40 border border-white/[0.03] hover:border-white/[0.06] transition-all">
                        <span className="text-surface-400 font-medium">MACD (12, 26)</span>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-md border ${
                          prediction.macd.histogram > 0 
                            ? "text-gain bg-gain/10 border-gain/20 shadow-sm shadow-gain/5" 
                            : "text-loss bg-loss/10 border-loss/20 shadow-sm shadow-loss/5"
                        }`}>{prediction.macd.value.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-surface-950/40 border border-white/[0.03] hover:border-white/[0.06] transition-all">
                        <span className="text-surface-400 font-medium">Support Bounds</span>
                        <span className="font-mono text-surface-200 font-bold">{formatCurrency(prediction.supportLevel)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-surface-950/40 border border-white/[0.03] hover:border-white/[0.06] transition-all">
                        <span className="text-surface-400 font-medium">Resistance Bounds</span>
                        <span className="font-mono text-surface-200 font-bold">{formatCurrency(prediction.resistanceLevel)}</span>
                      </div>
                      {prediction.bollingerBands && (
                        <div className="border-t border-white/[0.04] pt-2 mt-2">
                          <div className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5">Bollinger Bands</div>
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="text-surface-400 font-medium">Upper Band</span>
                            <span className="font-mono text-surface-200 font-bold">{formatCurrency(prediction.bollingerBands.upper)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-surface-400 font-medium">Lower Band</span>
                            <span className="font-mono text-surface-200 font-bold">{formatCurrency(prediction.bollingerBands.lower)}</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {enterprisePrediction ? (
                        <div className="space-y-3 animate-fadeIn">
                          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                            <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                              Quantum AI Intelligence Report
                            </div>
                            <p className="text-[11px] leading-relaxed text-surface-200 font-medium italic">
                              "{enterprisePrediction.aiAnalysis}"
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-surface-950/40 border border-white/[0.03]">
                              <div className="text-[10px] text-surface-500 font-bold uppercase mb-1">Target (1W)</div>
                              <div className="text-xs font-mono font-black text-gain">{formatCurrency(enterprisePrediction.priceTarget1W)}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-surface-950/40 border border-white/[0.03]">
                              <div className="text-[10px] text-surface-500 font-bold uppercase mb-1">Target (1M)</div>
                              <div className="text-xs font-mono font-black text-indigo-400">{formatCurrency(enterprisePrediction.priceTarget1M)}</div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                            <span className="text-surface-400 font-medium">AI Conviction</span>
                            <span className="text-indigo-400 font-mono font-black">{enterprisePrediction.confidenceScore}%</span>
                          </div>
                        </div>
                      ) : isAIAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                          <div className="relative">
                            <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[8px] font-black text-indigo-400">AI</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest text-center animate-pulse">
                            Processing Quantum Market Signals...
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-3 py-12 opacity-50">
                          <div className="w-8 h-8 rounded-full bg-surface-900 border border-white/5 flex items-center justify-center text-surface-600">✨</div>
                          <p className="text-[10px] text-surface-600 font-bold uppercase tracking-widest leading-tight text-center">AI analysis pending.<br/>Select another asset or wait.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Volume Chart */}
          {chartData.length > 0 && (
            <div className="glass-card p-5 mb-6">
              <h3 className="text-sm font-semibold text-white mb-4">Volume Analysis</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }} tickLine={false} axisLine={false} dy={8}
                    tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth()+1}/${d.getDate()}` }} />
                  <YAxis tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }} tickLine={false} axisLine={false} dx={-8}
                    tickFormatter={(v) => formatLargeNumber(v)} />
                  <Tooltip 
                    contentStyle={{ background: "rgba(3,7,18,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11, fontWeight: 500, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
                    labelStyle={{ color: "#64748b", fontWeight: 600 }}
                    formatter={(v: number) => [formatLargeNumber(v), "Volume"]} 
                  />
                  <Bar dataKey="volume" fill="url(#volumeGradient)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      <Header currentPage={currentPage} activeSubTab={activeDashboardTab} onNavigate={navigate} />

      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-12 h-12 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-surface-400">Connecting to market data sources...</p>
          </div>
        ) : currentPage === "watchlist" ? (
          /* ===== INSTITUTIONAL WISHLIST CONTROL CENTER (CRUD) ===== */
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-brand-400 to-indigo-600 shadow-glow-brand" />
                  <h2 className="text-2xl font-black text-white font-display tracking-tight">Wishlist Control Center</h2>
                </div>
                <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest font-mono">Permanent Asset Monitoring & CRUD Operations</p>
              </div>

              {/* Advanced Internal Search/Add Logic */}
              <div className="relative group/add w-full md:w-80">
                <input
                  type="text"
                  placeholder="Monitor New Asset (e.g. RELIANCE)..."
                  value={addStockInput}
                  onChange={(e) => setAddStockInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleAddStock()}
                  className="bg-surface-950/60 border border-white/[0.06] rounded-2xl py-2.5 pl-4 pr-12 text-xs font-bold text-white w-full focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-surface-600 uppercase tracking-widest"
                />
                <button 
                  onClick={handleAddStock}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-lg shadow-brand-500/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                </button>
              </div>
            </div>

            {/* Managed Watchlist Hub Table */}
            <div className="glass-card overflow-hidden border-white/[0.05]">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-950/40 text-[9px] font-black uppercase tracking-widest text-surface-500 border-b border-white/[0.03]">
                      <th className="px-6 py-4">Asset Matrix</th>
                      <th className="px-4 py-4">Live Quote</th>
                      <th className="px-4 py-4">Performance (24H)</th>
                      <th className="px-4 py-4">Sector Hub</th>
                      <th className="px-4 py-4 text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {watchlistStocks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-24 text-center">
                          <div className="max-w-xs mx-auto space-y-4">
                            <div className="w-16 h-16 bg-surface-900/50 rounded-3xl flex items-center justify-center mx-auto border border-white/[0.05] text-surface-700">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
                            </div>
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">No assets in workspace</h4>
                            <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest leading-relaxed">Add tickers above to begin real-time monitoring and AI signal generation.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      watchlistStocks.map((stock) => {
                        const isUp = stock.changePercent >= 0
                        return (
                          <tr key={stock.symbol} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4 cursor-pointer" onClick={() => openStockDetail(stock.symbol)}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-surface-900 border border-white/[0.05] flex items-center justify-center text-[10px] font-black text-white font-mono group-hover:border-brand-500/40 transition-all">
                                  {stock.symbol[0]}
                                </div>
                                <div>
                                  <div className="text-xs font-black text-white group-hover:text-brand-400 transition-colors uppercase font-display">{stock.symbol}</div>
                                  <div className="text-[9px] text-surface-500 font-bold uppercase truncate max-w-[150px]">{stock.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-xs font-mono font-black text-white">{formatCurrency(stock.price)}</div>
                              <div className="text-[9px] font-mono text-surface-500 font-bold">Vol: {formatLargeNumber(stock.volume)}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-black ${
                                isUp ? "text-gain bg-gain/5 border-gain/10" : "text-loss bg-loss/5 border-loss/10"
                              }`}>
                                {isUp ? "▲" : "▼"} {formatPercent(stock.changePercent)}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-[9px] font-black text-surface-400 uppercase tracking-widest bg-white/[0.03] px-2 py-1 rounded-md border border-white/[0.04]">
                                {stock.sector || "General"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <button 
                                  onClick={() => openStockDetail(stock.symbol)}
                                  className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-brand-500/50 text-surface-400 hover:text-white transition-all shadow-inner"
                                  title="View Detail Analytics"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeFromWatchlist(stock.symbol)
                                  }}
                                  className="p-2 rounded-xl bg-loss/5 hover:bg-loss/20 text-loss/50 hover:text-loss transition-all border border-loss/10 hover:border-loss/40 shadow-inner"
                                  title="Delete Permanent Object"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : currentPage === "exporter" ? (
          /* ===== DATA EXPORTER & ANALYSIS WORKSPACE ===== */
          <div className="space-y-6 animate-fadeIn">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950/40 via-indigo-950/20 to-surface-950 border border-white/[0.05] p-6 sm:p-8 shadow-xl">
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-3xs font-extrabold uppercase tracking-widest mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                    Quant Workspace
                  </div>
                  <h2 className="text-3xl font-black text-white font-display tracking-tight leading-none mb-3">
                    Quantum <span className="gradient-text bg-gradient-to-r from-brand-400 via-indigo-400 to-purple-400">Data Exporter</span>
                  </h2>
                  <p className="text-xs text-surface-400 max-w-xl leading-relaxed">
                    Filter, customize, and export high-fidelity stock models, real-time predictions, technical oscillators, and market ticks. Perfect for analysis in Jupyter, Excel, or custom algorithmic trading sheets.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <div className="glass-card px-4 py-3 text-center border-white/[0.04] bg-white/[0.01]">
                    <div className="text-[9px] font-bold text-surface-500 uppercase tracking-widest mb-1 leading-none">STOCKS LOADED</div>
                    <div className="text-lg font-extrabold text-white leading-none font-mono">{stocks.length}</div>
                  </div>
                  <div className="glass-card px-4 py-3 text-center border-white/[0.04] bg-white/[0.01]">
                    <div className="text-[9px] font-bold text-surface-500 uppercase tracking-widest mb-1 leading-none">WATCHLIST</div>
                    <div className="text-lg font-extrabold text-white leading-none font-mono">{watchlist.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Export Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Config Panel */}
              <div className="glass-card p-6 flex flex-col justify-between border-white/[0.05] h-fit">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3.5 font-display flex items-center gap-1.5">
                      <span className="text-brand-400 text-sm">📁</span> 1. Select Dataset Source
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-2xs font-semibold">
                      {[
                        { id: "watchlist", label: "My Watchlist", count: watchlist.length },
                        { id: "all", label: "All Assets", count: stocks.length },
                        { id: "gainers", label: "Top Gainers", count: getTopGainers().length },
                        { id: "losers", label: "Top Losers", count: getTopLosers().length },
                        { id: "volatile", label: "High Volatility", count: stocks.length },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setExportDataset(item.id as any)}
                          className={`p-2.5 rounded-xl border text-left transition-all duration-300 ${
                            exportDataset === item.id
                              ? "bg-brand-500/10 border-brand-500/35 text-white shadow-md shadow-brand-500/5 font-extrabold scale-[1.01]"
                              : "bg-surface-950/40 border-white/[0.03] text-surface-400 hover:text-surface-200 hover:border-white/[0.08]"
                          }`}
                        >
                          <div className="truncate mb-0.5">{item.label}</div>
                          <div className="text-[9px] text-surface-500 font-mono font-medium">{item.count} items</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3 font-display flex items-center gap-1.5">
                      <span className="text-brand-400 text-sm">📊</span> 2. Customize Columns
                    </h3>
                    <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1 no-scrollbar border-b border-white/[0.04] pb-4">
                      {/* Price Metrics */}
                      <div>
                        <div className="text-[9px] font-bold text-surface-500 uppercase tracking-widest mb-1.5 leading-none">PRICES & PERFORMANCE</div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "symbol", label: "Symbol" },
                            { id: "name", label: "Name" },
                            { id: "price", label: "Price" },
                            { id: "changePercent", label: "Change %" },
                            { id: "open", label: "Open" },
                            { id: "high", label: "High" },
                            { id: "low", label: "Low" },
                          ].map((f) => (
                            <label key={f.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
                              selectedFields[f.id] 
                                ? "bg-white/[0.03] border-brand-500/30 text-white" 
                                : "bg-transparent border-transparent text-surface-500 hover:text-surface-300"
                            }`}>
                              <input
                                type="checkbox"
                                checked={selectedFields[f.id]}
                                onChange={(e) => setSelectedFields({ ...selectedFields, [f.id]: e.target.checked })}
                                className="hidden"
                              />
                              <span className={`w-1.5 h-1.5 rounded-full ${selectedFields[f.id] ? "bg-brand-400 animate-pulse" : "bg-surface-800"}`} />
                              <span className="text-2xs font-semibold">{f.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Technical & AI Metrics */}
                      <div>
                        <div className="text-[9px] font-bold text-surface-500 uppercase tracking-widest mb-1.5 leading-none">AI & TECHNICAL SIGNALS</div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "recommendation", label: "AI Rec" },
                            { id: "confidenceScore", label: "Confidence" },
                            { id: "rsi", label: "RSI" },
                            { id: "riskLevel", label: "Risk Level" },
                            { id: "trendDirection", label: "Trend Dir." },
                            { id: "pe", label: "P/E Ratio" },
                            { id: "eps", label: "EPS" },
                            { id: "volume", label: "Volume" },
                            { id: "marketCap", label: "Market Cap" },
                          ].map((f) => (
                            <label key={f.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
                              selectedFields[f.id] 
                                ? "bg-white/[0.03] border-brand-500/30 text-white" 
                                : "bg-transparent border-transparent text-surface-500 hover:text-surface-300"
                            }`}>
                              <input
                                type="checkbox"
                                checked={selectedFields[f.id]}
                                onChange={(e) => setSelectedFields({ ...selectedFields, [f.id]: e.target.checked })}
                                className="hidden"
                              />
                              <span className={`w-1.5 h-1.5 rounded-full ${selectedFields[f.id] ? "bg-brand-400 animate-pulse" : "bg-surface-800"}`} />
                              <span className="text-2xs font-semibold">{f.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3.5 font-display flex items-center gap-1.5">
                      <span className="text-brand-400 text-sm">💾</span> 3. Select Format
                    </h3>
                    <div className="flex bg-surface-950/60 border border-white/[0.04] p-1 rounded-xl text-[10px] font-bold">
                      {[
                        { id: "csv", label: "CSV File" },
                        { id: "json", label: "JSON Array" },
                        { id: "json-packet", label: "Full API Packet" },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => setExportFormat(fmt.id as any)}
                          className={`flex-1 py-2 rounded-lg text-center transition-all duration-300 ${
                            exportFormat === fmt.id
                              ? "bg-brand-500/20 text-white border border-brand-500/20 shadow-md shadow-brand-500/5 font-extrabold"
                              : "text-surface-400 hover:text-surface-200"
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/[0.04] mt-6 space-y-2.5">
                  <button 
                    onClick={handleExportExecute}
                    className="btn-primary w-full text-xs py-3 flex items-center justify-center gap-2"
                  >
                    <span>📥</span> Compile & Export Dataset
                  </button>
                  <button 
                    onClick={() => {
                      const fields = Object.keys(selectedFields).filter(k => selectedFields[k])
                      let raw = ""
                      if (exportFormat === "csv") {
                        raw = convertToCSV(activeExportData, fields)
                      } else if (exportFormat === "json") {
                        const formatted = activeExportData.map(item => {
                          const obj: any = {}
                          fields.forEach(f => { obj[f] = (item as any)[f] })
                          return obj
                        })
                        raw = JSON.stringify(formatted, null, 2)
                      } else {
                        raw = JSON.stringify(activeExportData, null, 2)
                      }
                      navigator.clipboard.writeText(raw)
                      alert("Successfully copied custom dataset payload to clipboard!")
                    }}
                    className="btn-secondary w-full text-xs py-3 flex items-center justify-center gap-2 hover:bg-white/[0.04]"
                  >
                    <span>📋</span> Copy Payload to Clipboard
                  </button>
                </div>
              </div>

              {/* Right Preview Panel */}
              <div className="xl:col-span-2 space-y-6">
                <div className="glass-card p-6 border-white/[0.05] h-full flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider leading-none mb-1 font-display">
                          Live Dataset Preview
                        </h3>
                        <p className="text-[9px] font-bold text-surface-500 uppercase tracking-widest leading-none">
                          Showing {activeExportData.length} records matching parameters
                        </p>
                      </div>
                      <div className="relative w-full sm:w-64">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <input
                          type="text"
                          placeholder="Quick search preview..."
                          value={exportSearch}
                          onChange={(e) => setExportSearch(e.target.value)}
                          className="input-dark pl-8 py-1.5 text-2xs"
                        />
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="overflow-x-auto no-scrollbar border border-white/[0.04] rounded-2xl max-h-[360px]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-950/60 border-b border-white/[0.04] text-[9px] font-bold uppercase tracking-widest text-surface-400">
                            {Object.keys(selectedFields).filter(f => selectedFields[f]).map(field => (
                              <th key={field} className="px-4 py-3 font-mono font-bold">{field}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02] text-2xs">
                          {activeExportData.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center text-surface-500">
                                No stocks found matching criteria.
                              </td>
                            </tr>
                          ) : (
                            activeExportData.map((row: any, rIdx) => (
                              <tr key={row.symbol || rIdx} className="hover:bg-white/[0.02] transition-colors">
                                {Object.keys(selectedFields).filter(f => selectedFields[f]).map((field, fIdx) => {
                                  const val = row[field]
                                  const isGain = field === "changePercent" && parseFloat(row.changePercent) >= 0
                                  const isLoss = field === "changePercent" && parseFloat(row.changePercent) < 0
                                  return (
                                    <td key={field} className={`px-4 py-2.5 font-mono font-medium ${
                                      fIdx === 0 ? "text-white font-bold" : "text-surface-300"
                                    }`}>
                                      {field === "changePercent" ? (
                                        <span className={`font-bold px-1.5 py-0.5 rounded border text-[9px] ${
                                          isGain ? "text-gain bg-gain/10 border-gain/20" : "text-loss bg-loss/10 border-loss/20"
                                        }`}>
                                          {parseFloat(val) >= 0 ? "+" : ""}{val}%
                                        </span>
                                      ) : field === "price" || field === "open" || field === "high" || field === "low" || field === "previousClose" || field === "supportLevel" || field === "resistanceLevel" ? (
                                        typeof val === "number" ? formatCurrency(val) : val
                                      ) : field === "volume" || field === "marketCap" || field === "avgVolume" ? (
                                        typeof val === "number" ? formatLargeNumber(val) : val
                                      ) : field === "recommendation" ? (
                                        <span className="font-bold px-1.5 py-0.5 rounded border text-[9px] uppercase" style={{
                                          color: RECOMMENDATION_COLORS[val.replace("-", "_") as any] || "#a78bfa",
                                          borderColor: `${RECOMMENDATION_COLORS[val.replace("-", "_") as any] || "#a78bfa"}30`,
                                          backgroundColor: `${RECOMMENDATION_COLORS[val.replace("-", "_") as any] || "#a78bfa"}10`,
                                        }}>
                                          {val}
                                        </span>
                                      ) : field === "riskLevel" ? (
                                        <span className="font-bold px-1.5 py-0.5 rounded border text-[9px] uppercase" style={{
                                          color: RISK_COLORS[val] || "#a78bfa",
                                          borderColor: `${RISK_COLORS[val] || "#a78bfa"}30`,
                                          backgroundColor: `${RISK_COLORS[val] || "#a78bfa"}10`,
                                        }}>
                                          {val}
                                        </span>
                                      ) : (
                                        val
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Size Stat Indicator */}
                  <div className="pt-4 border-t border-white/[0.04] mt-4 flex items-center justify-between text-[10px] text-surface-500 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                      <span>Ready for compiler parsing</span>
                    </div>
                    <div className="font-mono">
                      Estimated Output Size: ~{(activeExportData.length * Object.keys(selectedFields).filter(f => selectedFields[f]).length * 0.05).toFixed(2)} KB
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* deep dive asset historical exporter */}
            <div className="glass-card p-6 border-white/[0.05]">
              <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4 font-display flex items-center gap-1.5">
                <span className="text-brand-400 text-sm">📈</span> Deep Dive: Single Stock Historical & Indicator Packet
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="text-2xs font-medium text-surface-400 mb-1.5 block">Select Asset profile</label>
                  <select
                    value={deepDiveSymbol}
                    onChange={(e) => setDeepDiveSymbol(e.target.value)}
                    className="input-dark text-xs"
                  >
                    <option value="">-- Choose Stock --</option>
                    {stocks.map(s => (
                      <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleDeepDiveExport}
                  className="btn-secondary text-xs py-2.5 px-6 flex items-center justify-center gap-2 hover:bg-brand-500/10 hover:border-brand-500/20 hover:text-white"
                >
                  <span>📥</span> Download Full 90-Day Tick & Tech Data Packet
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ===== MAIN DASHBOARD VIEW (TRADEX AI ADVANCED QUANT WORKSPACE) ===== */
          <div className="space-y-6 animate-fadeIn">
            
            {/* Real-Time Sliding Ticker Banner & Precision Monitor */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 overflow-hidden bg-surface-950/80 border border-white/[0.04] rounded-2xl py-2 px-4 shadow-inner">
                <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-surface-950 to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface-950 to-transparent z-10 pointer-events-none" />
                
                <div className="flex animate-ticker whitespace-nowrap gap-8 text-[10px] font-mono font-extrabold uppercase items-center">
                  {stocks.concat(stocks).slice(0, 40).map((s, idx) => {
                    const isUp = s.changePercent >= 0
                    return (
                      <div 
                        key={`${s.symbol}-${idx}`} 
                        onClick={() => openStockDetail(s.symbol)}
                        className="inline-flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors"
                      >
                        <span className="text-white font-bold">{s.symbol}</span>
                        <span className="text-surface-400">{formatCurrency(s.price)}</span>
                        <span className={`px-1 rounded border text-[9px] ${isUp ? "text-gain bg-gain/10 border-gain/20" : "text-loss bg-loss/10 border-loss/20"}`}>
                          {isUp ? "▲" : "▼"} {formatPercent(s.changePercent)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Advanced System Health Monitor */}
              <div className="glass-card px-4 py-2 flex items-center gap-4 border-brand-500/10 min-w-fit">
                <div className="flex flex-col justify-center">
                  <div className="text-[8px] font-black text-surface-500 uppercase tracking-widest leading-none mb-1">Precision Monitor</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black text-gain">99.9%</span>
                    <div className="flex gap-0.5">
                      {["F", "A", "Y", "G"].map((api, i) => (
                        <div 
                          key={api} 
                          title={`${api} Bridge Active`}
                          className={`w-1.5 h-1.5 rounded-full ${i < 3 ? "bg-gain animate-pulse" : "bg-brand-500"}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="h-6 w-px bg-white/[0.05]" />
                <div className="flex flex-col justify-center">
                  <div className="text-[8px] font-black text-surface-500 uppercase tracking-widest leading-none mb-1">Latency</div>
                  <div className="text-[10px] font-mono font-black text-white">24ms</div>
                </div>
              </div>
            </div>

            {/* Sub-tab Navigation Switcher */}
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-1">
              <div className="flex bg-surface-950/60 p-1 rounded-xl border border-white/[0.04] text-xs font-bold font-display">
                {[
                  { id: "terminal", label: "📟 Terminal V1.0", desc: "Heatmap & Correlations" },
                  { id: "portfolio", label: "💼 Portfolio & Risk", desc: "Equity & Asset Allocation" },
                  { id: "radar", label: "🤖 AI Predictive Radar", desc: "Advanced Technicals" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDashboardTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                      activeDashboardTab === tab.id
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20 font-black scale-[1.01]"
                        : "text-surface-400 hover:text-surface-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="text-2xs text-surface-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse" />
                <span>AI Engine Connected — Feed Live</span>
              </div>
            </div>

            {/* Tab 1: Terminal V1.0 - Heatmap, Rotations & Correlations */}
            {activeDashboardTab === "terminal" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fadeIn">
                
                {/* Left Heatmap Panel */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="glass-card p-6 border-white/[0.05]">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">Global Market Treemap</h3>
                        <p className="text-[10px] text-surface-500 uppercase tracking-widest font-mono">Weighted by Growth | Top 6 per Sector</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Institutional Search Interface with Real-time API Lookup */}
                        <div className="relative group/search">
                          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-surface-500 group-focus-within/search:text-brand-400 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input 
                            type="text"
                            placeholder="Find Global Shares (e.g. Kotak, Tesla)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-surface-950/80 border border-white/[0.04] rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold text-white w-72 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-surface-600 uppercase tracking-widest"
                          />
                          
                          {/* Advanced Result Dropdown (Mirroring Institutional Platforms) */}
                          <AnimatePresence>
                            {(searchQuery.length > 0) && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 mt-2 max-h-80 overflow-y-auto z-[100] glass-card border-white/[0.08] shadow-2xl no-scrollbar overflow-hidden rounded-2xl bg-[#030712]/95 backdrop-blur-xl"
                              >
                                {/* Local Workspace Results */}
                                {stocks
                                  .filter(s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                  .slice(0, 3)
                                  .map(s => (
                                    <div 
                                      key={`local-${s.symbol}`}
                                      onClick={() => { openStockDetail(s.symbol); setSearchQuery("") }}
                                      className="p-3 hover:bg-white/[0.03] transition-colors cursor-pointer border-b border-white/[0.02] flex items-center justify-between group"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center text-[10px] font-black text-brand-400 font-mono">
                                          {s.symbol[0]}
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-black text-white font-mono group-hover:text-brand-400 flex items-center gap-1.5">
                                            {s.symbol} <span className="text-[7px] bg-white/[0.05] px-1 rounded text-surface-500 uppercase">Synced</span>
                                          </div>
                                          <div className="text-[9px] text-surface-500 truncate max-w-[150px] uppercase font-bold">{s.name}</div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-[10px] font-mono font-black text-white">{formatCurrency(s.price)}</div>
                                      </div>
                                    </div>
                                  ))}

                                {/* Global Market Results (via Search API) */}
                                {apiSearchResults.map((res) => (
                                  <div 
                                    key={`api-${res.symbol}`}
                                    className="p-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.02] flex items-center justify-between group"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="w-7 h-7 rounded-lg bg-surface-900 flex items-center justify-center text-[10px] font-black text-surface-500 font-mono">
                                        {res.symbol[0]}
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-black text-white font-mono group-hover:text-brand-400">{res.symbol}</div>
                                        <div className="text-[9px] text-surface-500 truncate max-w-[150px] uppercase font-bold">{res.description}</div>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        addToWatchlist(res.symbol)
                                        setSearchQuery("")
                                        openStockDetail(res.symbol)
                                      }}
                                      className="ml-4 px-3 py-1.5 rounded-lg bg-brand-600/90 hover:bg-brand-500 text-white text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                      + Monitor
                                    </button>
                                  </div>
                                ))}

                                {isSearching ? (
                                  <div className="p-4 text-center">
                                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <span className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Scanning Global Exchanges...</span>
                                  </div>
                                ) : (searchQuery.length > 2 && apiSearchResults.length === 0 && stocks.filter(s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) ? (
                                  <div className="p-6 text-center">
                                    <p className="text-[10px] text-surface-600 font-bold mb-3">NO ASSETS FOUND IN LIVE ENGINE</p>
                                    <button 
                                      onClick={() => { addToWatchlist(searchQuery.trim().toUpperCase()); setSearchQuery("") }}
                                      className="text-[9px] font-black text-brand-400 hover:text-brand-300 underline uppercase tracking-widest"
                                    >
                                      Force Add {searchQuery.toUpperCase()} to Vault
                                    </button>
                                  </div>
                                ) : null}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-gain/10 border border-gain/20 text-gain">Gains</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-loss/10 border border-loss/20 text-loss">Losses</span>
                        </div>
                      </div>
                    </div>

                    {/* Treemap Dynamic Sector Card Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {sectorGroups.slice(0, 9).map(([sector, sectorStocks]) => {
                        const sectorAvg = sectorStocks.reduce((sum, s) => sum + s.changePercent, 0) / sectorStocks.length
                        const isSectorUp = sectorAvg >= 0
                        
                        return (
                          <div 
                            key={sector} 
                            className="glass-card mesh-bg-premium p-4 border border-white/[0.05] bg-[#0b1326]/40 hover:border-brand-500/30 transition-all flex flex-col justify-between rounded-3xl group/card shadow-2xl relative overflow-hidden h-fit"
                          >
                            {/* Sector Background Glow */}
                            <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-20 pointer-events-none rounded-full ${
                              isSectorUp ? "bg-gain" : "bg-loss"
                            }`} />

                            <div className="flex justify-between items-center mb-4 relative z-10">
                              <div className="flex items-center gap-2.5">
                                <span className={`pulse-indicator ${isSectorUp ? "text-gain" : "text-loss"}`}>
                                  <span className={`ping ${isSectorUp ? "bg-gain" : "bg-loss"}`} />
                                  <span className={`dot ${isSectorUp ? "bg-gain" : "bg-loss"}`} />
                                </span>
                                <h4 className="text-[11px] font-black text-white uppercase tracking-[0.15em] leading-none font-display">
                                  {sector}
                                </h4>
                              </div>
                              <div className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full border ${
                                isSectorUp ? "text-gain bg-gain/5 border-gain/20 cyber-glow-gain" : "text-loss bg-loss/5 border-loss/20 cyber-glow-loss"
                              }`}>
                                {isSectorUp ? "▲" : "▼"} {Math.abs(sectorAvg).toFixed(2)}% AVG
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2.5 relative z-10">
                              {sectorStocks.slice(0, 6).map(s => {
                                const isUp = s.changePercent >= 0
                                // Generate a stable mock sparkline for seeded stocks or real for loaded ones
                                const sparkData = s.historicalData && s.historicalData.length > 0 
                                  ? s.historicalData.slice(-10).map(d => d.close)
                                  : [s.price * 0.98, s.price * 0.99, s.price * 0.97, s.price * 1.01, s.price * 1.0, s.price]
                                
                                return (
                                  <div 
                                    key={s.symbol}
                                    onClick={() => openStockDetail(s.symbol)}
                                    className={`rounded-2xl p-3 flex flex-col justify-between cursor-pointer border relative overflow-hidden group/tile transition-all duration-500 ${
                                      isUp 
                                        ? "bg-gain-muted/40 border-gain/10 hover:border-gain/40 hover:shadow-gain/20 shadow-xl" 
                                        : "bg-loss-muted/40 border-loss/10 hover:border-loss/40 hover:shadow-loss/20 shadow-xl"
                                    }`}
                                  >
                                    {/* Inline Sparkline Background */}
                                    <div className="absolute inset-0 opacity-20 pointer-events-none mt-6 group-hover/tile:opacity-40 transition-opacity">
                                      <SparklineChart 
                                        data={sparkData} 
                                        height={45} 
                                        positive={isUp} 
                                        color={isUp ? "var(--color-gain)" : "var(--color-loss)"}
                                      />
                                    </div>

                                    <div className="flex justify-between items-center mb-3 relative z-10">
                                      <span className="text-xs font-black text-white font-mono tracking-tight group-hover/tile:text-brand-400 transition-colors uppercase">{s.symbol}</span>
                                      <div className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                                        s.growth >= 0 ? "text-gain bg-gain/10" : "text-loss bg-loss/10"
                                      }`}>
                                        {s.growth >= 0 ? "+" : ""}{parseFloat(s.growth).toFixed(1)} <span className="text-[7px] opacity-60">MOM</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-end relative z-10 mt-1">
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-white font-mono font-black tracking-tighter">
                                          {formatCurrency(s.price)}
                                        </span>
                                        <span className={`text-[8px] font-mono font-bold ${isUp ? "text-gain" : "text-loss"}`}>
                                          {isUp ? "▲" : "▼"} {Math.abs(s.changePercent).toFixed(2)}%
                                        </span>
                                      </div>
                                      {s.riskLevel === "very-high" && (
                                        <span className="w-1 h-1 rounded-full bg-loss animate-ping mb-1" title="Extreme Volatility Detected" />
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            {sectorStocks.length > 6 && (
                              <div className="mt-3 text-center">
                                <button className="text-[8px] font-black text-surface-500 uppercase tracking-widest hover:text-white transition-colors">
                                  + {sectorStocks.length - 6} more assets in database
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Correlations & Sector Rotation Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sector Rotation */}
                    <div className="glass-card p-5 border-white/[0.05]">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 font-display flex items-center justify-between">
                        <span>📊 Sector Rotation Momentum</span>
                        <span className="text-[9px] font-mono text-surface-500">24H CYCLE</span>
                      </h4>
                      <div className="space-y-3.5">
                        {[
                          { sector: "Technology", momentum: 4.2, color: "#06b6d4" },
                          { sector: "Communication", momentum: 2.1, color: "#8b5cf6" },
                          { sector: "Healthcare", momentum: 0.3, color: "#06b6d4" },
                          { sector: "Financials", momentum: -1.4, color: "#ff5451" },
                          { sector: "Energy", momentum: -2.8, color: "#ff5451" },
                        ].map((sec) => (
                          <div key={sec.sector} className="space-y-1">
                            <div className="flex justify-between text-2xs font-semibold">
                              <span className="text-surface-300">{sec.sector}</span>
                              <span className="font-mono font-bold" style={{ color: sec.color }}>
                                {sec.momentum > 0 ? "+" : ""}{sec.momentum}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-950/60 rounded-full overflow-hidden border border-white/[0.02]">
                              <div 
                                className="h-full rounded-full" 
                                style={{ 
                                  width: `${Math.abs(sec.momentum) * 15}%`, 
                                  backgroundColor: sec.color,
                                  boxShadow: `0 0 10px ${sec.color}40`
                                }} 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Correlation Matrix */}
                    <div className="glass-card p-5 border-white/[0.05]">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 font-display flex items-center justify-between">
                        <span>🔄 Asset Correlations (R)</span>
                        <span className="text-[9px] font-mono text-surface-500">PEARSON COEFFICIENT</span>
                      </h4>
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-center border-collapse text-2xs font-mono font-bold">
                          <thead>
                            <tr className="text-surface-500 border-b border-white/[0.04]">
                              <th className="pb-2 text-left">ASSET</th>
                              <th className="pb-2">BTC</th>
                              <th className="pb-2">GOLD</th>
                              <th className="pb-2">SPY</th>
                              <th className="pb-2">DXY</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { asset: "BTC", values: [1.0, 0.3, 0.6, -0.4] },
                              { asset: "GOLD", values: [0.3, 1.0, 0.1, -0.7] },
                              { asset: "SPY", values: [0.6, 0.1, 1.0, -0.2] },
                              { asset: "DXY", values: [-0.4, -0.7, -0.2, 1.0] },
                            ].map((row) => (
                              <tr key={row.asset} className="border-b border-white/[0.02] last:border-0">
                                <td className="py-2.5 text-left font-bold text-white">{row.asset}</td>
                                {row.values.map((v, vIdx) => {
                                  const opacityVal = Math.abs(v)
                                  const isPos = v >= 0
                                  return (
                                    <td 
                                      key={vIdx} 
                                      className="py-2 px-1 text-center font-bold"
                                      style={{
                                        color: isPos ? "#06b6d4" : "#ff5451",
                                        backgroundColor: isPos ? `rgba(6, 182, 212, ${opacityVal * 0.12})` : `rgba(255, 84, 81, ${opacityVal * 0.12})`
                                      }}
                                    >
                                      {v.toFixed(1)}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right NLP AI Insights column */}
                <div className="space-y-6">
                  <div className="glass-card p-6 border-white/[0.05] h-full flex flex-col justify-between bg-gradient-to-b from-surface-950 to-brand-950/20">
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-3 border-b border-white/[0.04]">
                        <span className="text-xl">🧬</span>
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider font-display leading-none mb-1">Quantum Intelligence Hub</h4>
                          <span className="text-[8px] font-bold text-brand-400 tracking-widest uppercase font-mono">Statistical Analysis Active</span>
                        </div>
                      </div>

                      {/* AI Market Insight Report */}
                      <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/10 space-y-3">
                        <div className="flex justify-between items-center mb-1">
                          <h5 className="text-[9px] font-black text-white uppercase tracking-widest">AI Intelligence Briefing</h5>
                          <button 
                            onClick={async () => {
                              setAiInsight(null)
                              const insight = await generateMarketSummary(stocks, predictions)
                              setAiInsight(insight)
                            }}
                            className="text-[8px] font-bold text-brand-400 hover:text-white transition-colors"
                          >
                            REFRESH 
                          </button>
                        </div>
                        
                        {!aiInsight ? (
                          <div className="space-y-2 py-2">
                            <div className="h-2 w-full bg-surface-800 rounded animate-pulse" />
                            <div className="h-2 w-3/4 bg-surface-800 rounded animate-pulse" />
                            <div className="h-2 w-5/6 bg-surface-800 rounded animate-pulse" />
                          </div>
                        ) : (
                          <div className="text-[11px] text-surface-200 leading-relaxed font-medium">
                            <p className="mb-2 italic border-l-2 border-brand-500 pl-3 py-0.5">
                              {aiInsight.split('\n')[0]}
                            </p>
                            <div className="text-[10px] text-surface-400 space-y-1">
                              {aiInsight.split('\n').slice(1, 4).map((line, i) => (
                                <div key={i} className="flex gap-2">
                                  <span className="text-brand-500">•</span>
                                  <span>{line.replace(/^[-*]\s*/, '')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2 grid grid-cols-2 gap-2">
                          <div className="p-1.5 rounded-lg bg-surface-950/40 border border-white/[0.03] text-center">
                            <div className="text-[8px] text-surface-500 font-bold uppercase mb-0.5">Confidence</div>
                            <div className="text-xs font-mono font-black text-brand-400">92.4%</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-surface-950/40 border border-white/[0.03] text-center">
                            <div className="text-[8px] text-surface-500 font-bold uppercase mb-0.5">Focus Mode</div>
                            <div className="text-xs font-mono font-black text-white">Aggressive</div>
                          </div>
                        </div>
                      </div>

                      {/* Real-time Dynamic Signals */}
                      <div className="space-y-4">
                        {stocks.slice(0, 3).map((s, idx) => {
                          const pred = predictions.get(s.symbol)
                          if (!pred) return null
                          
                          return (
                            <div key={s.symbol} className="p-3.5 rounded-xl border border-white/[0.03] bg-surface-950/40 hover:border-brand-500/20 transition-all duration-300">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white font-mono">{s.symbol}</span>
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    pred.recommendation.includes("buy") ? "bg-gain/10 text-gain border border-gain/20 shadow-sm shadow-gain/10" : "bg-brand-500/10 text-brand-300 border border-brand-500/20"
                                  }`}>
                                    {pred.recommendation.replace("-", " ")}
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono text-surface-500">Live Tick</span>
                              </div>
                              <p className="text-2xs text-surface-400 leading-relaxed mb-2.5">
                                {pred.trendDirection === "bullish" 
                                  ? `Strong bullish regime detected. Volatility-adjusted upside target: ${formatCurrency(pred.resistanceLevel)}.`
                                  : `Market regime: ${pred.trendDirection.toUpperCase()}. Consolidation likely between ${formatCurrency(pred.supportLevel)} and ${formatCurrency(pred.resistanceLevel)}.`}
                              </p>
                              <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider font-mono text-surface-500 border-t border-white/[0.02] pt-2">
                                <span>Signal Confidence</span>
                                <span className="text-white">{pred.confidenceScore}%</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <button 
                      onClick={() => alert("Global Market Scanner Initializing... Processing 60,000+ assets across 84 exchanges.")}
                      className="btn-primary w-full text-xs py-3 mt-6 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/15"
                    >
                      <span>📡</span> Run Global Market Scanner
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Portfolio & Risk Suite — Live Intelligence Integration */}
            {activeDashboardTab === "portfolio" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Real Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  {[
                    { label: "Total Equity", value: formatCurrency(portfolioSummary.currentValue), highlight: "text-white", sub: "MARKET VALUE", subColor: "text-surface-500" },
                    { 
                      label: "Total Return", 
                      value: `${portfolioSummary.totalProfitLoss >= 0 ? "+" : ""}${formatCurrency(portfolioSummary.totalProfitLoss)}`, 
                      highlight: portfolioSummary.totalProfitLoss >= 0 ? "text-gain" : "text-loss", 
                      sub: `${(portfolioSummary.totalProfitLossPercent ?? 0).toFixed(2)}% ALL TIME`, 
                      subColor: portfolioSummary.totalProfitLoss >= 0 ? "text-gain" : "text-loss" 
                    },
                    { label: "Day P&L", value: formatCurrency(portfolioSummary.dayChange), highlight: portfolioSummary.dayChange >= 0 ? "text-gain" : "text-loss", sub: "UNREALIZED", subColor: "text-surface-500" },
                    { label: "Cash (Est)", value: formatCurrency(portfolioSummary.currentValue * 0.12), highlight: "text-brand-300", sub: "LIQUID ASSETS", subColor: "text-surface-500" },
                    { label: "Positions", value: portfolio.length.toString(), highlight: "text-white", sub: "DIVERSIFIED", subColor: "text-surface-400" },
                    { label: "Risk Score", value: "0.82 β", highlight: "text-white", sub: "DEFENSIVE", subColor: "text-gain" },
                  ].map((stat, idx) => (
                    <div key={idx} className="glass-card p-4 border-white/[0.04] bg-white/[0.01]">
                      <div className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5 leading-none">{stat.label}</div>
                      <div className={`text-xl font-extrabold font-mono leading-none mb-1.5 ${stat.highlight}`}>{stat.value}</div>
                      <div className={`text-[8px] font-extrabold uppercase tracking-wider font-mono ${stat.subColor}`}>{stat.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Real-time Positions Table */}
                  <div className="xl:col-span-2 glass-card p-0 border-white/[0.05] overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-white/[0.04] bg-white/[0.01] flex justify-between items-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">Equity Positions</h3>
                      <button 
                        onClick={async () => {
                          const insight = await generateMarketSummary(stocks, predictions)
                          setAiInsight(insight)
                          setIsAIChatOpen(true)
                        }}
                        className="text-[9px] font-bold text-brand-400 hover:text-white transition-colors uppercase tracking-widest"
                      >
                        Run AI Portfolio Audit
                      </button>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-950/40 text-[9px] font-black uppercase tracking-widest text-surface-500 border-b border-white/[0.03]">
                            <th className="px-6 py-3">Asset</th>
                            <th className="px-4 py-3">Price</th>
                            <th className="px-4 py-3">Holding</th>
                            <th className="px-4 py-3">P/L (Total)</th>
                            <th className="px-4 py-3 text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {portfolio.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-surface-500 text-xs font-bold uppercase">
                                No active positions in vault.
                              </td>
                            </tr>
                          ) : (
                            portfolio.map((pos) => (
                              <tr key={pos.symbol} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => openStockDetail(pos.symbol)}>
                                <td className="px-6 py-3.5">
                                  <div className="text-xs font-black text-white group-hover:text-brand-400 transition-colors uppercase">{pos.symbol}</div>
                                  <div className="text-[9px] text-surface-500 font-bold uppercase truncate max-w-[120px]">{pos.sector}</div>
                                </td>
                                <td className="px-4 py-3.5 text-xs font-mono font-bold text-surface-200">
                                  {formatCurrency(pos.currentPrice)}
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="text-xs font-mono font-bold text-white">{pos.quantity ?? pos.shares}</div>
                                  <div className="text-[9px] text-surface-500">at {formatCurrency(pos.avgBuyPrice ?? pos.avgPrice)}</div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className={`text-xs font-mono font-black ${pos.profitLoss >= 0 ? "text-gain" : "text-loss"}`}>
                                    {pos.profitLoss >= 0 ? "+" : ""}{(pos.profitLossPercent ?? 0).toFixed(2)}%
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono font-black text-white text-xs">
                                  {formatCurrency((pos.quantity ?? pos.shares ?? 0) * pos.currentPrice)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Dynamic Sector Allocation */}
                  <div className="glass-card p-6 border-white/[0.05]">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-6 font-display">Sector Exposure</h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sectorAllocation || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {(sectorAllocation || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ff5451", "#ec4899"][index % 6]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-6 space-y-2.5">
                      {sectorAllocation.length === 0 ? (
                        <div className="text-[10px] text-center text-surface-600 uppercase font-black">Awaiting Vault Data</div>
                      ) : (
                        sectorAllocation.map((sec, i) => (
                          <div key={i} className="flex justify-between items-center text-[10px] font-bold">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sec.color }} />
                              <span className="text-surface-400 uppercase tracking-widest">{sec.sector}</span>
                            </div>
                            <span className="text-white font-mono">{sec.percent.toFixed(1)}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Predictive Radar - Standard AI Signals & Managed Watchlist */}
            {activeDashboardTab === "radar" && (
              <div className="space-y-6 animate-fadeIn">
                {/* AI Predictions Grid */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-brand-400 to-brand-700" />
                    <h2 className="text-lg font-extrabold text-white font-display tracking-tight flex items-center gap-2">
                      <span>🤖</span> AI Predictive Signals
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {watchlistStocks.slice(0, 8).map((stock) => {
                      const pred = predictions.get(stock.symbol)
                      if (!pred) return null
                      const isUp = stock.changePercent >= 0
                      return (
                        <div key={stock.symbol} className="glass-card-hover p-4 cursor-pointer" onClick={() => openStockDetail(stock.symbol)}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="text-sm font-bold text-white font-mono">{stock.symbol}</div>
                              <div className="text-2xs text-surface-500 truncate max-w-[120px]">{stock.name}</div>
                            </div>
                            <PredictionGauge value={pred.confidenceScore} recommendation={pred.recommendation} size={60} />
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-mono font-bold text-white">{formatCurrency(stock.price)}</span>
                            <span className={`text-xs font-mono font-semibold ${isUp ? "text-gain" : "text-loss"}`}>
                              {formatPercent(stock.changePercent)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-2xs border-t border-white/[0.04] pt-2 mt-2">
                            <div className="flex justify-between">
                              <span className="text-surface-500">RSI (14)</span>
                              <span className="text-surface-300 font-mono font-bold">{pred.rsi}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-surface-500">Risk Level</span>
                              <span className="font-bold" style={{ color: RISK_COLORS[pred.riskLevel] }}>{pred.riskLevel}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-surface-500">Upside %</span>
                              <span className="text-gain font-mono font-bold">{pred.upProbability}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-surface-500">Downside %</span>
                              <span className="text-loss font-mono font-bold">{pred.downProbability}%</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Watchlist Quick View */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-brand-400 to-brand-700" />
                      <h2 className="text-lg font-extrabold text-white font-display tracking-tight flex items-center gap-2">
                        <span>👁️</span> Managed Watchlist
                      </h2>
                    </div>
                    <button onClick={() => setCurrentPage("watchlist")} className="btn-ghost text-xs">View All Watchlist →</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {watchlistStocks.slice(0, 8).map((stock) => (
                      <StockCard key={stock.symbol} symbol={stock.symbol} onSelect={openStockDetail} />
                    ))}
                  </div>
                </div>

                {/* Managed Wishlist Table (CRUD) */}
                <div className="glass-card overflow-hidden border-white/[0.05]">
                  <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-surface-950/20">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">Permanently Monitored Wishlist</h3>
                    <span className="text-[10px] font-mono font-bold text-surface-500 uppercase tracking-widest">{watchlistStocks.length} Assets Tracked</span>
                  </div>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-950/40 text-[9px] font-black uppercase tracking-widest text-surface-500 border-b border-white/[0.03]">
                          <th className="px-6 py-3">Asset</th>
                          <th className="px-4 py-3">Price & Delta</th>
                          <th className="px-4 py-3">Alpha Signals</th>
                          <th className="px-4 py-3">Risk Assessment</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {watchlistStocks.map((stock) => {
                          const pred = predictions.get(stock.symbol)
                          const isUp = stock.changePercent >= 0
                          return (
                            <tr key={stock.symbol} className="hover:bg-white/[0.03] transition-colors group">
                              <td className="px-6 py-4 cursor-pointer" onClick={() => openStockDetail(stock.symbol)}>
                                <div className="text-xs font-black text-white group-hover:text-brand-400 transition-colors uppercase">{stock.symbol}</div>
                                <div className="text-[9px] text-surface-500 font-bold uppercase truncate max-w-[150px]">{stock.name}</div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-xs font-mono font-black text-white">{formatCurrency(stock.price)}</div>
                                <div className={`text-[9px] font-mono font-bold ${isUp ? "text-gain" : "text-loss"}`}>
                                  {isUp ? "▲" : "▼"} {formatPercent(stock.changePercent)}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-surface-600 uppercase font-black">Recommendation</span>
                                    <span className="text-[10px] font-black uppercase" style={{ color: RECOMMENDATION_COLORS[pred?.recommendation || "hold"] }}>
                                      {pred?.recommendation || "Analyzing..."}
                                    </span>
                                  </div>
                                  <div className="h-6 w-px bg-white/[0.05]" />
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-surface-600 uppercase font-black">Bull Edge</span>
                                    <span className="text-[10px] font-mono font-black text-gain">{pred?.upProbability || 0}%</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                                  pred?.riskLevel === "low" ? "text-gain bg-gain/5 border-gain/10" :
                                  pred?.riskLevel === "high" || pred?.riskLevel === "very-high" ? "text-loss bg-loss/5 border-loss/10" :
                                  "text-warning bg-warning/5 border-warning/10"
                                }`}>
                                  {pred?.riskLevel || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => openStockDetail(stock.symbol)}
                                    className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-surface-400 hover:text-white transition-all shadow-inner"
                                    title="View Deep Dive"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeFromWatchlist(stock.symbol)
                                    }}
                                    className="p-2 rounded-lg bg-loss/5 hover:bg-loss/20 text-loss/60 hover:text-loss transition-all border border-loss/10 hover:border-loss/30"
                                    title="Remove from Monitoring"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        {watchlistStocks.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-surface-900 rounded-full flex items-center justify-center mb-4 text-surface-700">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <h4 className="text-xs font-black text-surface-500 uppercase tracking-widest mb-1">Your monitor is empty</h4>
                                <p className="text-[9px] text-surface-600 font-bold uppercase">Search and add global assets to start analyzing</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* AI Intelligence Components */}
      <AIChatbot isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
      
      {/* Floating AI Bubble Toggle */}
      {!isAIChatOpen && (
        <button
          onClick={() => setIsAIChatOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-2xl bg-brand-600/90 hover:bg-brand-500 text-white flex items-center justify-center shadow-2xl shadow-brand-500/40 border border-brand-400/30 transition-all duration-300 hover:scale-110 group z-50"
        >
          <span className="text-xl group-hover:animate-pulse">🤖</span>
          <div className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-surface-900 border border-white/[0.08] text-[10px] font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest">
            AI Assistant (Ctrl+J)
          </div>
        </button>
      )}
    </div>
  )
}

export default DashboardPage
