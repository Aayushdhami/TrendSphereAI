/**
 * Enhanced Alert Service — Advanced alert engine with cooldown,
 * priority batching, sound alerts, and new alert types
 */
import type { Alert, Stock, AppNotification, Prediction } from "~src/types"

interface AlertCheckResult {
  triggered: Alert[]
  notifications: Omit<AppNotification, "id" | "timestamp" | "read">[]
}

/** Alert cooldown tracker */
const cooldownMap = new Map<string, number>()

/** Check if alert is in cooldown */
function isInCooldown(alert: Alert): boolean {
  const lastTriggered = cooldownMap.get(alert.id)
  if (!lastTriggered) return false
  const cooldownMs = (alert.cooldownMinutes || 15) * 60 * 1000
  return Date.now() - lastTriggered < cooldownMs
}

/** Set cooldown for alert */
function setCooldown(alertId: string): void {
  cooldownMap.set(alertId, Date.now())
}

/** Check all active alerts against current stock data */
export function checkAlerts(
  alerts: Alert[],
  stocks: Stock[],
  predictions?: Map<string, Prediction>
): AlertCheckResult {
  const triggered: Alert[] = []
  const notifications: Omit<AppNotification, "id" | "timestamp" | "read">[] = []

  alerts.forEach((alert) => {
    if (!alert.isActive) return
    if (isInCooldown(alert)) return

    const stock = stocks.find((s) => s.symbol === alert.symbol)
    if (!stock) return

    let shouldTrigger = false
    let title = ""
    let message = ""
    const prediction = predictions?.get(alert.symbol)

    switch (alert.type) {
      case "price-above":
        if (stock.price >= alert.targetValue) {
          shouldTrigger = true
          title = `📈 ${stock.symbol} Price Alert`
          message = `${stock.symbol} has reached $${stock.price.toFixed(2)}, above your target of $${alert.targetValue.toFixed(2)}`
        }
        break

      case "price-below":
        if (stock.price <= alert.targetValue) {
          shouldTrigger = true
          title = `📉 ${stock.symbol} Price Alert`
          message = `${stock.symbol} has dropped to $${stock.price.toFixed(2)}, below your target of $${alert.targetValue.toFixed(2)}`
        }
        break

      case "percent-increase":
        if (stock.changePercent >= alert.targetValue) {
          shouldTrigger = true
          title = `🚀 ${stock.symbol} Rally Alert`
          message = `${stock.symbol} is up ${stock.changePercent.toFixed(2)}%, exceeding your ${alert.targetValue}% threshold`
        }
        break

      case "percent-decrease":
        if (stock.changePercent <= -alert.targetValue) {
          shouldTrigger = true
          title = `🔻 ${stock.symbol} Drop Alert`
          message = `${stock.symbol} is down ${Math.abs(stock.changePercent).toFixed(2)}%, exceeding your ${alert.targetValue}% drop threshold`
        }
        break

      case "high-volatility":
        if (Math.abs(stock.changePercent) >= alert.targetValue) {
          shouldTrigger = true
          title = `⚡ ${stock.symbol} Volatility Alert`
          message = `${stock.symbol} moved ${Math.abs(stock.changePercent).toFixed(2)}% today — high volatility detected`
        }
        break

      case "rsi-overbought":
        if (prediction && prediction.rsi >= alert.targetValue) {
          shouldTrigger = true
          title = `🔴 ${stock.symbol} RSI Overbought`
          message = `${stock.symbol} RSI(14) has reached ${prediction.rsi.toFixed(1)}, above your ${alert.targetValue} threshold — potential reversal zone`
        }
        break

      case "rsi-oversold":
        if (prediction && prediction.rsi <= alert.targetValue) {
          shouldTrigger = true
          title = `🟢 ${stock.symbol} RSI Oversold`
          message = `${stock.symbol} RSI(14) has dropped to ${prediction.rsi.toFixed(1)}, below your ${alert.targetValue} threshold — potential buying opportunity`
        }
        break

      case "volume-spike":
        if (stock.avgVolume > 0 && (stock.volume / stock.avgVolume) >= alert.targetValue) {
          shouldTrigger = true
          const volumeMultiple = (stock.volume / stock.avgVolume).toFixed(1)
          title = `📊 ${stock.symbol} Volume Spike`
          message = `${stock.symbol} volume is ${volumeMultiple}x above average — unusual activity detected`
        }
        break

      case "trend-reversal":
        if (prediction) {
          const expectedDirection = alert.targetValue > 0 ? "bullish" : "bearish"
          const oppositeDirection = expectedDirection === "bullish" ? "bearish" : "bullish"
          if (prediction.trendDirection === oppositeDirection) {
            shouldTrigger = true
            title = `🔄 ${stock.symbol} Trend Reversal`
            message = `${stock.symbol} has shifted to ${prediction.trendDirection.toUpperCase()} — AI confidence: ${prediction.confidenceScore}%`
          }
        }
        break

      case "ai-prediction":
        if (prediction) {
          const targetRec = alert.targetValue > 0 ? "buy" : "sell"
          if (prediction.recommendation.includes(targetRec) && prediction.confidenceScore >= 70) {
            shouldTrigger = true
            title = `🤖 ${stock.symbol} AI Signal`
            message = `AI recommends ${prediction.recommendation.toUpperCase()} on ${stock.symbol} with ${prediction.confidenceScore}% confidence`
          }
        }
        break
    }

    if (shouldTrigger) {
      triggered.push(alert)
      setCooldown(alert.id)
      notifications.push({
        type: "alert",
        title,
        message,
        symbol: alert.symbol,
        actionUrl: `tabs/dashboard.html?symbol=${alert.symbol}`,
      })
    }
  })

  return { triggered, notifications }
}

