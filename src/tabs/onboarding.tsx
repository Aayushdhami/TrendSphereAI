/**
 * Onboarding Page — First-time setup wizard
 * Guides users through stock selection, API key setup, alert config, and notifications
 */
import React, { useState } from "react"
import { useSettingsStore } from "~src/store/settingsStore"
import { useStockStore } from "~src/store/stockStore"
import { STOCK_DATABASE } from "~src/utils/constants"
import "~style.css"

type Step = "welcome" | "stocks" | "alerts" | "done"

function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome")
  const {
    favoriteStocks, addFavorite, removeFavorite,
    alertPreferences, updateSettings, completeOnboarding,
    setApiKeys, apiKeys, email, loadStoredSettings
  } = useSettingsStore()
  const addToWatchlist = useStockStore((s) => s.addToWatchlist)


  const addurl = "https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/logout"
  const [localKeys, setLocalKeys] = useState({
    finnhub: apiKeys.finnhub || "",
    alphaVantage: apiKeys.alphaVantage || "",
    fmp: apiKeys.fmp || "",
    URL: addurl,
  })
  const [localEmail, setLocalEmail] = useState(email)

  // Load existing settings on mount so we don't start blank if returning
  React.useEffect(() => {
    loadStoredSettings().then(() => {
      const state = useSettingsStore.getState()
      setLocalKeys({
        finnhub: state.apiKeys.finnhub || "",
        alphaVantage: state.apiKeys.alphaVantage || "",
        fmp: state.apiKeys.fmp || "",
        URL: addurl,
      })
      setLocalEmail(state.email)
    })
  }, [])

  const steps: Step[] = ["welcome", "stocks", "alerts", "done"]
  const stepIndex = steps.indexOf(step)

  const next = () => {
    const nextIdx = stepIndex + 1
    if (nextIdx < steps.length) setStep(steps[nextIdx])
  }
  const prev = () => {
    const prevIdx = stepIndex - 1
    if (prevIdx >= 0) setStep(steps[prevIdx])
  }

  const finish = async () => {
    // Save API keys
    await setApiKeys(localKeys)
    // Save email
    updateSettings({ email: localEmail })
    // Add favorites to watchlist
    favoriteStocks.forEach((s) => addToWatchlist(s))
    // Mark onboarding complete
    completeOnboarding()
    // Request notification permission
    if (alertPreferences.enableBrowserNotifications && typeof Notification !== "undefined") {
      Notification.requestPermission()
    }
    // Redirect to dashboard
    window.location.href = "./dashboard.html"
  }

  const toggleStock = (symbol: string) => {
    if (favoriteStocks.includes(symbol)) removeFavorite(symbol)
    else addFavorite(symbol)
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs transition-all duration-300 ${i <= stepIndex
                ? "bg-gradient-to-br from-brand-400 via-indigo-500 to-brand-600 text-white shadow-lg shadow-brand-500/25 border border-white/[0.06] scale-105 font-bold"
                : "bg-surface-950/40 border border-white/[0.03] text-surface-500 font-semibold"
                }`}>{i + 1}</div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 rounded transition-all duration-300 ${i < stepIndex ? "bg-brand-500" : "bg-white/[0.04]"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="glass-card p-8">
          {/* Step 1: Welcome */}
          {step === "welcome" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 via-indigo-500 to-brand-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/35 border border-white/[0.06]">
                <span className="text-2xl font-black text-white">S</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3 font-display tracking-tight">
                Welcome to Stock<span className="gradient-text">AI</span>
              </h1>
              <p className="text-surface-400 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                Your AI-powered stock monitoring dashboard with real-time data from
                Finnhub, Alpha Vantage, Yahoo Finance, and Financial Modeling Prep.
              </p>
              <div className="grid grid-cols-2 gap-3.5 mb-8 max-w-sm mx-auto text-left">
                {["📈 Real-time Prices", "🤖 AI Predictions", "🔔 Smart Alerts", "📊 Technical Analysis"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs font-semibold text-surface-300 uppercase tracking-wide bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl">
                    <span>{f.split(" ")[0]}</span>
                    <span>{f.split(" ").slice(1).join(" ")}</span>
                  </div>
                ))}
              </div>
              <button onClick={next} className="btn-primary text-sm px-8 py-2.5">
                Get Started →
              </button>
            </div>
          )}

          {/* Step 3: Select Stocks */}
          {step === "stocks" && (
            <div>
              <h2 className="text-xl font-extrabold text-white mb-2 font-display tracking-tight">📈 Select Your Stocks</h2>
              <p className="text-surface-400 text-xs mb-4">Choose stocks to monitor. You can always add more later.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto no-scrollbar">
                {STOCK_DATABASE.map((stock) => {
                  const isSelected = favoriteStocks.includes(stock.symbol)
                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => toggleStock(stock.symbol)}
                      className={`p-3 rounded-xl text-left transition-all border ${isSelected
                        ? "bg-gradient-to-br from-brand-500/15 to-indigo-500/15 border-brand-500/35 text-white shadow-md shadow-brand-500/5 scale-[1.02]"
                        : "bg-surface-950/40 border-white/[0.03] hover:border-white/[0.08] text-surface-400 hover:text-surface-200 transition-all duration-300"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{stock.symbol}</span>
                        {isSelected && <span className="text-brand-400 font-extrabold">✓</span>}
                      </div>
                      <div className="text-2xs mt-0.5 truncate opacity-70">{stock.name}</div>
                    </button>
                  )
                })}
              </div>
              <p className="text-2xs font-semibold text-surface-500 uppercase tracking-widest mt-4">{favoriteStocks.length} stocks selected</p>
              <div className="flex justify-between mt-4">
                <button onClick={prev} className="btn-secondary text-sm">← Back</button>
                <button onClick={next} className="btn-primary text-sm">Continue →</button>
              </div>
            </div>
          )}

          {/* Step 4: Alert Preferences */}
          {step === "alerts" && (
            <div>
              <h2 className="text-xl font-extrabold text-white mb-2 font-display tracking-tight">🔔 Alert Preferences</h2>
              <p className="text-surface-400 text-xs mb-6">Configure how you want to receive stock alerts.</p>
              <div className="space-y-4">
                {[
                  { key: "enableBrowserNotifications", label: "Browser Notifications", desc: "Get Chrome push notifications for triggered alerts" },
                  { key: "enableSoundAlerts", label: "Sound Alerts", desc: "Play a sound when an alert is triggered" },
                  { key: "enableEmailSimulation", label: "Email Alerts (Simulated)", desc: "Log alert events for email notification simulation" },
                ].map((pref) => (
                  <label key={pref.key} className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-950/40 border border-white/[0.03] cursor-pointer hover:border-white/[0.08] transition-all duration-300">
                    <input
                      type="checkbox"
                      checked={(alertPreferences as any)[pref.key]}
                      onChange={(e) => updateSettings({
                        alertPreferences: { ...alertPreferences, [pref.key]: e.target.checked },
                      })}
                      className="mt-0.5 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500"
                    />
                    <div>
                      <div className="text-sm font-bold text-white">{pref.label}</div>
                      <div className="text-2xs text-surface-500 mt-0.5">{pref.desc}</div>
                    </div>
                  </label>
                ))}
                <div>
                  <label className="text-xs font-medium text-surface-300 mb-1.5 block">Email Address (optional)</label>
                  <input type="email" value={localEmail}
                    onChange={(e) => setLocalEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="input-dark text-sm" />
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={prev} className="btn-secondary text-sm">← Back</button>
                <button onClick={next} className="btn-primary text-sm">Continue →</button>
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === "done" && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-extrabold text-white mb-3 font-display tracking-tight">You're All Set!</h2>
              <p className="text-surface-400 text-xs mb-6 leading-relaxed">
                StockAI is ready to monitor {favoriteStocks.length} stocks with
                {localKeys.finnhub ? " real-time Finnhub data feeds" : " simulated local data engines"}.
              </p>

              <div className="glass-card p-4 text-left mb-6 space-y-2.5">
                <div className="flex items-center justify-between text-xs p-1">
                  <span className="text-surface-400 font-semibold">Finnhub API Integration</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded-md border text-[9px] ${localKeys.finnhub
                    ? "text-gain bg-gain/10 border-gain/20 shadow-sm shadow-gain/5"
                    : "text-surface-400 bg-white/[0.04] border-white/[0.04]"
                    }`}>{localKeys.finnhub ? "CONNECTED" : "NOT CONFIGURED"}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-1">
                  <span className="text-surface-400 font-semibold">Alpha Vantage Technical Indicators</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded-md border text-[9px] ${localKeys.alphaVantage
                    ? "text-gain bg-gain/10 border-gain/20 shadow-sm shadow-gain/5"
                    : "text-surface-400 bg-white/[0.04] border-white/[0.04]"
                    }`}>{localKeys.alphaVantage ? "CONNECTED" : "NOT CONFIGURED"}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-1">
                  <span className="text-surface-400 font-semibold">Yahoo Finance Feed API</span>
                  <span className="text-gain bg-gain/10 border-gain/20 font-mono font-bold px-2 py-0.5 rounded-md border shadow-sm shadow-gain/5 text-[9px]">ACTIVE DATA</span>
                </div>
                <div className="flex items-center justify-between text-xs p-1">
                  <span className="text-surface-400 font-semibold">FMP Fundamental Analytics</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded-md border text-[9px] ${localKeys.fmp
                    ? "text-gain bg-gain/10 border-gain/20 shadow-sm shadow-gain/5"
                    : "text-surface-400 bg-white/[0.04] border-white/[0.04]"
                    }`}>{localKeys.fmp ? "CONNECTED" : "NOT CONFIGURED"}</span>
                </div>
              </div>

              <button onClick={finish} className="btn-primary text-sm px-8 py-2.5">
                Open Dashboard Console 🚀
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage
