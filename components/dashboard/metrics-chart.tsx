"use client"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  Customized,
} from "recharts"
import { TrendingUp } from "lucide-react"
import { useInteractionMetrics, useKPIs, formatNumber } from "@/lib/hooks/use-dashboard-data"
import type { DashboardSource } from "@/lib/types"

const chartConfig = {
  views: {
    label: "Views",
    color: "var(--chart-1)",
  },
}

function formatDateLabel(dateStr: string, period: string): string {
  const date = new Date(dateStr)
  if (period === "24h") return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  if (period === "7d") return date.toLocaleDateString("en-US", { weekday: "short" })
  if (period === "14d" || period === "30d" || period === "90d" || period === "custom") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}

function getTickInterval(period: string, dataLength: number): number {
  if (period === "24h") return 0
  if (period === "7d") return 0
  if (period === "14d") return Math.max(0, Math.floor(dataLength / 7) - 1)
  if (period === "30d") return Math.max(0, Math.floor(dataLength / 6) - 1)
  if (period === "90d") return Math.max(0, Math.floor(dataLength / 7) - 1)
  if (period === "custom") {
    if (dataLength <= 7) return 0
    return Math.max(0, Math.floor(dataLength / 7) - 1)
  }
  return Math.max(0, Math.floor(dataLength / 6) - 1)
}

