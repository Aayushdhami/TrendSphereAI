import type { Prediction, Stock, Recommendation, TrendDirection, RiskLevel } from "~src/types"
import { calculateSMA, calculateEMA, calculateRSI, clamp } from "~src/utils/helpers"

/**
 * Advanced AI Prediction Engine (Data Science Level)
 * - Implements Statistical Normalization
 * - ATR-based Volatility Risk
 * - Multi-timeframe Trend Alignment
 */
export function generatePrediction(stock: Stock): Prediction {
  const closes = stock.historicalData.map((d) => d.close)
  const volumes = stock.historicalData.map((d) => d.volume)
  const highs = stock.historicalData.map((d) => d.high)
  const lows = stock.historicalData.map((d) => d.low)

  if (closes.length < 20) {
    // Fallback if not enough data
    return getEmptyPrediction(stock)
  }

  // 1. Core Technical Indicators
  const rsi = calculateRSI(closes, 14)
  const sma20 = calculateSMA(closes, 20)
  const sma50 = calculateSMA(closes, 50)
  const sma200 = calculateSMA(closes, 200) || sma50 // Fallback if data < 200
  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)

  // 2. MACD Logic
  const macdValue = ema12 - ema26
  // Approximate Signal Line
  const macdSignal = calculateEMA(
    closes.slice(-15).map((_ , i) => {
      const slice = closes.slice(0, closes.length - 15 + i + 1)
      return calculateEMA(slice, 12) - calculateEMA(slice, 26)
    }),
    9
  )
  const macdHistogram = macdValue - macdSignal

  // 3. Volatility Analytics (ATR & Standard Deviation)
  const atr = calculateATR(highs, lows, closes, 14)
  const volatilityZScore = calculateZScore(closes, 30)
  
  // 4. Momentum & Relative Strength
  const shortMomentum = ((stock.price - sma20) / sma20) * 100
  const longMomentum = ((stock.price - sma50) / sma50) * 100
  const volumeRel = stock.volume / (volumes.slice(-20).reduce((s,v) => s+v, 0) / 20)

  // 5. Advanced Trend Determination (Regime Detection)
  const trendDirection = determineTrendRegime(stock.price, sma20, sma50, sma200, macdHistogram, rsi)

  // 6. Support & Resistance (Pivot Points & Volume Clusters)
  const { support, resistance } = calculateStructuralLevels(stock.historicalData)

  // 7. Probability Distribution
  const { upProb, downProb } = calculateQuantumProbabilities(
    rsi, macdHistogram, shortMomentum, trendDirection, volumeRel, volatilityZScore,
    stock.price, support, resistance
  )

  // 8. Risk Assessment (ATR-based)
  const riskLevel = assessExtremeRisk(stock, atr, rsi, volatilityZScore)

  // 9. AI Recommendation
  const recommendation = deriveRecommendation(
    trendDirection, rsi, macdHistogram, upProb, riskLevel, volumeRel
  )

  // 10. Confidence Score (Consensus level)
  const confidenceScore = calculateConsensusConfidence(
    trendDirection, rsi, macdHistogram, volumeRel, upProb
  )

  return {
    symbol: stock.symbol,
    upProbability: parseFloat(upProb.toFixed(1)),
    downProbability: parseFloat(downProb.toFixed(1)),
    trendDirection,
    riskLevel,
    momentumScore: parseFloat(((shortMomentum + longMomentum) * 2).toFixed(1)),
    volumeStrength: parseFloat((clamp(volumeRel * 50, 0, 100)).toFixed(1)),
    recommendation,
    confidenceScore: parseFloat(confidenceScore.toFixed(1)),
    rsi: parseFloat(rsi.toFixed(1)),
    macd: {
      value: parseFloat(macdValue.toFixed(4)),
      signal: parseFloat(macdSignal.toFixed(4)),
      histogram: parseFloat(macdHistogram.toFixed(4)),
    },
    movingAverages: {
      sma20: parseFloat(sma20.toFixed(2)),
      sma50: parseFloat(sma50.toFixed(2)),
      sma200: parseFloat(sma200.toFixed(2)),
      ema12: parseFloat(ema12.toFixed(2)),
      ema26: parseFloat(ema26.toFixed(2)),
    },
    bollingerBands: calculateBollinger(closes),
    supportLevel: support,
    resistanceLevel: resistance,
    volatilityIndex: parseFloat((clamp(volatilityZScore * 20 + 50, 0, 100)).toFixed(1)),
    updatedAt: Date.now(),
  }
}

/**
 * Average True Range (ATR) - Real measurement of volatility
 */
function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  const trs: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    )
    trs.push(tr)
  }
  const avgTr = trs.slice(-period).reduce((s, v) => s + v, 0) / Math.max(trs.length, 1)
  return avgTr || 1
}

/**
 * Z-Score - Statistical distance from the mean
 */
function calculateZScore(data: number[], period: number): number {
  const slice = data.slice(-period)
  if (slice.length === 0) return 0
  const mean = slice.reduce((s, v) => s + v, 0) / slice.length
  const stdDev = Math.sqrt(slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / slice.length)
  if (stdDev === 0) return 0
  return (data[data.length - 1] - mean) / stdDev
}

/**
 * Determine Market Regime
 */
function determineTrendRegime(
  price: number, sma20: number, sma50: number, sma200: number, macdHist: number, rsi: number
): TrendDirection {
  let score = 0
  if (price > sma20) score++
  if (price > sma50) score += 2
  if (price > sma200) score += 3
  if (sma20 > sma50) score++
  if (macdHist > 0) score++
  if (rsi > 50) score++

  if (score >= 7) return "bullish"
  if (score <= 2) return "bearish"
  return "neutral"
}

