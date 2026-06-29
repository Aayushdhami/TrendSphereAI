import { create } from "zustand"
import type { UserSettings } from "~src/types"
import type { ApiKeys } from "~src/services/apiConfig"
import { loadApiKeys, saveApiKeys, getApiStatus } from "~src/services/apiConfig"
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from "~src/services/storageService"
import { saveGroqApiKey } from "~src/services/geminiService"
import { DEFAULT_FAVORITES } from "~src/utils/constants"

const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD", IN: "INR", GB: "GBP", CA: "CAD", AU: "AUD", JP: "JPY",
  CN: "CNY", CH: "CHF", HK: "HKD", SG: "SGD", KR: "KRW", NZ: "NZD",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR",
  GR: "EUR", AT: "EUR", FI: "EUR", IE: "EUR", PT: "EUR", BR: "BRL",
  RU: "RUB", ZA: "ZAR", MX: "MXN",
}

interface SettingsState extends UserSettings {
  apiKeys: ApiKeys
  apiStatus: Record<string, boolean>
  isLoaded: boolean
  localCurrency: string
  exchangeRates: Record<string, number>

  // Actions
  updateSettings: (partial: Partial<UserSettings>) => void
  addFavorite: (symbol: string) => void
  removeFavorite: (symbol: string) => void
  completeOnboarding: () => void
  resetSettings: () => void
  setApiKeys: (keys: Partial<ApiKeys>) => Promise<void>
  loadStoredSettings: () => Promise<void>
  updateCurrency: (currency: string) => Promise<void>
  detectCurrency: () => Promise<void>
  setGroqApiKey: (key: string) => Promise<void>
  toggleFeature: (feature: "enableAIChatbot" | "enableVoiceAssistant" | "enableKeyboardShortcuts") => void
}

