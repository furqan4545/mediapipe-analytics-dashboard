"use client"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts"
import { Activity } from "lucide-react"
import { useInteractionMetrics } from "@/lib/hooks/use-dashboard-data"

const chartConfig = {
  engagement: {
    label: "Engagement",
    color: "var(--chart-3)",
  },
}

function formatDateForPeriod(dateStr: string, period: string, index: number, total: number): string {
  const date = new Date(dateStr)

  // For 7 days, show weekday
  if (period === "7d") {
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  // For 30 days, show every 5th date
  if (period === "30d") {
    if (index % 5 === 0 || index === total - 1) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
    return ""
  }

  // For 90 days, show weekly labels
  if (period === "90d") {
    if (index % 7 === 0) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
    return ""
  }

  // For all time, show monthly
  if (index % 30 === 0) {
    return date.toLocaleDateString("en-US", { month: "short" })
  }
  return ""
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case "7d": return "Last 7 days"
    case "30d": return "Last 30 days"
    case "90d": return "Last 90 days"
    case "all": return "All time"
    default: return "Last 30 days"
  }
}

interface EngagementChartProps {
  period?: string
}

export function EngagementChart({ period = "30d" }: EngagementChartProps) {
  const { data: metricsData, loading, error, isRefreshing } = useInteractionMetrics(period)

  if (loading) {
    return (
      <div className="rounded-2xl glass shadow-fluid overflow-hidden animate-fade-in relative" style={{ animationDelay: "350ms" }}>
        <div className="absolute inset-0 inner-light rounded-2xl pointer-events-none" />
        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Engagement Rate</h3>
              <p className="text-xs text-muted-foreground">Interaction percentage over time</p>
            </div>
          </div>
          <div className="mb-4">
            <div className="h-8 w-20 bg-muted/50 rounded animate-pulse" />
          </div>
          <div className="h-[180px] w-full bg-muted/30 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  // Calculate engagement rate for each day
  const engagementData = metricsData.map((item, index) => {
    const totalInteractions = (item.likeCount || 0) + (item.commentCount || 0) + (item.shareCount || 0) + (item.bookmarkCount || 0)
    const engagement = item.viewCount > 0 ? (totalInteractions / item.viewCount) * 100 : 0
    return {
      date: formatDateForPeriod(item.date, period, index, metricsData.length),
      fullDate: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      engagement: parseFloat(engagement.toFixed(2)),
    }
  })

  const avgEngagement = engagementData.length > 0
    ? (engagementData.reduce((acc, item) => acc + item.engagement, 0) / engagementData.length).toFixed(1)
    : "0.0"
  const maxEngagement = engagementData.length > 0
    ? Math.max(...engagementData.map((d) => d.engagement)).toFixed(1)
    : "0.0"

  return (
    <div className="rounded-2xl glass shadow-fluid overflow-hidden animate-fade-in relative" style={{ animationDelay: "350ms" }}>
      <div className="absolute inset-0 inner-light rounded-2xl pointer-events-none" />
      {isRefreshing && (
        <div className="absolute top-3 right-3 z-10">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      )}

      <div className={`relative p-6 transition-opacity duration-200 ${isRefreshing ? "opacity-70" : ""}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Engagement Rate</h3>
            <p className="text-xs text-muted-foreground">{getPeriodLabel(period)}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full glass-subtle px-2.5 py-1 text-xs font-medium text-chart-3">
            <Activity className="h-3 w-3" />
            <span>{avgEngagement}% avg</span>
          </div>
        </div>

        <div className="mb-4">
          <span className="text-2xl font-semibold tracking-tight text-foreground">{maxEngagement}%</span>
          <span className="ml-2 text-sm text-muted-foreground">peak engagement</span>
        </div>

        {engagementData.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        ) : (
          <ChartContainer key={`engagement-${period}`} config={chartConfig} className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagementData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, "auto"]}
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  fill="url(#engagementGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>
    </div>
  )
}
