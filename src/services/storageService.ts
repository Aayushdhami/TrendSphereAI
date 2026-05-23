/**
 * Storage service - abstracts Chrome storage and localStorage
 */

const STORAGE_KEYS = {
  SETTINGS: "stockai_settings",
  WATCHLIST: "stockai_watchlist",
  ALERTS: "stockai_alerts",
  NOTIFICATIONS: "stockai_notifications",
  CACHED_STOCKS: "stockai_cached_stocks",
  CACHED_PORTFOLIO: "stockai_cached_portfolio",
  CHAT_HISTORY: "stockai_chat_history",
} as const

/** Save data to storage */
export async function saveToStorage<T>(key: string, data: T): Promise<void> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [key]: JSON.stringify(data) })
    } else {
      localStorage.setItem(key, JSON.stringify(data))
    }
  } catch (err) {
    console.warn("Storage save failed, falling back to localStorage:", err)
    localStorage.setItem(key, JSON.stringify(data))
  }
}

/** Load data from storage */
export async function loadFromStorage<T>(key: string): Promise<T | null> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const result = await chrome.storage.local.get(key)
      const raw = result[key]
      return raw ? JSON.parse(raw) : null
    } else {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }
  } catch (err) {
    console.warn("Storage load failed:", err)
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }
}

/** Remove data from storage */
export async function removeFromStorage(key: string): Promise<void> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.remove(key)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    localStorage.removeItem(key)
  }
}

export { STORAGE_KEYS }
