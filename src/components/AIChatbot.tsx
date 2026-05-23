/**
 * AI Chatbot Panel — Floating AI assistant powered by Gemini
 * Provides stock analysis, market insights, and portfolio advice
 */
import React, { useState, useRef, useEffect, useMemo } from "react"
import { useStockStore } from "~src/store/stockStore"
import { usePortfolioStore } from "~src/store/portfolioStore"
import { chatWithAI, analyzeStock, reviewPortfolio, aiScreenStocks, generateMarketSummary, isGeminiConfigured } from "~src/services/geminiService"
import type { AIChatMessage } from "~src/types"
import { generateId } from "~src/utils/helpers"

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
    isGeminiConfigured().then(setIsConfigured)
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
        metadata: { model: "gemini-2.0-flash" },
      }

      setMessages(prev => [...prev.slice(0, -1), assistantMsg])
    } catch (err) {
      const errorMsg: AIChatMessage = {
        id: generateId(),
        role: "assistant",
        content: `⚠️ **Error:** ${(err as Error).message}\n\nMake sure your Gemini API key is configured in Settings → AI Configuration.`,
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
                {isConfigured ? "Gemini Connected" : "API Key Required"}
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
                  {formatMarkdown(msg.content)}
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

/** Simple markdown formatter for chat messages */
function formatMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const lines = text.split("\n")

  lines.forEach((line, lineIdx) => {
    // Bold: **text**
    const segments: React.ReactNode[] = []
    let remaining = line
    let segIdx = 0

    while (remaining.includes("**")) {
      const start = remaining.indexOf("**")
      if (start > 0) {
        segments.push(<span key={`s${lineIdx}-${segIdx++}`}>{remaining.slice(0, start)}</span>)
      }
      remaining = remaining.slice(start + 2)
      const end = remaining.indexOf("**")
      if (end === -1) {
        segments.push(<span key={`s${lineIdx}-${segIdx++}`}>**{remaining}</span>)
        remaining = ""
        break
      }
      segments.push(
        <span key={`s${lineIdx}-${segIdx++}`} className="font-bold text-white">{remaining.slice(0, end)}</span>
      )
      remaining = remaining.slice(end + 2)
    }

    if (remaining) {
      segments.push(<span key={`s${lineIdx}-${segIdx++}`}>{remaining}</span>)
    }

    // Bullet points
    if (line.trimStart().startsWith("- ") || line.trimStart().startsWith("• ")) {
      parts.push(
        <div key={`l${lineIdx}`} className="flex gap-2 ml-2">
          <span className="text-brand-400 flex-shrink-0">•</span>
          <span>{segments}</span>
        </div>
      )
    } else if (line.trim() === "") {
      parts.push(<div key={`l${lineIdx}`} className="h-2" />)
    } else {
      parts.push(<div key={`l${lineIdx}`}>{segments}</div>)
    }
  })

  return <>{parts}</>
}

export default React.memo(AIChatbot)
