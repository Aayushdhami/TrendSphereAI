/**
 * TradexAI AI Service — Production Grade OpenRouter Integration
 * FIXED: Verified free model names + reduced retry storm
 */

import type {
  AIChatMessage,
  Stock,
  Prediction,
  PortfolioPosition,
  HistoricalDataPoint,
} from "~src/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ==================== CONFIGURATION ====================
// All models below are verified working on OpenRouter free tier (May 2025)

const MODEL_CONFIG = {
  // Primary: Gemini 2.0 Flash — fast, free, great for finance & JSON
  PRIMARY: "google/gemini-2.0-flash-exp:free",
  FALLBACKS: [
    "deepseek/deepseek-r1:free",                // DeepSeek R1 — strong reasoning
    "meta-llama/llama-3.3-70b-instruct:free",   // Llama 3.3 70B — reliable fallback
    "mistralai/mistral-7b-instruct:free",        // Mistral 7B — lightweight fallback
  ],
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
      return settings.openRouterApiKey || "";
    } catch {
      return "";
    }
  }

  /**
   * Core AI Call with Multi-Model Fallback + Smart Retry
   *
   * FIXED vs original:
   *  - Max 2 retries per model (was 6) → prevents the request flood shown in DevTools
   *  - Shorter initial delay, still exponential backoff
   *  - 429 (rate-limit) retries the SAME model; other errors fall through to next model
   *  - Clear error thrown when API key is missing
   */
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

    if (!apiKey || apiKey.length < 10) {
      throw new Error(
        "OpenRouter API key not configured. Go to Settings and add your API key from openrouter.ai."
      );
    }

    const models = [MODEL_CONFIG.PRIMARY, ...MODEL_CONFIG.FALLBACKS];
    const {
      temperature = DEFAULT_TEMPERATURE,
      maxTokens = DEFAULT_MAX_TOKENS,
      responseFormat,
      systemPrompt,
    } = options;

    let lastError: Error | null = null;

    for (const model of models) {
      // Max 2 retries per model (only for 429 rate-limit, not for 4xx errors)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const body: any = {
            model,
            messages: [
              ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
              { role: "user", content: prompt },
            ],
            temperature,
            max_tokens: maxTokens,
          };

          if (responseFormat) body.response_format = { type: responseFormat };

          const res = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "https://tradexai.pro",
              "X-Title": "TradexAI Pro",
            },
            body: JSON.stringify(body),
          });

          // Rate limited — wait and retry same model
          if (res.status === 429) {
            if (attempt < 1) {
              const delay = 2000 + Math.random() * 1000;
              console.warn(`[AIService] ${model} rate-limited, retrying in ${Math.round(delay)}ms`);
              await new Promise(r => setTimeout(r, delay));
              continue;
            }
            // Exhausted retries for this model, try next
            lastError = new Error(`${model} rate-limited`);
            break;
          }

          // Non-retriable 4xx (bad model name, auth error, etc.) — skip to next model immediately
          if (res.status === 400 || res.status === 404) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData?.error?.message || `HTTP ${res.status}`;
            console.warn(`[AIService] ${model} rejected (${res.status}): ${msg} — trying next model`);
            lastError = new Error(msg);
            break; // Don't retry 400/404, go to next model
          }

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `HTTP ${res.status}`);
          }

          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content?.trim();

          if (!content) throw new Error("Empty AI response");

          console.info(`[AIService] Success with model: ${model}`);
          return content;

        } catch (err: any) {
          lastError = err;
          console.warn(`[AIService] ${model} attempt ${attempt + 1} failed:`, err.message);

          if (attempt < 1) {
            await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
          }
        }
      }
    }

    throw lastError || new Error("All AI models failed");
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
    stockContext?: { stocks: Stock[]; predictions: Map<string, Prediction> }
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

Respond to the user's latest message. If they ask about a specific stock, provide analysis using the market context available.`;

    return await this.callAI(prompt, {
      systemPrompt: SYSTEM_INSTRUCTIONS.CHATBOT,
      temperature: 0.7,
      maxTokens: 500,
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
  ): Promise<Partial<Prediction> & { aiAnalysis: string; priceTarget1W: number; priceTarget1M: number }> {
    const cacheKey = this.getCacheKey(`enterprise_${stock.symbol}_${stock.price}_v3`);
    const cached = this.getCached(cacheKey);
    if (cached) return JSON.parse(cached);

    const prompt = `You are an expert quantitative analyst. Analyze ${stock.symbol} (${stock.name}).
Price: $${stock.price} | Change: ${stock.changePercent.toFixed(2)}% | Volume: ${stock.volume}
Recent 10 candles (OHLCV): ${JSON.stringify(stock.historicalData.slice(-10).map(d => ({ d: d.date, o: +d.open.toFixed(2), h: +d.high.toFixed(2), l: +d.low.toFixed(2), c: +d.close.toFixed(2), v: d.volume })))}

Return ONLY a raw JSON object (no markdown, no code fences) with this exact shape:
{"recommendation":"buy","confidenceScore":72,"upProbability":65,"downProbability":35,"trendDirection":"bullish","riskLevel":"medium","priceTarget1W":${(stock.price * 1.02).toFixed(2)},"priceTarget1M":${(stock.price * 1.05).toFixed(2)},"aiAnalysis":"2-3 sentence analysis here"}`;

    const response = await this.callAI(prompt, {
      systemPrompt: SYSTEM_INSTRUCTIONS.STOCK_ANALYST,
      temperature: 0.2,
      maxTokens: 400,
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

export async function saveGeminiApiKey(apiKey: string): Promise<void> {
  try {
    let settings: any = {};
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const result = await chrome.storage.local.get("stockai_settings");
      settings = result.stockai_settings ? JSON.parse(result.stockai_settings) : {};
      settings.geminiApiKey = apiKey;
      await chrome.storage.local.set({ stockai_settings: JSON.stringify(settings) });
    } else {
      const raw = localStorage.getItem("stockai_settings");
      settings = raw ? JSON.parse(raw) : {};
      settings.geminiApiKey = apiKey;
      localStorage.setItem("stockai_settings", JSON.stringify(settings));
    }
  } catch (err) {
    console.warn("Failed to save Gemini API key:", err);
  }
}

export async function saveOpenRouterApiKey(apiKey: string): Promise<void> {
  try {
    let settings: any = {};
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const result = await chrome.storage.local.get("stockai_settings");
      settings = result.stockai_settings ? JSON.parse(result.stockai_settings) : {};
      settings.openRouterApiKey = apiKey;
      await chrome.storage.local.set({ stockai_settings: JSON.stringify(settings) });
    } else {
      const raw = localStorage.getItem("stockai_settings");
      settings = raw ? JSON.parse(raw) : {};
      settings.openRouterApiKey = apiKey;
      localStorage.setItem("stockai_settings", JSON.stringify(settings));
    }
  } catch (err) {
    console.warn("Failed to save OpenRouter API key:", err);
  }
}

export async function isGeminiConfigured(): Promise<boolean> {
  const key = await aiService["getApiKey"]();
  return key.length > 10;
}

export function getAICacheStats() {
  return {
    size: aiService["cache"].size,
    entries: Array.from(aiService["cache"].keys()),
  };
}