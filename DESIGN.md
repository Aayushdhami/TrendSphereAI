---
name: Tradex Pro Noir
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#ffb3ad'
  on-tertiary: '#68000a'
  tertiary-container: '#ff5451'
  on-tertiary-container: '#5c0008'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style
The design system is engineered for high-frequency traders and financial analysts who demand a focused, high-performance environment. The personality is "Synthetic Intelligence"—calculating, precise, and sophisticated. 

The aesthetic merges **Modern Minimalism** with **Glassmorphism**, creating a high-end terminal experience. By moving away from "Traffic Light" green and red, the design system signals a more nuanced, AI-driven approach to market sentiment. The interface utilizes deep layering, subtle luminescence, and high-contrast typography to ensure data clarity in a dark-mode-first environment.

## Colors
This design system utilizes a "Noir Terminal" palette to reduce eye strain during long sessions while highlighting critical data points.

*   **Primary (Electric Violet):** Used for primary actions, active states, and AI-suggested pathways.
*   **Secondary (Cyan):** Replaces traditional green for positive momentum, gains, and "buy" signals.
*   **Tertiary (Deep Rose):** Replaces traditional red for negative trends, losses, and "sell" signals.
*   **Neutral (Deep Slate):** The foundational background, ranging from deep voids to elevated glass surfaces.
*   **Accent (Amber):** Reserved strictly for warnings, pending orders, or high-volatility alerts.

## Typography
Typography is the core of the trading experience. The design system uses a dual-font approach: **Geist** for structural UI and headers to provide a clean, modern frame, and **JetBrains Mono** for all numerical data and body text to ensure maximum legibility of tickers, prices, and timestamps. All data-heavy elements must use tabular figures to prevent "jittering" during real-time price updates.

## Layout & Spacing
The layout follows a **Fluid Grid** model optimized for multi-monitor setups and dense information display.

*   **Desktop:** 12-column grid with 16px gutters. Sidebars are collapsible to maximize chart real estate.
*   **Mobile:** 4-column grid with 16px margins. Bottom navigation is used for core trading actions.
*   **Density:** The design system prioritizes a "Compact" density setting by default, allowing more data rows to be visible without scrolling.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Glassmorphism** rather than traditional shadows.

1.  **Floor (Level 0):** Deep Slate (#020617) - The base canvas.
2.  **Surface (Level 1):** Slate (#0F172A) - For sidebar and secondary panels.
3.  **Glass (Level 2):** Translucent Slate (Alpha 60%) with a 12px Backdrop Blur - Used for modals, tooltips, and floating action panels.
4.  **Luminescence:** Active elements or selected cards feature a 1px inner stroke of Electric Violet at 20% opacity to simulate a glowing edge.

## Shapes
The shape language is "Soft-Industrial." The design system uses a conservative 4px (Soft) radius for most UI components to maintain a professional, high-performance tool feel. Larger containers like primary chart areas use 8px (Large) to subtly differentiate them from smaller data input fields. Buttons should never be fully rounded (pill), as the sharp-yet-soft corners better reflect the precision of AI trading.

## Components
*   **Buttons:** Primary buttons use a solid Electric Violet fill with white text. Secondary buttons use a "Ghost" style with a 1px Electric Violet border and glass background.
*   **Data Chips:** Positive price movements are encapsulated in a Cyan tinted glass chip (10% opacity) with Cyan text. Negative movements use Deep Rose with matching styling.
*   **Input Fields:** Darker than the surface background with a 1px Slate-800 border that glows Electric Violet on focus.
*   **Cards/Panels:** Use a 1px border of `rgba(255,255,255,0.05)` to define boundaries without adding visual weight.
*   **Status Indicators:** Use a pulsating glow effect for "Live" data connections, utilizing the Cyan palette.
*   **Execution Bar:** A sticky bottom component for trade execution, featuring a heavy glass blur and high-contrast action buttons.