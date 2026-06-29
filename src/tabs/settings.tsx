import React, { useEffect, useState } from "react"
import Header from "~src/components/Header"
import { useSettingsStore } from "~src/store/settingsStore"
import { useStockStore } from "~src/store/stockStore"
import { exportAllData, importData, getStorageEstimate } from "~src/services/indexedDBService"
import { formatRelativeTime } from "~src/utils/helpers"
import "~style.css"

function SettingsPage() {
  const settings = useSettingsStore()
  const {
    alertPreferences,
    dashboardPreferences,
    apiKeys,
    groqApiKey,
    updateSettings,
    setApiKeys,
    setGroqApiKey,
    toggleFeature,
    loadStoredSettings,
  } = settings

  const [localKeys, setLocalKeys] = useState(apiKeys)
  const [localGroqKey, setLocalGroqKey] = useState(groqApiKey || "")
  const [saveStatus, setSaveStatus] = useState("")
  const [storageInfo, setStorageInfo] = useState<{ usedMB: string; quotaMB: string } | null>(null)

  useEffect(() => {
    loadStoredSettings().then(() => {
      const state = useSettingsStore.getState()
      setLocalKeys(state.apiKeys)
      setLocalGroqKey(state.groqApiKey || "")
    })
    getStorageEstimate().then(setStorageInfo)
  }, [])

  const handleSaveKeys = async () => {
    await setApiKeys(localKeys)
    await setGroqApiKey(localGroqKey)
    setSaveStatus("Settings saved successfully")
    setTimeout(() => setSaveStatus(""), 3000)
    useStockStore.getState().initStocks()
  }

  const handleExport = async () => {
    const data = await exportAllData()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stockai-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        await importData(text)
        alert("Data imported successfully! Refreshing...")
        window.location.reload()
      } catch (err) {
        alert("Failed to import data: Invalid file format")
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      <Header currentPage="settings" onNavigate={(p, subTab) => {
        if (p === "dashboard" || p === "watchlist" || p === "exporter") {
          window.location.href = `dashboard.html?section=${p}${subTab ? `&subTab=${subTab}` : ""}`
        } else {
          window.location.href = `${p}.html`
        }
      }} />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-2.5 h-8 rounded-full bg-gradient-to-b from-brand-400 to-indigo-600 shadow-lg shadow-brand-500/20" />
          <h1 className="text-3xl font-extrabold text-white font-display tracking-tight">System Configuration</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* AI Intelligence */}
            <div className="glass-card p-6 border-brand-500/10">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="text-lg">🤖</span>
                <h2 className="text-lg font-bold text-white font-display">AI Intelligence</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-surface-400 mb-2 block uppercase tracking-wider">Groq API Key</label>
                  <input
                    type="password"
                    value={localGroqKey}
                    onChange={(e) => setLocalGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="input-dark text-xs"
                  />
                  <p className="text-[10px] text-surface-500 mt-2">
                    Required for AI Analysis, Market Summaries &amp; Predictions. Get your key at{" "}
                    <a href="https://console.groq.com/keys" target="_blank" className="text-brand-400 hover:underline">console.groq.com/keys</a>.
                  </p>
                </div>
                <div className="pt-2 space-y-3">
                  {[
                    { key: "enableAIChatbot", label: "AI Assistant (Ctrl+J)" },
                    { key: "enableVoiceAssistant", label: "Voice Search (Experimental)" },
                    { key: "enableKeyboardShortcuts", label: "Keyboard Navigation" },
                  ].map((feat) => (
                    <label key={feat.key} className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm text-surface-300 group-hover:text-white transition-colors">{feat.label}</span>
                      <div 
                        onClick={() => toggleFeature(feat.key as any)}
                        className={`w-10 h-5 rounded-full transition-all duration-300 relative border ${
                          (settings as any)[feat.key] ? "bg-brand-600 border-brand-400" : "bg-surface-800 border-white/[0.06]"
                        }`}
                      >
                        <div className={`absolute top-0.5 transition-all duration-300 w-3.5 h-3.5 rounded-full bg-white shadow-sm ${
                          (settings as any)[feat.key] ? "left-5.5" : "left-0.5"
                        }`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Monitoring Stats */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="text-lg">📊</span>
                <h2 className="text-lg font-bold text-white font-display">System Health</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                  <span className="text-xs text-surface-400">Database Engine</span>
                  <span className="text-xs font-mono text-gain">IndexedDB (Active)</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                  <span className="text-xs text-surface-400">Local Storage Usage</span>
                  <span className="text-xs font-mono text-surface-200">{storageInfo?.usedMB} MB / {storageInfo?.quotaMB.split('.')[0]} MB</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-surface-400">API Latency (Est)</span>
                  <span className="text-xs font-mono text-brand-300">~120ms</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Preferences */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="text-lg">🔔</span>
                <h2 className="text-lg font-bold text-white font-display">Alert Preferences</h2>
              </div>
              <div className="space-y-4">
                {[
                  { key: "enableBrowserNotifications", label: "Browser Notifications" },
                  { key: "enableSoundAlerts", label: "Sound Effects" },
                  { key: "enableEmailSimulation", label: "Virtual Email Log" },
                ].map((pref) => (
                  <label key={pref.key} className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-300 group-hover:text-white transition-colors">{pref.label}</span>
                    <div 
                      onClick={() => updateSettings({ alertPreferences: { ...alertPreferences, [pref.key]: !(alertPreferences as any)[pref.key] } })}
                      className={`w-10 h-5 rounded-full transition-all duration-300 relative border ${
                        (alertPreferences as any)[pref.key] ? "bg-brand-600 border-brand-400" : "bg-surface-800 border-white/[0.06]"
                      }`}
                    >
                      <div className={`absolute top-0.5 transition-all duration-300 w-3.5 h-3.5 rounded-full bg-white shadow-sm ${
                        (alertPreferences as any)[pref.key] ? "left-5.5" : "left-0.5"
                      }`} />
                    </div>
                  </label>
                ))}
                <div className="pt-2">
                  <label className="text-[10px] font-bold text-surface-500 mb-2 block uppercase">Scan Interval</label>
                  <select
                    value={dashboardPreferences.updateInterval}
                    onChange={(e) => updateSettings({
                      dashboardPreferences: { ...dashboardPreferences, updateInterval: Number(e.target.value) }
                    })}
                    className="input-dark text-xs py-2"
                  >
                    <option value={2000}>2s (Ultra-High)</option>
                    <option value={5000}>5s (Active)</option>
                    <option value={10000}>10s (Standard)</option>
                    <option value={30000}>30s (Eco)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="text-lg">💾</span>
                <h2 className="text-lg font-bold text-white font-display">Data Management</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleExport} className="btn-secondary text-[10px] py-3 flex flex-col items-center gap-1.5 h-auto">
                  <span>📤</span> Export Backup
                </button>
                <label className="btn-secondary text-[10px] py-3 flex flex-col items-center gap-1.5 h-auto cursor-pointer">
                  <span>📥</span> Import Data
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/[0.04] flex items-center justify-between">
          <div className="text-xs text-surface-500 italic">
            Changes are saved to locally encrypted IndexedDB.
          </div>
          <div className="flex items-center gap-4">
            {saveStatus && <span className="text-xs font-bold text-gain animate-pulse">{saveStatus}</span>}
            <button onClick={handleSaveKeys} className="btn-primary px-10">Save All Changes</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
