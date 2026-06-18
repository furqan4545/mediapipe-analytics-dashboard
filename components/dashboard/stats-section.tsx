"use client"

import { StatCard } from "@/components/dashboard/stat-card"
import { useKPIs, formatNumber, formatChangeValue } from "@/lib/hooks/use-dashboard-data"
import {
  Video,
  Users,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
} from "lucide-react"
import type { DashboardSource } from "@/lib/types"

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface StatsSectionProps {
  period?: string
  platform?: string
  /** Ignored — kept so legacy callers still type-check. */
  source?: DashboardSource
  dateFrom?: string
  dateTo?: string
  /** Ignored — kept so legacy callers still type-check. */
  publishedOnly?: boolean
}

export function StatsSection({ period = "30d", platform = "all", dateFrom, dateTo }: StatsSectionProps) {
  const { data, loading, error, isRefreshing } = useKPIs({ period, platform, dateFrom, dateTo })
  const isAutomations = false

  // The account count is platform-scoped. We only track Instagram + TikTok, so
  // name the platform directly; "all" sums both live counts and matches the
  // "X of Y accounts are live" banner above.
  const accountLabel =
    platform === "instagram" ? "Instagram Accounts" :
    platform === "tiktok"    ? "TikTok Accounts"    :
                               "Live Accounts"

  if (loading) {
    return (
      <section className="grid gap-3 sm:gap-5 grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl glass shadow-fluid p-5 animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <div className="h-3 w-20 bg-muted/50 rounded" />
                <div className="h-7 w-16 bg-muted/50 rounded" />
                <div className="h-3 w-12 bg-muted/50 rounded" />
              </div>
              <div className="h-10 w-10 bg-muted/50 rounded-xl" />
            </div>
          </div>
        ))}
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="grid gap-3 sm:gap-5 grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          title="Published Videos"
          value="—"
          icon={Video}
          delay={0}
        />
        <StatCard
          title={accountLabel}
          value="—"
          icon={Users}
          delay={50}
        />
        <StatCard
          title="Total Views"
          value="—"
          icon={Eye}
          delay={100}
        />
        <StatCard
          title="Total Likes"
          value="—"
          icon={Heart}
          delay={150}
        />
        <StatCard
          title="Comments"
          value="—"
          icon={MessageCircle}
          delay={200}
        />
      </section>
    )
  }

  const videoChange = formatChangeValue(data.videoCount, data.prevVideoCount)
  const viewChange = formatChangeValue(data.viewCount, data.prevViewCount)
  const likeChange = formatChangeValue(data.likeCount, data.prevLikeCount)
  const commentChange = formatChangeValue(data.commentCount, data.prevCommentCount)

  // Fix 1: Use API-computed engagement rate when available (includes saves/bookmarks)
  const engagementRate = data.engagementRate != null
    ? data.engagementRate.toFixed(1)
    : data.viewCount > 0
      ? (((data.likeCount + data.commentCount + (data.shareCount || 0) + (data.bookmarkCount || 0)) / data.viewCount) * 100).toFixed(1)
      : "0.0"

  // Use API-provided previous engagement rate, fall back to client-side computation
  const currentEngRate = parseFloat(engagementRate)
  const prevEngagementRate = data.prevEngagementRate != null
    ? data.prevEngagementRate
    : (data.prevViewCount && data.prevViewCount > 0)
      ? (((data.prevLikeCount || 0) + (data.prevCommentCount || 0) + (data.prevShareCount || 0) + (data.prevBookmarkCount || 0)) / data.prevViewCount) * 100
      : 0
  const engagementDiff = data.prevViewCount ? currentEngRate - prevEngagementRate : 0
  const engagementChange = {
    value: data.prevViewCount ? (engagementDiff > 0 ? `+${engagementDiff.toFixed(1)}%` : `${engagementDiff.toFixed(1)}%`) : "—",
    type: engagementDiff > 0 ? "positive" as const : engagementDiff < 0 ? "negative" as const : "neutral" as const
  }

  // Fix 10: Format last sync time if available
  const lastSyncLabel = data.lastSyncAt
    ? formatTimeSince(new Date(data.lastSyncAt))
    : null

  return (
    <div>
      {lastSyncLabel && (
        <p className="text-[11px] text-muted-foreground/60 mb-2 text-right">
          Updated {lastSyncLabel}
        </p>
      )}
      <section className={`grid gap-3 sm:gap-5 grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 transition-opacity duration-200 ${isRefreshing ? "opacity-70" : ""}`}>
        <StatCard
          title={isAutomations ? "Published Posts" : "Published Videos"}
          value={formatNumber(data.videoCount)}
          change={videoChange.value}
          changeType={videoChange.type}
          icon={Video}
          delay={0}
        />
        <StatCard
          title={accountLabel}
          value={formatNumber(data.accountCount)}
          icon={Users}
          delay={50}
        />
        <StatCard
          title="Total Views"
          value={formatNumber(data.viewCount)}
          change={viewChange.value}
          changeType={viewChange.type}
          icon={Eye}
          delay={100}
        />
        <StatCard
          title="Total Likes"
          value={formatNumber(data.likeCount)}
          change={likeChange.value}
          changeType={likeChange.type}
          icon={Heart}
          delay={150}
        />
        <StatCard
          title="Comments"
          value={formatNumber(data.commentCount)}
          change={commentChange.value}
          changeType={commentChange.type}
          icon={MessageCircle}
          delay={200}
        />
      </section>
    </div>
  )
}
