/**
 * TradexAI AI Service — Production Grade OpenRouter Integration
 * FIXED: Verified free model names + reduced retry storm
 */

import { Key } from "~node_modules/lucide-react/dist/lucide-react";
import type {
  AIChatMessage,
  Stock,
  Prediction,
  PortfolioPosition,
  HistoricalDataPoint,
} from "~src/types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// ==================== CONFIGURATION ====================
const MODEL_CONFIG = {
  PRIMARY: "llama-3.3-70b-versatile", // Specific Groq model as requested
} as const;

const DEFAULT_TEMPERATURE = 0.35;
const DEFAULT_MAX_TOKENS = 2048;

// ==================== CACHE TTL ====================
const CACHE_TTL = {
  STOCK_ANALYSIS: 300000,   // 5 min
  MARKET_SUMMARY: 120000,   // 2 min
  PORTFOLIO_REVIEW: 600000, // 10 min
  PREDICTION: 180000,       // 3 min
  CHAT: 60000,              // 1 min
  GENERAL: 60000,
} as const;

// ==================== SYSTEM INSTRUCTIONS ====================

const SYSTEM_INSTRUCTIONS = {
  STOCK_ANALYST: `You are TradexAI, an elite quantitative stock market analyst AI built into a professional trading terminal browser extension. 
You provide institutional-grade market analysis, technical insights, and investment intelligence.
RULES:
- Always be data-driven and cite specific numbers
- Give clear BUY/SELL/HOLD recommendations with confidence levels
- Mention risk factors and downside scenarios
- Use professional financial terminology
- Keep responses concise but comprehensive (200-400 words max)
- Format with markdown: use **bold** for key metrics, bullet points for lists
- Never provide guaranteed predictions — always mention uncertainty
- Include support/resistance levels when analyzing stocks
- Mention relevant technical indicators (RSI, MACD, Bollinger Bands)`,

  PORTFOLIO_ADVISOR: `You are TradexAI Portfolio Advisor, a professional portfolio management AI.
You analyze portfolio composition, risk exposure, diversification, and provide rebalancing suggestions.
RULES:
- Analyze sector concentration risk
- Calculate and mention risk metrics (Sharpe, Beta, Drawdown)
- Suggest specific rebalancing actions
- Consider correlation between positions
- Format responses with clear sections and bullet points
- Keep responses focused and actionable`,

  MARKET_SUMMARIZER: `You are TradexAI Market Intelligence, providing real-time market summaries.
RULES:
- Summarize market conditions in 150-250 words
- Highlight key movers and sector trends
- Mention any significant technical levels
- Provide a short-term market outlook
- Use professional tone with emoji indicators (🟢🔴🟡)`,

  CHATBOT: `You are TradexAI Assistant, a helpful AI chatbot integrated into a stock market browser extension.
You can help with:
- Stock analysis and recommendations
- Portfolio review and suggestions
- Market trend analysis
- Technical indicator explanations
- Investment strategy discussions
- Financial term definitions
RULES:
- Be conversational but professional
- Use markdown formatting for readability
- Keep responses concise (100-300 words)
- Always include relevant data when available
- Ask clarifying questions when the query is ambiguous
- Never guarantee returns or make absolute claims`,
};

// ==================== CACHE & SERVICE CLASS ====================

interface CacheEntry {
  response: string;
  cachedAt: number;
  ttl: number;
}

class AIService {
  private cache = new Map<string, CacheEntry>();
  private isChromeExtension = typeof chrome !== "undefined" && !!chrome.storage?.local;

