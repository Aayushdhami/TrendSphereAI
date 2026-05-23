/**
 * PredictionGauge - Circular gauge showing AI prediction confidence
 */
import React from "react"
import { RECOMMENDATION_COLORS } from "~src/utils/constants"
import type { Recommendation } from "~src/types"

interface PredictionGaugeProps {
  value: number
  recommendation: Recommendation
  size?: number
  label?: string
}

const PredictionGauge: React.FC<PredictionGaugeProps> = ({
  value,
  recommendation,
  size = 90,
  label,
}) => {
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (value / 100) * circumference
  const color = RECOMMENDATION_COLORS[recommendation] || "#6366f1"
  const recLabel = recommendation.replace("-", " ").toUpperCase()

  return (
    <div className="flex flex-col items-center gap-1.5 group">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Ambient background blur glow */}
        <div 
          className="absolute inset-0 rounded-full opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-500"
          style={{ backgroundColor: color }}
        />
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={`glowGrad-${recommendation}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={`${color}30`} />
            </linearGradient>
            <filter id="neonGlow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Inner circle border */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(30, 41, 59, 0.4)"
            strokeWidth={5}
          />
          {/* Main outer stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.04)"
            strokeWidth={3}
          />
          {/* Glowing Neon Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#glowGrad-${recommendation})`}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            filter="url(#neonGlow)"
            style={{
              transition: "stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>
        {/* Center text with neon glow */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black font-display text-white leading-none tracking-tighter" style={{ textShadow: `0 0 10px ${color}30` }}>
            {Math.round(value)}%
          </span>
        </div>
      </div>
      {label && <span className="text-[9px] font-bold text-surface-500 uppercase tracking-widest leading-none mt-1">{label}</span>}
      <span
        className="text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full border transition-all duration-300 group-hover:scale-105"
        style={{ 
          color,
          borderColor: `${color}30`,
          backgroundColor: `${color}10`,
          textShadow: `0 0 8px ${color}20`
        }}
      >
        {recLabel}
      </span>
    </div>
  )
}

export default React.memo(PredictionGauge)