const defaultSettings: UserSettings = {
  favoriteStocks: DEFAULT_FAVORITES,
  alertPreferences: {
    enableBrowserNotifications: true,
    enableSoundAlerts: false,
    enableEmailSimulation: false,
    cooldownMinutes: 15,
    alertBatchingEnabled: true,
    maxAlertsPerHour: 20,
  },
  dashboardPreferences: {
    showMarketOverview: true,
    showPredictions: true,
    showWatchlist: true,
    showCharts: true,
    defaultChartType: "candlestick",
    updateInterval: 10000,
  },
  email: "",
  theme: "dark",
  onboardingCompleted: false,
  installedAt: Date.now(),
  localCurrency: "USD",
  exchangeRates: { USD: 1 },
  groqApiKey: "",
  enableAIChatbot: true,
  enableVoiceAssistant: false,
  enableKeyboardShortcuts: true,
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaultSettings,
  localCurrency: "USD",
  exchangeRates: { USD: 1 },
  apiKeys: { finnhub: "", alphaVantage: "", fmp: "" },
  apiStatus: { finnhub: false, alphaVantage: false, yahooFinance: true, fmp: false },
  isLoaded: false,

  updateSettings: (partial) => set((state) => ({ ...state, ...partial })),

  addFavorite: (symbol) =>
    set((state) => ({
      favoriteStocks: state.favoriteStocks.includes(symbol)
        ? state.favoriteStocks
        : [...state.favoriteStocks, symbol],
    })),

  removeFavorite: (symbol) =>
    set((state) => ({
      favoriteStocks: state.favoriteStocks.filter((s) => s !== symbol),
    })),

  completeOnboarding: () => set({ onboardingCompleted: true }),

  resetSettings: () => set({ ...defaultSettings }),

  setApiKeys: async (partial) => {
    const current = get().apiKeys
    const updated = { ...current, ...partial }
    await saveApiKeys(updated)
    set({
      apiKeys: updated,
      apiStatus: getApiStatus(updated),
    })
  },

  setGroqApiKey: async (key: string) => {
    await saveGroqApiKey(key)
    set({ groqApiKey: key })
  },

  toggleFeature: (feature) => {
    set((state) => ({ [feature]: !state[feature] }))
  },

  updateCurrency: async (currency: string) => {
    if (currency === "USD") {
      set({ localCurrency: "USD", exchangeRates: { USD: 1 } })
      return
    }
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD")
      const data = await response.json()
      if (data.result === "success" && data.rates) {
        set({
          localCurrency: currency,
          exchangeRates: data.rates,
        })
      }
    } catch (err) {
      console.warn("Failed to fetch exchange rates:", err)
      const mockRates: Record<string, number> = {
        INR: 83.3, EUR: 0.92, GBP: 0.79, JPY: 156.0, CAD: 1.36, AUD: 1.50, USD: 1
      }
      set({
        localCurrency: currency,
        exchangeRates: { ...mockRates, [currency]: mockRates[currency] || 1 }
      })
    }
  },

  detectCurrency: async () => {
    const fallbackIP = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/")
        const data = await response.json()
        if (data.currency) {
          await get().updateCurrency(data.currency)
        }
      } catch (err) {
        console.warn("Failed to detect currency by IP:", err)
      }
    }

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
            const data = await response.json()
            const countryCode = data.countryCode || ""
            const currency = COUNTRY_CURRENCY[countryCode] || "USD"
            await get().updateCurrency(currency)
          } catch {
            await fallbackIP()
          }
        },
        async () => {
          await fallbackIP()
        },
        { timeout: 5000 }
      )
    } else {
      await fallbackIP()
    }
  },

  loadStoredSettings: async () => {
    const keys = await loadApiKeys()
    const savedSettings = await loadFromStorage<UserSettings>(STORAGE_KEYS.SETTINGS)

    // Load AI keys from stockai_settings (where geminiService.ts reads from)
    let groqApiKey = defaultSettings.groqApiKey || ""
    try {
      let aiSettings: any = {}
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        const result = await chrome.storage.local.get("stockai_settings")
        aiSettings = result.stockai_settings ? JSON.parse(result.stockai_settings) : {}
      } else {
        const raw = localStorage.getItem("stockai_settings")
        aiSettings = raw ? JSON.parse(raw) : {}
      }

      if (aiSettings.groqApiKey) {
        groqApiKey = aiSettings.groqApiKey
      } else if (groqApiKey) {
        await saveGroqApiKey(groqApiKey)
      }
    } catch { }

    set({
      ...(savedSettings || {}),
      groqApiKey,
      apiKeys: keys,
      apiStatus: getApiStatus(keys),
      isLoaded: true,
      // Ensure new fields have defaults
      enableAIChatbot: savedSettings?.enableAIChatbot ?? true,
      enableVoiceAssistant: savedSettings?.enableVoiceAssistant ?? false,
      enableKeyboardShortcuts: savedSettings?.enableKeyboardShortcuts ?? true,
      alertPreferences: {
        ...defaultSettings.alertPreferences,
        ...(savedSettings?.alertPreferences || {}),
      },
    })

    if (!savedSettings?.localCurrency) {
      await get().detectCurrency()
    } else if (savedSettings.localCurrency !== "USD") {
      await get().updateCurrency(savedSettings.localCurrency)
    }
  },
}))

// Auto-save settings to storage on change
useSettingsStore.subscribe((state, prevState) => {
  if (!state.isLoaded) return // Don't save before initial load

  const settingsToSave: UserSettings = {
    favoriteStocks: state.favoriteStocks,
    alertPreferences: state.alertPreferences,
    dashboardPreferences: state.dashboardPreferences,
    email: state.email,
    theme: state.theme,
    onboardingCompleted: state.onboardingCompleted,
    installedAt: state.installedAt,
    localCurrency: state.localCurrency,
    exchangeRates: state.exchangeRates,
    groqApiKey: state.groqApiKey,
    enableAIChatbot: state.enableAIChatbot,
    enableVoiceAssistant: state.enableVoiceAssistant,
    enableKeyboardShortcuts: state.enableKeyboardShortcuts,
  }

  saveToStorage(STORAGE_KEYS.SETTINGS, settingsToSave)
})