  private getCacheKey(base: string, extra = ""): string {
    const str = base + extra;
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 512); i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `tradexai_${hash.toString(36)}`;
  }

  private getCached(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  private setCached(key: string, response: string, ttl: number): void {
    if (this.cache.size > 120) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { response, cachedAt: Date.now(), ttl });
  }

  private async getApiKey(): Promise<string> {
    try {
      let settings: any = {};
      if (this.isChromeExtension) {
        const result = await chrome.storage.local.get("stockai_settings");
        settings = result.stockai_settings ? JSON.parse(result.stockai_settings) : {};
      } else {
        const raw = localStorage.getItem("stockai_settings");
        settings = raw ? JSON.parse(raw) : {};
      }
      return settings.groqApiKey || "";
    } catch {
      return "";
    }
  }

  private async callAI(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      responseFormat?: "json_object";
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    const apiKey = await this.getApiKey();
    const msg = await this.getCacheKey("StockAI-Key");

    if (!apiKey || apiKey.length < 10) {
      throw new Error("Groq API key not configured. Go to Settings and add your API key.");
    }

    const {
      temperature = DEFAULT_TEMPERATURE,
      maxTokens = DEFAULT_MAX_TOKENS,
      responseFormat,
      systemPrompt,
    } = options;

    try {
      const body: any = {
        model: MODEL_CONFIG.PRIMARY,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
      };

      if (responseFormat) body.response_format = { type: responseFormat };

      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Groq API Error: ${res.status}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content?.trim();

      if (!content) throw new Error("Empty response from Groq");

      return content;

    } catch (err: any) {
      console.error("[AIService] Groq call failed:", err.message);
      throw err;
    }
  }

  private parseJsonSafe(raw: string): any {
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(stripped);
  }

  // ==================== PUBLIC API ====================

  async analyzeStock(
    stock: Stock,
    prediction: Prediction | null,
    historicalData?: HistoricalDataPoint[]
  ): Promise<string> {
    const cacheKey = this.getCacheKey(`stock_${stock.symbol}_${stock.price}`);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const prompt = `Analyze the following stock for an institutional-grade investment forecast.

STOCK DATA:
${JSON.stringify({ stock, prediction, historicalData_count: historicalData?.length || 0 }, null, 2)}

RECENT CANDLES (last 15):
${JSON.stringify(historicalData?.slice(-15) || [], null, 2)}

Provide a precision-level analytical report including:
1. **Market Sentiment** — Current trend analysis based on RSI and EMA/SMA alignment
2. **Technical Analysis** — Key indicator signal confluence (MACD crossing, RSI oversold/overbought)
3. **Risk Assessment** — Precise downside percentage risk and ATR volatility notes
4. **Price Targets** — 1-week and 1-month targets with 95% confidence intervals
5. **Recommendation** — BUY/SELL/HOLD with conviction percentage (0-100%)`;

    const response = await this.callAI(prompt, {
      systemPrompt: SYSTEM_INSTRUCTIONS.STOCK_ANALYST,
      temperature: 0.3,
      maxTokens: 600,
    });

    this.setCached(cacheKey, response, CACHE_TTL.STOCK_ANALYSIS);
    return response;
  }

  async generateMarketSummary(
    stocks: Stock[],
    predictions: Map<string, Prediction>
  ): Promise<string> {
    const cacheKey = this.getCacheKey(`market_summary_${stocks.length}`);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const topMovers = [...stocks]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 10)
      .map(s => `${s.symbol}: $${s.price.toFixed(2)} (${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%)`)
      .join("\n");

    const sectorPerf: Record<string, number[]> = {};
    stocks.forEach(s => {
      const sec = s.sector || "Other";
      if (!sectorPerf[sec]) sectorPerf[sec] = [];
      sectorPerf[sec].push(s.changePercent);
    });

    const sectorSummary = Object.entries(sectorPerf)
      .map(([sec, changes]) => {
        const avg = changes.reduce((s, v) => s + v, 0) / changes.length;
        return `${sec}: ${avg >= 0 ? "+" : ""}${avg.toFixed(2)}%`;
      })
      .join("\n");

    const bullish = stocks.filter(s => predictions.get(s.symbol)?.trendDirection === "bullish").length;

    const prompt = `Generate a real-time market intelligence summary:

MARKET OVERVIEW:
- Total tracked assets: ${stocks.length}
- Advancing: ${stocks.filter(s => s.changePercent > 0).length}
- Declining: ${stocks.filter(s => s.changePercent < 0).length}
- AI Bullish signals: ${bullish} stocks
- Average change: ${(stocks.reduce((s, st) => s + st.changePercent, 0) / stocks.length).toFixed(2)}%

TOP MOVERS:
${topMovers}

SECTOR PERFORMANCE:
${sectorSummary}

Provide a concise market summary with actionable insights.`;

    const response = await this.callAI(prompt, {
      systemPrompt: SYSTEM_INSTRUCTIONS.MARKET_SUMMARIZER,
      temperature: 0.4,
      maxTokens: 400,
    });

    this.setCached(cacheKey, response, CACHE_TTL.MARKET_SUMMARY);
    return response;
  }

  async reviewPortfolio(
    positions: PortfolioPosition[],
    stocks: Stock[],
    predictions: Map<string, Prediction>
  ): Promise<string> {
    if (positions.length === 0) {
      return "📭 **No positions in your portfolio yet.** Add stocks to your portfolio to get AI-powered analysis and rebalancing recommendations.";
    }

    const cacheKey = this.getCacheKey(`portfolio_${positions.map(p => p.symbol).join("_")}`);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const totalInvested = positions.reduce((s, p) => s + p.totalInvested, 0);
    const currentValue = positions.reduce((s, p) => s + p.currentValue, 0);

    const positionDetails = positions.map(p => {
      const pred = predictions.get(p.symbol);
      return `${p.symbol} (${p.assetType}): ${p.quantity} shares @ $${p.avgBuyPrice.toFixed(2)} | Current: $${p.currentPrice.toFixed(2)} | P/L: ${p.profitLossPercent >= 0 ? "+" : ""}${p.profitLossPercent.toFixed(2)}% | Weight: ${((p.currentValue / currentValue) * 100).toFixed(1)}% | AI Signal: ${pred?.recommendation || "N/A"}`;
    }).join("\n");

    const sectorWeights: Record<string, number> = {};
    positions.forEach(p => {
      const sec = p.sector || "Other";
      sectorWeights[sec] = (sectorWeights[sec] || 0) + p.currentValue;
    });

    const sectorBreakdown = Object.entries(sectorWeights)
      .map(([sec, val]) => `${sec}: ${((val / currentValue) * 100).toFixed(1)}%`)
      .join("\n");

    const prompt = `Analyze this investment portfolio:

PORTFOLIO SUMMARY:
- Total Invested: $${totalInvested.toFixed(2)}
- Current Value: $${currentValue.toFixed(2)}
- Total P/L: ${currentValue >= totalInvested ? "+" : ""}$${(currentValue - totalInvested).toFixed(2)} (${(((currentValue - totalInvested) / totalInvested) * 100).toFixed(2)}%)
- Positions: ${positions.length}

POSITIONS:
${positionDetails}

SECTOR ALLOCATION:
${sectorBreakdown}

Provide:
1. **Portfolio Health Score** (0-100)
2. **Diversification Analysis**
3. **Risk Assessment**
4. **Rebalancing Recommendations**
5. **Positions to Watch** (overweight/underweight/high-risk)`;

    const response = await this.callAI(prompt, {
      systemPrompt: SYSTEM_INSTRUCTIONS.PORTFOLIO_ADVISOR,
      temperature: 0.4,
      maxTokens: 700,
    });

    this.setCached(cacheKey, response, CACHE_TTL.PORTFOLIO_REVIEW);
    return response;
  }

  async chatWithAI(
    messages: AIChatMessage[],
    stockContext?: { stocks: Stock[]; predictions: Map<string, Prediction> },
    persona: "core" | "trader" | "risk" | "quant" = "core"
  ): Promise<string> {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      throw new Error("Last message must be from user");
    }

    const recentMessages = messages.slice(-8);
    let contextBlock = "";

    if (stockContext) {
      const topStocks = stockContext.stocks.slice(0, 15).map(s =>
        `${s.symbol}: $${s.price.toFixed(2)} (${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%)`
      ).join(", ");
      contextBlock = `\n\n[MARKET CONTEXT: ${topStocks}]`;
    }

    const conversationHistory = recentMessages
      .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const prompt = `${conversationHistory}${contextBlock}

Respond to the user's latest message. You are a highly advanced enterprise trading AI. You have access to deep UI integrations to make your analysis visual and actionable. Use these exactly where appropriate:
- Dynamic Price Area Chart: [CHART: SYMBOL]
- 5-Point Intelligence Radar Diagram: [RADAR: SYMBOL]
- Actionable Trade Execution Button: [ACTION: BUY, SYMBOL] or [ACTION: SELL, SYMBOL]`;

    let systemPrompt = SYSTEM_INSTRUCTIONS.CHATBOT;
    let temp = 0.7;

    if (persona === "trader") {
      systemPrompt = `You are Alpha Broker, an elite momentum trader agent. Your goal is high-conviction buying/selling setups and price action predictions. Keep recommendations clear, bold, and focused on short-term price targets. Avoid dry disclaimers, put focus on technical entry and exit zones.`;
      temp = 0.6;
    } else if (persona === "risk") {
      systemPrompt = `You are Risk Shield, a conservative risk management agent. Your goal is portfolio protection. Focus on downside protection, beta exposure, asset correlation, stop-loss triggers, Sharpe ratio indicators, and diversification. Identify maximum drawdown risks.`;
      temp = 0.45;
    } else if (persona === "quant") {
      systemPrompt = `You are Quant Oracle, a technical mathematical analyst. You specialize in indicators confluence. Focus heavily on RSI momentum, MACD crossings, Bollinger Bands, Moving Averages (EMA20/SMA50/SMA200) expansions. Reference concrete indicator values in calculations.`;
      temp = 0.35;
    }

    return await this.callAI(prompt, {
      systemPrompt,
      temperature: temp,
      maxTokens: 600,
    });
  }

  async aiScreenStocks(
    stocks: Stock[],
    predictions: Map<string, Prediction>,
    criteria: string
  ): Promise<string> {
    const stockData = stocks.slice(0, 50).map(s => {
      const pred = predictions.get(s.symbol);
      return `${s.symbol}: $${s.price.toFixed(2)} | Chg: ${s.changePercent.toFixed(2)}% | PE: ${s.pe > 0 ? s.pe.toFixed(1) : 'N/A'} | Vol: ${s.volume} | RSI: ${pred?.rsi?.toFixed(1) || 'N/A'} | Signal: ${pred?.recommendation || 'N/A'} | Risk: ${pred?.riskLevel || 'N/A'} | Trend: ${pred?.trendDirection || 'N/A'}`;
    }).join("\n");

    const prompt = `Stock screener request: "${criteria}"

AVAILABLE STOCKS:
${stockData}

Based on the user's criteria, filter and rank the best matching stocks. Provide:
1. **Top Picks** — Ranked list with reasons
2. **Key Metrics** — Why each stock matches the criteria
3. **Risk Notes** — Any concerns about the picks`;

    return await this.callAI(prompt, {
      systemPrompt: SYSTEM_INSTRUCTIONS.STOCK_ANALYST,
      temperature: 0.4,
      maxTokens: 500,
    });
  }

  async enhancePrediction(
    stock: Stock,
    basePrediction: Prediction
  ): Promise<string> {
    const cacheKey = this.getCacheKey(`enhance_${stock.symbol}_${basePrediction.updatedAt >> 14}`);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const prompt = `Enhance this AI prediction with deeper analysis:

${stock.symbol} ($${stock.price.toFixed(2)}) — ${stock.name}
Current AI Model Output:
- Direction: ${basePrediction.trendDirection} | Confidence: ${basePrediction.confidenceScore}%
- RSI: ${basePrediction.rsi.toFixed(1)} | MACD: ${basePrediction.macd.value.toFixed(4)}
- Support: $${basePrediction.supportLevel} | Resistance: $${basePrediction.resistanceLevel}
- Risk: ${basePrediction.riskLevel}

Provide a 2-3 sentence analysis of the prediction accuracy and any additional factors to consider. Include a 1-week price target range.`;

    const response = await this.callAI(prompt, {
      systemPrompt: SYSTEM_INSTRUCTIONS.STOCK_ANALYST,
      temperature: 0.4,
      maxTokens: 500,
    });

    this.setCached(cacheKey, response, CACHE_TTL.PREDICTION);
    return response;
  }

  async getEnterprisePrediction(
    stock: Stock,
    basePrediction: Prediction | null
  ): Promise<any> {
    const cacheKey = this.getCacheKey(`enterprise_${stock.symbol}_${stock.price}_v4`);
    const cached = this.getCached(cacheKey);
    if (cached) return JSON.parse(cached);

    const prompt = `Perform a high-fidelity Enterprise-grade AI analysis of ${stock.symbol} (${stock.name}).
Current State: Price $${stock.price} | Change ${stock.changePercent.toFixed(2)}% | Volume ${stock.volume}
Historical Context: ${JSON.stringify(stock.historicalData.slice(-12).map(d => ({ d: d.date.split('T')[0], c: +d.close.toFixed(2) })))}

You must evaluate this asset across professional-grade intelligence vectors.
Return ONLY a raw JSON object (absolutely no markdown, no backticks, no text outside the object) with the following structure:
{
  "recommendation": "buy" | "sell" | "hold",
  "confidenceScore": number (0-100),
  "upProbability": number (0-100),
  "downProbability": number (0-100),
  "priceTarget1W": number,
  "priceTarget1M": number,
  "metrics": {
    "sentiment": number (0-100),
    "technical": number (0-100),
    "fundamental": number (0-100),
    "momentum": number (0-100),
    "risk": number (0-100)
  },
  "decisionGuidance": "Strategic high-level professional advice (20 words max)",
  "aiAnalysis": "A deep intelligence summary (30-40 words max)"
}`;

    const response = await this.callAI(prompt, {
      systemPrompt: "You are the TradexAI Enterprise Core, a quantitative financial intelligence system. You provide institutional-level precision data.",
      temperature: 0.15,
      maxTokens: 500,
      responseFormat: "json_object",
    });

    const result = this.parseJsonSafe(response);

    this.setCached(cacheKey, JSON.stringify(result), CACHE_TTL.PREDICTION);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// ==================== EXPORT SINGLETON + LEGACY COMPATIBILITY ====================

const aiService = new AIService();

export const analyzeStock = aiService.analyzeStock.bind(aiService);
export const generateMarketSummary = aiService.generateMarketSummary.bind(aiService);
export const reviewPortfolio = aiService.reviewPortfolio.bind(aiService);
export const chatWithAI = aiService.chatWithAI.bind(aiService);
export const aiScreenStocks = aiService.aiScreenStocks.bind(aiService);
export const enhancePrediction = aiService.enhancePrediction.bind(aiService);
export const getEnterprisePrediction = aiService.getEnterprisePrediction.bind(aiService);
export const clearAICache = aiService.clearCache.bind(aiService);

export async function saveGroqApiKey(apiKey: string): Promise<void> {
  try {
    let settings: any = {};
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const result = await chrome.storage.local.get("stockai_settings");
      settings = result.stockai_settings ? JSON.parse(result.stockai_settings) : {};
      settings.groqApiKey = apiKey;
      await chrome.storage.local.set({ stockai_settings: JSON.stringify(settings) });
    } else {
      const raw = localStorage.getItem("stockai_settings");
      settings = raw ? JSON.parse(raw) : {};
      settings.groqApiKey = apiKey;
      localStorage.setItem("stockai_settings", JSON.stringify(settings));
    }
  } catch (err) {
    console.warn("Failed to save Groq API key:", err);
  }
}

export async function isAIConfigured(): Promise<boolean> {
  const key = await aiService["getApiKey"]();
  return key.length > 10;
}

export function getAICacheStats() {
  return {
    size: aiService["cache"].size,
    entries: Array.from(aiService["cache"].keys()),
  };
}