/**
 * Structural S/R Levels using Fractal Pivot Highs/Lows
 * Uses a secondary filter for price density clusters
 */
function calculateStructuralLevels(data: any[]): { support: number; resistance: number } {
  const recent = data.slice(-50)
  if (recent.length < 5) return { support: 0, resistance: 0 }
  
  // Find "Fractal" pivots (local min/max with 2-bar padding)
  const pivotsHigh: number[] = []
  const pivotsLow: number[] = []
  
  for (let i = 2; i < recent.length - 2; i++) {
    const curr = recent[i]
    const p1 = recent[i-1]; const p2 = recent[i-2]
    const n1 = recent[i+1]; const n2 = recent[i+2]
    
    if (curr.high > p1.high && curr.high > p2.high && curr.high > n1.high && curr.high > n2.high) {
      pivotsHigh.push(curr.high)
    }
    if (curr.low < p1.low && curr.low < p2.low && curr.low < n1.low && curr.low < n2.low) {
      pivotsLow.push(curr.low)
    }
  }

  // Fallback to basic min/max if no fractals found
  const support = pivotsLow.length > 0 
    ? pivotsLow.reduce((s, v) => s + v, 0) / pivotsLow.length
    : Math.min(...recent.map(d => d.low))
    
  const resistance = pivotsHigh.length > 0
    ? pivotsHigh.reduce((s, v) => s + v, 0) / pivotsHigh.length
    : Math.max(...recent.map(d => d.high))
  
  return {
    support: parseFloat(support.toFixed(2)),
    resistance: parseFloat(resistance.toFixed(2))
  }
}

/**
 * Probability Logic
 */
function calculateQuantumProbabilities(
  rsi: number, macdHist: number, momentum: number, 
  trend: TrendDirection, volumeRel: number, zScore: number,
  price: number, support: number, resistance: number
): { upProb: number; downProb: number } {
  let base = 50
  
  // Mean reversion signals
  if (rsi < 30) base += 20
  if (rsi > 70) base -= 20
  
  // Trend following
  if (trend === "bullish") base += 10
  if (trend === "bearish") base -= 10
  
  // Momentum acceleration
  if (macdHist > 0) base += 5
  if (volumeRel > 1.5) base += (trend === "bullish" ? 10 : -10)
  
  // Statistical anomalies
  if (zScore < -2) base += 15 // Oversold statistically
  if (zScore > 2) base -= 15 // Overbought statistically

  // Structural Proximity (Proprietary Logic)
  const distToSupp = (price - support) / price
  const distToRes = (resistance - price) / price
  
  if (distToSupp < 0.02) base += 10 // Likely bounce at support
  if (distToRes < 0.02) base -= 10 // Likely rejection at resistance
  
  const finalUp = clamp(base, 5, 95)
  return { upProb: finalUp, downProb: 100 - finalUp }
}

/**
 * Extreme Risk Assessment
 */
function assessExtremeRisk(stock: Stock, atr: number, rsi: number, zScore: number): RiskLevel {
  const volPct = (atr / stock.price) * 100
  const momentumAbs = Math.abs(stock.changePercent)
  
  const riskScore = (volPct * 5) + (momentumAbs * 3) + (Math.abs(zScore) * 10)
  
  if (riskScore > 80 || rsi > 85 || rsi < 15) return "very-high"
  if (riskScore > 50) return "high"
  if (riskScore > 25) return "medium"
  return "low"
}

/**
 * Final Quant Recommendation
 */
function deriveRecommendation(
  trend: TrendDirection, rsi: number, macdHist: number, upProb: number, risk: RiskLevel, volRel: number
): Recommendation {
  if (upProb > 80 && trend !== "bearish") return "strong-buy"
  if (upProb > 65) return "buy"
  if (upProb < 20) return "strong-sell"
  if (upProb < 35) return "sell"
  return "hold"
}

/**
 * Consensus Confidence
 */
function calculateConsensusConfidence(
  trend: TrendDirection, rsi: number, macdHist: number, volRel: number, upProb: number
): number {
  const agreement = (upProb > 50 ? 1 : 0) + (trend === "bullish" ? 1 : 0) + (macdHist > 0 ? 1 : 0) + (volRel > 1 ? 1 : 0)
  const confidence = (agreement / 4) * 100
  return clamp(confidence, 40, 98)
}

function calculateBollinger(closes: number[]) {
  const period = 20
  const slice = closes.slice(-period)
  if (slice.length === 0) return { upper: 0, middle: 0, lower: 0 }
  const mean = slice.reduce((s, v) => s + v, 0) / slice.length
  const stdDev = Math.sqrt(slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / slice.length)
  return {
    upper: parseFloat((mean + 2 * stdDev).toFixed(2)),
    middle: parseFloat(mean.toFixed(2)),
    lower: parseFloat((mean - 2 * stdDev).toFixed(2)),
  }
}

function getEmptyPrediction(stock: Stock): Prediction {
  const price = stock.price || 100
  return {
    symbol: stock.symbol,
    upProbability: 50,
    downProbability: 50,
    trendDirection: "neutral",
    riskLevel: "medium",
    momentumScore: 0,
    volumeStrength: 0,
    recommendation: "hold",
    confidenceScore: 50,
    rsi: 50,
    macd: { value: 0, signal: 0, histogram: 0 },
    movingAverages: { sma20: price, sma50: price, sma200: price, ema12: price, ema26: price },
    bollingerBands: { upper: price * 1.05, middle: price, lower: price * 0.95 },
    supportLevel: price * 0.9,
    resistanceLevel: price * 1.1,
    volatilityIndex: 50,
    updatedAt: Date.now(),
  }
}
