/**
 * Alert & notification store — Enhanced with new alert types,
 * IndexedDB persistence, and smart alert management
 */
import { create } from "zustand"
import type { Alert, AppNotification, AlertType } from "~src/types"
import { generateId } from "~src/utils/helpers"
import { saveAlert, getAllAlerts, deleteAlert as deleteFromIDB, clearAlerts as clearIDB } from "~src/services/indexedDBService"

interface AlertState {
  alerts: Alert[]
  notifications: AppNotification[]
  unreadCount: number
  isLoaded: boolean

  // Actions
  loadAlerts: () => Promise<void>
  addAlert: (alert: Omit<Alert, "id" | "createdAt" | "isActive">) => Promise<void>
  removeAlert: (id: string) => Promise<void>
  toggleAlert: (id: string) => void
  triggerAlert: (id: string) => void
  updateAlert: (id: string, updates: Partial<Alert>) => void
  addNotification: (notif: Omit<AppNotification, "id" | "timestamp" | "read">) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearNotifications: () => void
  clearAllAlerts: () => Promise<void>
  getAlertsBySymbol: (symbol: string) => Alert[]
  getAlertsByType: (type: AlertType) => Alert[]
  getActiveAlertCount: () => number
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  notifications: [
    {
      id: "welcome-1",
      type: "system",
      title: "🚀 Welcome to StockAI",
      message: "Your AI-powered stock monitoring dashboard is ready. Add stocks to your watchlist to get started!",
      timestamp: Date.now(),
      read: false,
    },
  ],
  unreadCount: 1,
  isLoaded: false,

  loadAlerts: async () => {
    try {
      const alerts = await getAllAlerts()
      set({ alerts, isLoaded: true })
    } catch (err) {
      console.error("Failed to load alerts from IndexedDB:", err)
      set({ isLoaded: true })
    }
  },

  addAlert: async (alertData) => {
    const alert: Alert = {
      ...alertData,
      id: generateId(),
      isActive: true,
      createdAt: Date.now(),
      cooldownMinutes: alertData.cooldownMinutes || 15,
      priority: alertData.priority || "medium",
    }
    
    await saveAlert(alert).catch(() => {})
    set((state) => ({ alerts: [...state.alerts, alert] }))
  },

  removeAlert: async (id) => {
    await deleteFromIDB(id).catch(() => {})
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }))
  },

  toggleAlert: (id) => {
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.id === id ? { ...a, isActive: !a.isActive } : a
      )
      // Persist change
      const updated = alerts.find(a => a.id === id)
      if (updated) saveAlert(updated).catch(() => {})
      return { alerts }
    })
  },

  triggerAlert: (id) => {
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.id === id ? { ...a, isActive: false, triggeredAt: Date.now(), lastTriggeredAt: Date.now() } : a
      )
      const updated = alerts.find(a => a.id === id)
      if (updated) saveAlert(updated).catch(() => {})
      return { alerts }
    })
  },

  updateAlert: (id, updates) => {
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      )
      const updated = alerts.find(a => a.id === id)
      if (updated) saveAlert(updated).catch(() => {})
      return { alerts }
    })
  },

  addNotification: (notifData) => {
    const notif: AppNotification = {
      ...notifData,
      id: generateId(),
      timestamp: Date.now(),
      read: false,
    }
    set((state) => ({
      notifications: [notif, ...state.notifications].slice(0, 200),
      unreadCount: state.unreadCount + 1,
    }))
  },

  markRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

  clearAllAlerts: async () => {
    await clearIDB().catch(() => {})
    set({ alerts: [] })
  },

  getAlertsBySymbol: (symbol) =>
    get().alerts.filter((a) => a.symbol === symbol),

  getAlertsByType: (type) =>
    get().alerts.filter((a) => a.type === type),

  getActiveAlertCount: () =>
    get().alerts.filter((a) => a.isActive).length,
}))
