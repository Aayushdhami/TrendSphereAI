/**
 * SparklineChart - Tiny inline chart for stock cards using Recharts
 */
import React, { useMemo } from "react"
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts"

interface SparklineChartProps {
  data: number[]
  color?: string
  height?: number
  positive?: boolean
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color,
  height = 40,
  positive = true,
}) => {
  const chartData = useMemo(
    () => data.map((value, index) => ({ index, value })),
    [data]
  )

  const chartColor = color || (positive ? "#22c55e" : "#ef4444")

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`spark-${positive ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={["dataMin", "dataMax"]} hide />
        <Area
          type="monotone"
          dataKey="value"
          stroke={chartColor}
          strokeWidth={1.5}
          fill={`url(#spark-${positive ? "up" : "down"})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default React.memo(SparklineChart)
