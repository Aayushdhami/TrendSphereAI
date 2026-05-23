/**
 * Notifications Page
 * Displays alert history and system notifications
 */
import React from "react"
import Header from "~src/components/Header"
import { useAlertStore } from "~src/store/alertStore"
import { formatRelativeTime } from "~src/utils/helpers"
import "~style.css"

function NotificationsPage() {
  const { notifications, markRead, markAllRead, clearNotifications } = useAlertStore()

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      <Header currentPage="notifications" onNavigate={(p, subTab) => {
        if (p === "dashboard" || p === "watchlist" || p === "exporter") {
          window.location.href = `dashboard.html?section=${p}${subTab ? `&subTab=${subTab}` : ""}`
        } else {
          window.location.href = `${p}.html`
        }
      }} />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-7 rounded-full bg-gradient-to-b from-brand-400 to-indigo-600 shadow-md shadow-brand-500/20" />
            <h1 className="text-2xl font-extrabold text-white mb-0.5 font-display tracking-tight">System Alerts</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={markAllRead} className="btn-secondary text-xs py-2 px-4 rounded-xl">Mark all read</button>
            <button onClick={clearNotifications} className="btn-ghost text-xs text-loss hover:text-loss hover:bg-loss/10 py-2 px-4 rounded-xl font-semibold">Clear all</button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
            <span className="text-4xl mb-4">📭</span>
            <h3 className="text-lg font-bold text-white mb-2">No notifications yet</h3>
            <p className="text-sm text-surface-400">
              When your stock alerts trigger, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.read && markRead(notif.id)}
                className={`glass-card p-5 flex gap-4 transition-all duration-300 cursor-pointer ${
                  !notif.read 
                    ? "border-brand-500/35 bg-gradient-to-r from-brand-500/10 to-indigo-500/5 shadow-lg shadow-brand-500/5" 
                    : "hover:border-white/[0.08]"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                  !notif.read 
                    ? "bg-brand-500/10 border-brand-500/20 text-brand-300" 
                    : "bg-surface-950/60 border-white/[0.04] text-surface-400"
                }`}>
                  <span className="text-sm">{notif.type === "alert" ? "🔔" : notif.type === "prediction" ? "🤖" : notif.type === "market" ? "📈" : "ℹ️"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className={`font-semibold text-sm ${!notif.read ? "text-white" : "text-surface-300"}`}>
                      {notif.title}
                    </h3>
                    <span className="text-2xs text-surface-500 font-medium whitespace-nowrap">
                      {formatRelativeTime(notif.timestamp)}
                    </span>
                  </div>
                  <p className={`text-xs ${!notif.read ? "text-surface-300" : "text-surface-500"} leading-relaxed`}>
                    {notif.message}
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-3.5 flex-shrink-0 animate-pulse shadow-sm shadow-brand-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