function getPeriodLabel(period: string, dateFrom?: string, dateTo?: string): string {
  switch (period) {
    case "24h": return "Last 24 hours"
    case "7d": return "Last 7 days"
    case "14d": return "Last 14 days"
    case "30d": return "Last 30 days"
    case "90d": return "Last 90 days"
    case "all": return "All time"
    case "custom":
      if (dateFrom && dateTo) {
        const from = new Date(dateFrom + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
        const to = new Date(dateTo + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
        return `${from} – ${to}`
      }
      return "Custom range"
    default: return "Last 30 days"
  }
}

interface MetricsChartProps {
  period?: string
  platform?: string
  /** Ignored — kept so legacy callers still type-check. */
  source?: DashboardSource
  dateFrom?: string
  dateTo?: string
  /** Ignored — kept so legacy callers still type-check. */
  publishedOnly?: boolean
}

export function MetricsChart({ period = "30d", platform = "all", dateFrom, dateTo }: MetricsChartProps) {
  const { data: metricsData, loading, isRefreshing } = useInteractionMetrics({ period, platform, dateFrom, dateTo })
  const { data: kpiData } = useKPIs({ period, platform, dateFrom, dateTo })
  const selectedProjectName: string | null = null

  if (loading) {
    return (
      <div className="rounded-3xl glass shadow-fluid overflow-hidden animate-fade-in relative" style={{ animationDelay: "300ms" }}>
        <div className="absolute inset-0 inner-light rounded-3xl pointer-events-none" />
        <div className="relative p-5 sm:p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-2">
              <div className="h-3 w-32 bg-muted/50 rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted/40 rounded animate-pulse" />
            </div>
          </div>
          <div className="mb-8 flex items-baseline gap-3">
            <div className="h-14 w-44 bg-muted/50 rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted/40 rounded animate-pulse" />
          </div>
          <div className="h-[300px] sm:h-[380px] w-full bg-muted/30 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  const chartData = metricsData.map((item) => ({
    date: formatDateLabel(item.date, period),
    fullDate: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    views: item.viewCount,
  }))

  const tickInterval = getTickInterval(period, chartData.length)
  const totalViews = metricsData.reduce((acc, item) => acc + item.viewCount, 0)

  const prevViewCount = kpiData?.prevViewCount
  const growth = prevViewCount && prevViewCount > 0
    ? ((totalViews - prevViewCount) / prevViewCount) * 100
    : 0

  // Peak + daily average for visual anchors
  let peakIndex = -1
  let peakValue = 0
  chartData.forEach((d, i) => {
    if (d.views > peakValue) {
      peakValue = d.views
      peakIndex = i
    }
  })
  const peak = peakIndex >= 0 ? chartData[peakIndex] : null

  return (
    <div className="rounded-3xl glass shadow-fluid overflow-hidden animate-fade-in relative" style={{ animationDelay: "300ms" }}>
      <div className="absolute inset-0 inner-light rounded-3xl pointer-events-none" />

      {/* Ambient gradient halo — anchored to peak side for asymmetric emphasis */}
      <div
        aria-hidden
        className="absolute -top-24 -right-16 h-64 w-64 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--chart-2) 55%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--chart-1) 50%, transparent), transparent 70%)",
        }}
      />

      {isRefreshing && (
        <div className="absolute top-4 right-4 z-10">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      )}

      {/* Faded project-name watermark — hidden below md, where the card is too narrow to read it */}
      {selectedProjectName && (
        <div
          aria-hidden
          className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none overflow-hidden"
        >
          <span
            className="font-extrabold uppercase select-none whitespace-nowrap"
            style={{
              fontSize: "clamp(6.5rem, 22vw, 15rem)",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              backgroundImage: `linear-gradient(180deg,
                color-mix(in oklch, var(--gradient-from) 100%, white 15%) 0%,
                color-mix(in oklch, var(--gradient-to)   100%, white 25%) 50%,
                color-mix(in oklch, var(--gradient-to)   100%, black 10%) 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              opacity: 0.13,
              textShadow: "0 1px 0 oklch(1 0 0 / 0.4)",
            }}
          >
            {selectedProjectName}
          </span>
        </div>
      )}

      <div className={`relative p-5 sm:p-8 transition-opacity duration-200 ${isRefreshing ? "opacity-70" : ""}`}>
        {/* Header row — eyebrow (left), hero bubble (center), growth pill (right) on one plane */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-5 sm:mb-7">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ background: "var(--chart-1)" }}
              />
              <h3 className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground truncate">
                Views Overview
              </h3>
            </div>
            <p className="text-xs text-muted-foreground/70 pl-3.5 truncate">{getPeriodLabel(period, dateFrom, dateTo)}</p>
          </div>

          {/* Centered hero bubble — glass capsule housing the big number */}
          <div className="relative inline-flex items-baseline gap-2 rounded-full glass shadow-fluid px-4 py-1.5 sm:px-5 sm:py-2">
            <div className="absolute inset-0 inner-light rounded-full pointer-events-none" />
            <div
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none opacity-50"
              style={{
                background:
                  "radial-gradient(circle at 30% 0%, color-mix(in oklch, var(--chart-1) 30%, transparent), transparent 65%)",
              }}
            />
            <span className="relative text-lg sm:text-2xl font-semibold tracking-[-0.02em] text-foreground tabular-nums leading-none">
              {formatNumber(totalViews)}
            </span>
            <span className="relative hidden sm:inline text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80 leading-none">
              total views
            </span>
          </div>

          <div className="flex justify-end">
            {growth !== 0 && prevViewCount && (
              <div
                className={`flex items-center gap-1.5 rounded-full glass-subtle px-3 py-1.5 text-xs font-semibold tabular-nums whitespace-nowrap ${
                  growth > 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                <TrendingUp className={`h-3 w-3 ${growth < 0 ? "rotate-180" : ""}`} />
                <span>{growth > 0 ? "+" : ""}{growth.toFixed(0)}% vs prev</span>
              </div>
            )}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-[300px] sm:h-[380px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
            <span>No view data available for this period</span>
            <span className="text-xs opacity-60">Try selecting a different time range</span>
          </div>
        ) : (
          <ChartContainer
            key={`views-${period}-${dateFrom}-${dateTo}`}
            config={chartConfig}
            className="h-[300px] sm:h-[380px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 36, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="viewsPeakFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.75} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeOpacity={0.55}
                  strokeDasharray="2 5"
                />

                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickMargin={10}
                  interval={tickInterval}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickFormatter={(value) => formatNumber(value)}
                  width={52}
                  tickMargin={6}
                  tickCount={4}
                />

                <ChartTooltip
                  content={<ChartTooltipContent labelKey="fullDate" />}
                  cursor={{ fill: "var(--accent)", opacity: 0.25, radius: 8 }}
                />

                <Bar
                  dataKey="views"
                  radius={[8, 8, 2, 2]}
                  maxBarSize={32}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === peakIndex ? "url(#viewsPeakFill)" : "url(#viewsFill)"}
                    />
                  ))}
                </Bar>

                {peak && peakValue > 0 && (
                  <Customized
                    component={(chartProps: any) => {
                      const xAxisMap = chartProps?.xAxisMap
                      const yAxisMap = chartProps?.yAxisMap
                      if (!xAxisMap || !yAxisMap) return null
                      const xAxis: any = Object.values(xAxisMap)[0]
                      const yAxis: any = Object.values(yAxisMap)[0]
                      const xScale = xAxis?.scale
                      const yScale = yAxis?.scale
                      if (!xScale || !yScale) return null

                      const band = typeof xScale.bandwidth === "function" ? xScale.bandwidth() : 0
                      const cxRaw = xScale(chartData[peakIndex].date)
                      if (cxRaw == null || !Number.isFinite(cxRaw)) return null
                      const cx = cxRaw + band / 2
                      const barTop = yScale(peakValue)

                      // Plot bounds for choosing label side + clamping
                      const offset = chartProps?.offset ?? {}
                      const plotLeft = offset.left ?? 0
                      const plotWidth = offset.width ?? chartProps?.width ?? 0
                      const plotRight = plotLeft + plotWidth

                      // Bail when the plot is too narrow to fit the annotation cleanly
                      if (plotWidth < 360) return null

                      // Tick anchor — small open ring sits 16px above the bar tip
                      const ringY = Math.max(14, barTop - 14)

                      // Label sits to the side of the ring with a tiny horizontal tick
                      // Default right; flip left if too close to the right edge.
                      const labelWidth = 78
                      const tickOffset = 6
                      const goesLeft = cx + tickOffset + labelWidth > plotRight - 4
                      const labelX = goesLeft ? cx - tickOffset : cx + tickOffset
                      const textAnchor = goesLeft ? "end" : "start"

                      const dateText = peak.fullDate
                      const valueText = formatNumber(peakValue)

                      return (
                        <g style={{ pointerEvents: "none" }}>
                          {/* Thin solid lead line from bar tip up to the ring */}
                          <line
                            x1={cx}
                            y1={barTop - 1}
                            x2={cx}
                            y2={ringY}
                            stroke="var(--muted-foreground)"
                            strokeWidth="1"
                            opacity="0.45"
                          />

                          {/* Open ring marker at the lead's top */}
                          <circle
                            cx={cx}
                            cy={ringY}
                            r="3"
                            fill="var(--background)"
                            stroke="var(--chart-2)"
                            strokeWidth="1.25"
                          />

                          {/* Horizontal tick from ring to label */}
                          <line
                            x1={cx + (goesLeft ? -3 : 3)}
                            y1={ringY}
                            x2={labelX}
                            y2={ringY}
                            stroke="var(--muted-foreground)"
                            strokeWidth="1"
                            opacity="0.45"
                          />

                          {/* peak · value */}
                          <text
                            x={labelX}
                            y={ringY - 3}
                            textAnchor={textAnchor}
                            fontSize="10"
                            fontWeight="600"
                            fill="var(--foreground)"
                            style={{ fontFeatureSettings: '"tnum"' }}
                          >
                            <tspan fill="var(--muted-foreground)" fontWeight="500" letterSpacing="0.5">
                              peak{" "}
                            </tspan>
                            {valueText}
                          </text>
                          {/* date */}
                          <text
                            x={labelX}
                            y={ringY + 9}
                            textAnchor={textAnchor}
                            fontSize="9"
                            fill="var(--muted-foreground)"
                            opacity="0.85"
                          >
                            {dateText}
                          </text>
                        </g>
                      )
                    }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>
    </div>
  )
}
