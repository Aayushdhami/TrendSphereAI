/**
 * AI Chatbot Panel — Floating AI assistant powered by Gemini
 * Provides stock analysis, market insights, and portfolio advice
 */
import React, { useState, useRef, useEffect, useMemo } from "react"
import { useStockStore } from "~src/store/stockStore"
import { usePortfolioStore } from "~src/store/portfolioStore"
import { chatWithAI, analyzeStock, reviewPortfolio, aiScreenStocks, generateMarketSummary, isAIConfigured } from "~src/services/geminiService"
import type { AIChatMessage, Stock, Prediction } from "~src/types"
import { generateId } from "~src/utils/helpers"
import { AreaChart, Area, ResponsiveContainer, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts"

interface AIChatbotProps {
  isOpen: boolean
  onClose: () => void
  initialSymbol?: string
}

const QUICK_COMMANDS = [
  { label: "📊 Market Summary", prompt: "Give me a quick market summary of all tracked stocks" },
  { label: "🏆 Top Picks", prompt: "What are the best stocks to buy right now from my watchlist?" },
  { label: "⚠️ Risk Check", prompt: "Which stocks in my portfolio have the highest risk?" },
  { label: "📈 Bullish Signals", prompt: "Show me stocks with strong bullish signals" },
  { label: "🔍 Screen Value", prompt: "Screen for undervalued stocks with low P/E and strong momentum" },
  { label: "💼 Review Portfolio", prompt: "/portfolio" },
]

const AIChatbot: React.FC<AIChatbotProps> = ({ isOpen, onClose, initialSymbol }) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: "system-welcome",
      role: "assistant",
      content: "👋 **Welcome to TradexAI Assistant!**\n\nI can help you with:\n- 📊 Stock analysis & recommendations\n- 💼 Portfolio review & rebalancing\n- 📈 Market trend analysis\n- 🔍 Stock screening\n- 📉 Technical indicator explanations\n\nTry asking me about a specific stock or use the quick commands below!",
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [showCommands, setShowCommands] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const stocks = useStockStore((s) => s.stocks)
  const predictions = useStockStore((s) => s.predictions)
  const positions = usePortfolioStore((s) => s.positions)

  useEffect(() => {
    isAIConfigured().then(setIsConfigured)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  useEffect(() => {
    if (initialSymbol && isOpen) {
      handleSend(`Analyze ${initialSymbol} stock in detail`)
    }
  }, [initialSymbol, isOpen])

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input.trim()
    if (!text || isTyping) return

    setInput("")
    setShowCommands(false)

    const userMsg: AIChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    }

    const loadingMsg: AIChatMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isLoading: true,
    }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setIsTyping(true)

    try {
      let response: string

      // Special commands
      if (text.startsWith("/portfolio")) {
        response = await reviewPortfolio(positions, stocks, predictions)
      } else if (text.startsWith("/market")) {
        response = await generateMarketSummary(stocks, predictions)
      } else if (text.startsWith("/screen ")) {
        const criteria = text.replace("/screen ", "")
        response = await aiScreenStocks(stocks, predictions, criteria)
      } else if (text.toLowerCase().startsWith("analyze ")) {
        const symbolMatch = text.match(/analyze\s+([A-Za-z]+)/i)
        if (symbolMatch) {
          const sym = symbolMatch[1].toUpperCase()
          const stock = stocks.find(s => s.symbol === sym)
          if (stock) {
            const pred = predictions.get(sym) || null
            response = await analyzeStock(stock, pred, stock.historicalData)
          } else {
            response = `❌ **${sym}** is not in your tracked stocks. Add it to your watchlist first, then ask me to analyze it.`
          }
        } else {
          response = await chatWithAI([...messages, userMsg], { stocks, predictions })
        }
      } else {
        response = await chatWithAI([...messages, userMsg], { stocks, predictions })
      }

      const assistantMsg: AIChatMessage = {
        id: generateId(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
        metadata: { model: "llama-3.3-70b-versatile" },
      }

      setMessages(prev => [...prev.slice(0, -1), assistantMsg])
    } catch (err) {
      const errorMsg: AIChatMessage = {
        id: generateId(),
        role: "assistant",
        content: `⚠️ **Error:** ${(err as Error).message}\n\nMake sure your Groq API key is configured in Settings → AI Configuration.`,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev.slice(0, -1), errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    setMessages([{
      id: "system-welcome",
      role: "assistant",
      content: "🔄 Chat cleared. How can I help you?",
      timestamp: Date.now(),
    }])
    setShowCommands(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-6 right-6 z-[999] w-[420px] h-[600px] flex flex-col rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/[0.06] animate-slide-up"
      style={{ background: "linear-gradient(180deg, #0a1128 0%, #060e20 100%)" }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between border-b border-white/[0.04] bg-gradient-to-r from-brand-950/40 to-surface-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30 border border-white/[0.1]">
            <span className="text-white text-sm font-black">AI</span>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-tight leading-none mb-0.5">TradexAI Assistant</h3>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isConfigured ? "bg-gain animate-pulse" : "bg-warning"}`} />
              <span className="text-[9px] font-bold text-surface-500 uppercase tracking-wider">
                {isConfigured ? "Groq Connected" : "API Key Required"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearChat} className="p-2 rounded-xl hover:bg-white/[0.04] text-surface-500 hover:text-surface-300 transition-all" title="Clear Chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.04] text-surface-500 hover:text-white transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
              msg.role === "user"
                ? "bg-brand-600/80 text-white rounded-br-md"
                : "bg-white/[0.03] border border-white/[0.04] text-surface-200 rounded-bl-md"
            }`}>
              {msg.isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-surface-500 text-[10px]">Analyzing...</span>
                </div>
              ) : (
                <div className="ai-message-content whitespace-pre-wrap break-words">
                  {formatMarkdown(msg.content, stocks, predictions)}
                </div>
              )}
              {msg.metadata?.model && (
                <div className="mt-2 pt-1.5 border-t border-white/[0.04] text-[8px] text-surface-600 font-mono uppercase tracking-wider">
                  via {msg.metadata.model}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Commands */}
      {showCommands && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd.label}
                onClick={() => handleSend(cmd.prompt)}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.04] text-[10px] font-semibold text-surface-400 hover:text-white hover:bg-brand-500/10 hover:border-brand-500/20 transition-all"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <div className="relative flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={isConfigured ? "Ask TradexAI anything..." : "Configure API key in Settings..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConfigured || isTyping}
            className="flex-1 px-4 py-3 rounded-2xl text-xs bg-surface-950/80 border border-white/[0.06] text-white placeholder:text-surface-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50 disabled:opacity-50 transition-all"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping || !isConfigured}
            className="p-3 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 disabled:opacity-40 disabled:shadow-none transition-all active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="m22 2-11 11" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/** Enhanced markdown formatter for chat messages */
function formatMarkdown(text: string, stocks: Stock[], predictions: Map<string, Prediction>): React.ReactNode {
  const parts: React.ReactNode[] = []
  const lines = text.split("\n")

  let inCodeBlock = false
  let codeBlockContent: string[] = []

  lines.forEach((line, lineIdx) => {
    // Handle Code Blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        parts.push(
          <pre key={`code-${lineIdx}`} className="bg-surface-950/80 border border-white/[0.06] p-2 rounded-lg text-[10px] font-mono text-surface-200 overflow-x-auto my-2 shadow-inner shadow-black/50">
            <code>{codeBlockContent.join("\n")}</code>
          </pre>
        )
        inCodeBlock = false
        codeBlockContent = []
      } else {
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      return
    }

    // Inline formatting: **bold**
    const renderInline = (str: string, keyPrefix: string) => {
      const segs: React.ReactNode[] = []
      let remaining = str
      let segIdx = 0

      while (remaining.includes("**")) {
        const start = remaining.indexOf("**")
        if (start > 0) segs.push(<span key={`${keyPrefix}-${segIdx++}`}>{remaining.slice(0, start)}</span>)
        remaining = remaining.slice(start + 2)
        const end = remaining.indexOf("**")
        if (end === -1) {
          segs.push(<span key={`${keyPrefix}-${segIdx++}`}>**{remaining}</span>)
          remaining = ""
          break
        }
        segs.push(
          <span key={`${keyPrefix}-${segIdx++}`} className="font-bold text-white">{remaining.slice(0, end)}</span>
        )
        remaining = remaining.slice(end + 2)
      }

      if (remaining) segs.push(<span key={`${keyPrefix}-${segIdx++}`}>{remaining}</span>)
      return segs
    }

    const trimmed = line.trimStart()

    // Empty line
    if (line.trim() === "") {
      parts.push(<div key={`l${lineIdx}`} className="h-2" />)
    } 
    // Headers
    else if (trimmed.startsWith("### ")) {
      parts.push(<h4 key={`l${lineIdx}`} className="text-white font-bold mt-4 mb-1.5 text-xs">{renderInline(trimmed.slice(4), `l${lineIdx}`)}</h4>)
    } 
    else if (trimmed.startsWith("## ")) {
      parts.push(<h3 key={`l${lineIdx}`} className="text-brand-400 font-extrabold mt-5 mb-2 text-sm">{renderInline(trimmed.slice(3), `l${lineIdx}`)}</h3>)
    } 
    else if (trimmed.startsWith("# ")) {
      parts.push(<h2 key={`l${lineIdx}`} className="text-brand-500 font-black mt-5 mb-2 text-base uppercase tracking-tight">{renderInline(trimmed.slice(2), `l${lineIdx}`)}</h2>)
    }
    // Bullet points
    else if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      parts.push(
        <div key={`l${lineIdx}`} className="flex gap-2 ml-2 mt-1">
          <span className="text-brand-400 flex-shrink-0">•</span>
          <span>{renderInline(trimmed.slice(2), `l${lineIdx}`)}</span>
        </div>
      )
    } 
    // Numbered lists
    else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.)\s(.*)/)
      parts.push(
        <div key={`l${lineIdx}`} className="flex gap-2 ml-2 mt-1">
          <span className="text-brand-400 font-bold flex-shrink-0">{match?.[1]}</span>
          <span>{renderInline(match?.[2] || "", `l${lineIdx}`)}</span>
        </div>
      )
    }
    // Custom Chart Widget integration
    else if (trimmed.match(/\[CHART:\s*([A-Za-z]+)\]/i)) {
      const match = trimmed.match(/\[CHART:\s*([A-Za-z]+)\]/i)
      const symbol = match?.[1].toUpperCase()
      const stock = stocks.find((s) => s.symbol === symbol)
      
      if (stock && stock.historicalData?.length > 0) {
        const chartData = stock.historicalData.slice(-30).map(d => ({ date: d.date, price: d.close }))
        const isUp = stock.changePercent >= 0
        const pred = predictions.get(symbol)
        
        parts.push(
          <div key={`chart-${lineIdx}`} className="my-4 bg-gradient-to-b from-surface-900 to-surface-950 border border-white/[0.08] rounded-2xl p-4 shadow-2xl shadow-black/80 relative overflow-hidden group">
            {/* Background Glow */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[50px] opacity-10 pointer-events-none ${isUp ? 'bg-gain' : 'bg-loss'}`} />
            
            {/* Header */}
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-white text-sm tracking-tight">{stock.symbol}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.1] text-[8px] font-bold text-surface-400 uppercase tracking-widest">{stock.sector}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-mono font-black text-white">${stock.price.toFixed(2)}</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isUp ? 'text-gain bg-gain/10 border border-gain/20' : 'text-loss bg-loss/10 border border-loss/20'}`}>
                    {isUp ? '↑' : '↓'} {Math.abs(stock.change).toFixed(2)} ({stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
              
              {/* Prediction Ribbon */}
              {pred && (
                <div className="text-right">
                  <div className="text-[8px] font-bold text-surface-500 uppercase tracking-widest mb-0.5">AI Signal</div>
                  <div className={`text-[10px] font-black uppercase tracking-wider ${pred.trendDirection === 'bullish' ? 'text-gain' : pred.trendDirection === 'bearish' ? 'text-loss' : 'text-warning'}`}>
                    {pred.recommendation}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <div className="w-12 h-1 bg-surface-800 rounded-full overflow-hidden">
                      <div className={`h-full opacity-80 ${pred.trendDirection === 'bullish' ? 'bg-gain' : pred.trendDirection === 'bearish' ? 'bg-loss' : 'bg-warning'}`} style={{ width: `${pred.confidenceScore}%` }} />
                    </div>
                    <span className="text-[8px] font-mono font-bold text-surface-400">{pred.confidenceScore}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Premium Chart */}
            <div className="h-[90px] w-full mt-2 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`gradient-${lineIdx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.0} />
                    </linearGradient>
                    <filter id={`glow-${lineIdx}`} x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#060e20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }} 
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }} 
                    labelStyle={{ color: '#94a3b8', display: 'none' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={isUp ? "#10b981" : "#ef4444"} 
                    strokeWidth={2.5} 
                    fillOpacity={1}
                    fill={`url(#gradient-${lineIdx})`}
                    filter={`url(#glow-${lineIdx})`}
                    activeDot={{ r: 4, strokeWidth: 0, fill: "#fff", filter: `drop-shadow(0 0 4px ${isUp ? '#10b981' : '#ef4444'})` }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Support / Resistance Footer */}
            {pred && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.04] text-[9px] relative z-10">
                <div className="flex flex-col">
                  <span className="text-surface-500 font-bold tracking-widest uppercase mb-0.5">Support</span>
                  <span className="font-mono font-bold text-surface-300">${pred.supportLevel.toFixed(2)}</span>
                </div>
                <div className="h-4 w-px bg-white/[0.05]" />
                <div className="flex flex-col text-center">
                  <span className="text-surface-500 font-bold tracking-widest uppercase mb-0.5">RSI 14</span>
                  <span className={`font-mono font-bold ${pred.rsi > 70 ? 'text-loss' : pred.rsi < 30 ? 'text-gain' : 'text-surface-300'}`}>{pred.rsi.toFixed(1)}</span>
                </div>
                <div className="h-4 w-px bg-white/[0.05]" />
                <div className="flex flex-col text-right">
                  <span className="text-surface-500 font-bold tracking-widest uppercase mb-0.5">Resist</span>
                  <span className="font-mono font-bold text-surface-300">${pred.resistanceLevel.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )
      } else {
        parts.push(
          <div key={`l${lineIdx}`} className="my-2 p-2 bg-surface-900 border border-surface-800 rounded-lg text-surface-500 text-[10px] italic">
            [Chart data unvailable for {symbol}]
          </div>
        )
      }
    }
    // Radar Intelligence Diagram
    else if (trimmed.match(/\[RADAR:\s*([A-Za-z]+)\]/i)) {
      const match = trimmed.match(/\[RADAR:\s*([A-Za-z]+)\]/i)
      const symbol = match?.[1].toUpperCase()
      const pred = predictions.get(symbol)
      
      if (pred) {
        parts.push(
          <div key={`radar-${lineIdx}`} className="my-4 bg-gradient-to-b from-surface-900 to-surface-950 border border-white/[0.08] rounded-2xl p-4 shadow-xl shadow-black/50 relative">
            <h4 className="text-white font-bold text-xs text-center uppercase tracking-widest"><span className="text-indigo-400">{symbol}</span> Intelligence Vector</h4>
            <div className="h-[180px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                  { subject: 'Momentum', A: pred.momentumScore || 65, fullMark: 100 },
                  { subject: 'Technicals', A: pred.rsi || 50, fullMark: 100 },
                  { subject: 'Volatility', A: Math.min(pred.volatilityIndex * 100 || 60, 100), fullMark: 100 },
                  { subject: 'Confidence', A: pred.confidenceScore || 80, fullMark: 100 },
                  { subject: 'Safety', A: pred.riskLevel === 'low' ? 90 : pred.riskLevel === 'medium' ? 50 : 20, fullMark: 100 },
                ]}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                  <Radar name={symbol} dataKey="A" stroke="#818cf8" fill="#6366f1" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[9px] text-surface-500 text-center mt-2 font-mono">Live multi-factor AI scoring</div>
          </div>
        )
      }
    }
    // Actionable Trading Button
    else if (trimmed.match(/\[ACTION:\s*(BUY|SELL|HOLD)\s*,\s*([A-Za-z]+)\]/i)) {
       const match = trimmed.match(/\[ACTION:\s*(BUY|SELL|HOLD)\s*,\s*([A-Za-z]+)\]/i)
       const action = match?.[1].toUpperCase()
       const symbol = match?.[2].toUpperCase()
       
       const isBuy = action === 'BUY'
       const colorClass = isBuy ? 'bg-gain/20 text-gain border-gain/30 hover:bg-gain/30 shadow-gain/20' : action === 'SELL' ? 'bg-loss/20 text-loss border-loss/30 hover:bg-loss/30 shadow-loss/20' : 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/30 shadow-warning/20'
       
       parts.push(
         <div key={`action-${lineIdx}`} className="my-3 p-3 rounded-xl border border-white/[0.04] bg-surface-950/80 flex items-center justify-between shadow-lg">
            <div>
              <div className="text-[9px] text-surface-500 font-bold uppercase tracking-widest mb-0.5">Automated Trade Execution</div>
              <div className="text-white font-bold text-sm tracking-tight">{symbol}</div>
            </div>
            <button className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase border transition-all hover:-translate-y-0.5 shadow-lg ${colorClass}`}>
              {action} {symbol}
            </button>
         </div>
       )
    }
    // Normal Text
    else {
      parts.push(<div key={`l${lineIdx}`} className="mt-1">{renderInline(line, `l${lineIdx}`)}</div>)
    }
  })

  // Close any unclosed code block safely
  if (inCodeBlock && codeBlockContent.length > 0) {
    parts.push(
      <pre key="code-end" className="bg-surface-950/80 border border-white/[0.06] p-2 rounded-lg text-[10px] font-mono text-surface-200 overflow-x-auto my-2">
        <code>{codeBlockContent.join("\n")}</code>
      </pre>
    )
  }

  return <>{parts}</>
}

export default React.memo(AIChatbot)