/** Send a browser notification */
export function sendBrowserNotification(title: string, message: string): void {
  try {
    if (typeof chrome !== "undefined" && chrome.notifications) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title,
        message,
        priority: 2,
      })
    } else if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: message, icon: "/icon.png" })
    }
  } catch (err) {
    console.warn("Failed to send notification:", err)
  }
}

/** Request notification permission */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if ("Notification" in window) {
      const result = await Notification.requestPermission()
      return result === "granted"
    }
    return false
  } catch {
    return false
  }
}

/** Play an alert sound */
export function playAlertSound(type: "default" | "urgent" | "success" = "default"): void {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    const configs: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      default: { freq: 800, duration: 0.15, type: "sine" },
      urgent: { freq: 1200, duration: 0.25, type: "square" },
      success: { freq: 600, duration: 0.2, type: "sine" },
    }

    const config = configs[type]
    oscillator.frequency.value = config.freq
    oscillator.type = config.type
    gainNode.gain.value = 0.1

    oscillator.start()
    oscillator.stop(audioCtx.currentTime + config.duration)

    // For urgent: play a second beep
    if (type === "urgent") {
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator()
        const gain2 = audioCtx.createGain()
        osc2.connect(gain2)
        gain2.connect(audioCtx.destination)
        osc2.frequency.value = 1400
        osc2.type = "square"
        gain2.gain.value = 0.1
        osc2.start()
        osc2.stop(audioCtx.currentTime + 0.2)
      }, 300)
    }
  } catch (err) {
    console.warn("Failed to play alert sound:", err)
  }
}

/** Get alert type display info */
export function getAlertTypeInfo(type: Alert["type"]): { label: string; icon: string; description: string } {
  const info: Record<string, { label: string; icon: string; description: string }> = {
    "price-above": { label: "Price Above", icon: "📈", description: "Triggers when price rises above target" },
    "price-below": { label: "Price Below", icon: "📉", description: "Triggers when price drops below target" },
    "percent-increase": { label: "% Increase", icon: "🚀", description: "Triggers when daily gain exceeds threshold" },
    "percent-decrease": { label: "% Decrease", icon: "🔻", description: "Triggers when daily loss exceeds threshold" },
    "high-volatility": { label: "Volatility", icon: "⚡", description: "Triggers on high price movement" },
    "rsi-overbought": { label: "RSI Overbought", icon: "🔴", description: "Triggers when RSI exceeds level" },
    "rsi-oversold": { label: "RSI Oversold", icon: "🟢", description: "Triggers when RSI drops below level" },
    "volume-spike": { label: "Volume Spike", icon: "📊", description: "Triggers on unusual trading volume" },
    "trend-reversal": { label: "Trend Reversal", icon: "🔄", description: "Triggers on AI trend direction change" },
    "ai-prediction": { label: "AI Signal", icon: "🤖", description: "Triggers on AI buy/sell recommendation" },
  }
  return info[type] || { label: type, icon: "🔔", description: "Custom alert" }
}
