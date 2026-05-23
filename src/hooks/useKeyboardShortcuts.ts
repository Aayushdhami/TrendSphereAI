/**
 * Keyboard Shortcuts Hook — Global keyboard shortcuts for power users
 * Provides navigation, search, and quick actions without mouse
 */
import { useEffect, useCallback } from "react"

interface ShortcutAction {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
}

export function useKeyboardShortcuts(shortcuts: ShortcutAction[], enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        // Only allow Escape key in inputs
        if (e.key !== "Escape") return
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
        const altMatch = shortcut.alt ? e.altKey : !e.altKey

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault()
          e.stopPropagation()
          shortcut.action()
          return
        }
      }
    },
    [shortcuts, enabled]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}

/** Standard dashboard keyboard shortcuts */
export function getDashboardShortcuts(handlers: {
  goToDashboard?: () => void
  goToWatchlist?: () => void
  goToPortfolio?: () => void
  goToExporter?: () => void
  goToSettings?: () => void
  goToNotifications?: () => void
  toggleSearch?: () => void
  toggleAIChatbot?: () => void
  refreshData?: () => void
  goBack?: () => void
}): ShortcutAction[] {
  const shortcuts: ShortcutAction[] = []

  if (handlers.goToDashboard) {
    shortcuts.push({ key: "1", alt: true, description: "Go to Dashboard", action: handlers.goToDashboard })
  }
  if (handlers.goToWatchlist) {
    shortcuts.push({ key: "2", alt: true, description: "Go to Watchlist", action: handlers.goToWatchlist })
  }
  if (handlers.goToPortfolio) {
    shortcuts.push({ key: "3", alt: true, description: "Go to Portfolio", action: handlers.goToPortfolio })
  }
  if (handlers.goToExporter) {
    shortcuts.push({ key: "4", alt: true, description: "Go to Exporter", action: handlers.goToExporter })
  }
  if (handlers.toggleSearch) {
    shortcuts.push({ key: "k", ctrl: true, description: "Toggle Search", action: handlers.toggleSearch })
    shortcuts.push({ key: "/", description: "Focus Search", action: handlers.toggleSearch })
  }
  if (handlers.toggleAIChatbot) {
    shortcuts.push({ key: "j", ctrl: true, description: "Toggle AI Chatbot", action: handlers.toggleAIChatbot })
  }
  if (handlers.refreshData) {
    shortcuts.push({ key: "r", ctrl: true, shift: true, description: "Refresh Data", action: handlers.refreshData })
  }
  if (handlers.goToSettings) {
    shortcuts.push({ key: ",", ctrl: true, description: "Open Settings", action: handlers.goToSettings })
  }
  if (handlers.goToNotifications) {
    shortcuts.push({ key: "n", alt: true, description: "Notifications", action: handlers.goToNotifications })
  }
  if (handlers.goBack) {
    shortcuts.push({ key: "Escape", description: "Go Back / Close", action: handlers.goBack })
  }

  return shortcuts
}

/** Get all shortcuts for help display */
export function getShortcutsList(): { category: string; shortcuts: { keys: string; description: string }[] }[] {
  return [
    {
      category: "Navigation",
      shortcuts: [
        { keys: "Alt + 1", description: "Dashboard" },
        { keys: "Alt + 2", description: "Watchlist" },
        { keys: "Alt + 3", description: "Portfolio" },
        { keys: "Alt + 4", description: "Exporter" },
        { keys: "Alt + N", description: "Notifications" },
        { keys: "Ctrl + ,", description: "Settings" },
        { keys: "Esc", description: "Go Back / Close modal" },
      ],
    },
    {
      category: "Actions",
      shortcuts: [
        { keys: "Ctrl + K  or  /", description: "Search stocks" },
        { keys: "Ctrl + J", description: "Toggle AI Chatbot" },
        { keys: "Ctrl + Shift + R", description: "Refresh market data" },
      ],
    },
  ]
}
