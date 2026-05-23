/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary brand palette (Electric Violet)
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065"
        },
        // Fintech dark theme (Tradex Pro Noir Slate)
        surface: {
          50: "#dae2fd",
          100: "#cbc3d7",
          200: "#cbd5e1",
          300: "#958ea0",
          400: "#64748b",
          500: "#494454",
          600: "#2d3449",
          700: "#222a3d",
          800: "#171f33",
          850: "#131b2e",
          900: "#0b1326",
          950: "#060e20"
        },
        // Stock market semantic colors (Cyan/Deep Rose instead of Traffic Light green/red)
        gain: {
          light: "#67e8f9",
          DEFAULT: "#06b6d4",
          dark: "#0891b2",
          muted: "rgba(6, 182, 212, 0.12)"
        },
        loss: {
          light: "#fca5a5",
          DEFAULT: "#ff5451",
          dark: "#b91c1c",
          muted: "rgba(255, 84, 81, 0.12)"
        },
        warning: {
          light: "#fbbf24",
          DEFAULT: "#f59e0b",
          dark: "#d97706",
          muted: "rgba(245, 158, 11, 0.15)"
        },
        // Chart colors
        chart: {
          blue: "#3b82f6",
          purple: "#8b5cf6",
          cyan: "#06b6d4",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Outfit", "Inter", "sans-serif"]
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }]
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "glow": "glow 2s ease-in-out infinite alternate",
        "ticker": "ticker 20s linear infinite",
        "shimmer": "shimmer 2s linear infinite"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(99, 102, 241, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }
        },
        ticker: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      backdropBlur: {
        xs: "2px"
      },
      boxShadow: {
        "glow-sm": "0 0 10px rgba(99, 102, 241, 0.15)",
        "glow-md": "0 0 20px rgba(99, 102, 241, 0.2)",
        "glow-lg": "0 0 40px rgba(99, 102, 241, 0.25)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)"
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms")
  ]
}
