/**
 * Header - Top navigation bar modeled precisely after the TRADEX AI design
 */
import React from "react"
import { useAlertStore } from "~src/store/alertStore"

interface HeaderProps {
  currentPage?: string
  activeSubTab?: string
  onNavigate?: (page: string, subTab?: string) => void
}

const Header: React.FC<HeaderProps> = ({ currentPage = "dashboard", activeSubTab = "terminal", onNavigate }) => {
  const unreadCount = useAlertStore((s) => s.unreadCount)

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-[#060e20]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          
          {/* TRADEX AI Logo */}
          <div 
            onClick={() => onNavigate?.("dashboard", "terminal")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="text-white font-black text-sm uppercase font-display tracking-wider flex items-center gap-1.5 select-none">
              <span className="text-brand-400 group-hover:scale-110 transition-transform">✦</span>
              TRADEX <span className="text-brand-300 font-normal">AI</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse" />
          </div>

          {/* Center Navigation Links */}
          <nav className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
            {[
              { id: "dashboard", sub: "terminal", label: "Dashboard" },
              { id: "watchlist", label: "Watchlist" },
              { id: "dashboard", sub: "portfolio", label: "Portfolio" },
              { id: "exporter", label: "Exporter" },
            ].map((item) => {
              const isActive = 
                (item.id === "dashboard" && currentPage === "dashboard" && activeSubTab === item.sub) ||
                (item.id === "watchlist" && currentPage === "watchlist") ||
                (item.id === "exporter" && currentPage === "exporter")

              return (
                <button
                  key={item.label}
                  onClick={() => onNavigate?.(item.id, item.sub)}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "text-white border-b-2 border-brand-400 font-extrabold"
                      : "text-surface-400 hover:text-surface-200"
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-4">
            
            {/* Trend Indicator Icon */}
            <button 
              onClick={() => onNavigate?.("dashboard", "radar")}
              className="text-surface-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </button>

            {/* Notification Bell */}
            <button 
              onClick={() => onNavigate?.("notifications")}
              className="relative text-surface-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-loss animate-ping" />
              )}
            </button>

            {/* Settings Gear */}
            <button 
              onClick={() => onNavigate?.("settings")}
              className="text-surface-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Profile Avatar Frame */}
            <div className="w-6 h-6 rounded-full border border-white/[0.08] overflow-hidden select-none hover:border-brand-500/40 transition-colors">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
                alt="Profile Avatar"
                className="w-full h-full object-cover" 
              />
            </div>

          </div>

        </div>
      </div>
    </header>
  )
}

export default React.memo(Header)
