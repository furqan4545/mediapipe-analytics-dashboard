import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"
import { kpiSnapshots, dailyMetrics, videos, accounts } from "@/lib/db/schema"
import { eq, and, gte, lte, sql, count } from "drizzle-orm"

/**
 * Returns period-over-period KPIs for the authenticated user.
 *
 * Fast path: exact snapshot match in `analytics_kpi_snapshots`.
 * Fallback: aggregate `analytics_daily_metrics` on the fly (custom date
 * ranges that don't match a precomputed snapshot).
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = user.id

  const { searchParams } = new URL(request.url)
  const dateFromRaw = searchParams.get("dateFrom") || getDefaultDateFrom()
  const dateTo = searchParams.get("dateTo") || getDefaultDateTo()
  const platform = searchParams.get("platform") || undefined
  const isAllTime = dateFromRaw === "all"
  const dateFrom = isAllTime ? "2020-01-01" : dateFromRaw
  const resolvedPlatform = (platform && platform !== "all") ? platform : "all"

  try {
    // 1. Try exact snapshot match (fast path for preset windows the worker
    //    has already computed).
    const snapshot = await db
      .select()
      .from(kpiSnapshots)
      .where(and(
        eq(kpiSnapshots.userId, userId),
        eq(kpiSnapshots.dateFrom, dateFrom),
        eq(kpiSnapshots.dateTo, dateTo),
        eq(kpiSnapshots.platform, resolvedPlatform),
      ))
      .then(rows => rows[0] ?? null)

    if (snapshot) {
      // Some pipelines store engagement as a fraction (0..1), others as a
      // percentage (0..100). Normalize to percentage for the UI.
      const rawRate = snapshot.engagementRate || 0
      const engagementRate = rawRate < 1 ? rawRate * 100 : rawRate

      const response: Record<string, unknown> = {
        videoCount: snapshot.videoCount || 0,
        accountCount: snapshot.accountCount || 0,
        viewCount: snapshot.viewCount || 0,
        likeCount: snapshot.likeCount || 0,
        commentCount: snapshot.commentCount || 0,
        shareCount: snapshot.shareCount || 0,
        bookmarkCount: snapshot.bookmarkCount || 0,
        engagementRate,
      }

      if (!isAllTime && snapshot.prevVideoCount != null) {
        response.prevVideoCount = snapshot.prevVideoCount
        response.prevAccountCount = snapshot.prevAccountCount
        response.prevViewCount = snapshot.prevViewCount
        response.prevLikeCount = snapshot.prevLikeCount
        response.prevCommentCount = snapshot.prevCommentCount
        response.prevShareCount = snapshot.prevShareCount
        response.prevBookmarkCount = snapshot.prevBookmarkCount
      }

      return NextResponse.json(response)
    }

    // 2. No snapshot — aggregate dailyMetrics + counts on the fly.
    const currentPeriod = await aggregateDailyMetrics(userId, resolvedPlatform, dateFrom, dateTo)

    // Previous period of equal length for comparison pills.
    const daySpan = Math.round(
      (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000
    )
    const prevTo = shiftDate(dateFrom, -1)
    const prevFrom = shiftDate(prevTo, -daySpan + 1)
    const prevPeriod = await aggregateDailyMetrics(userId, resolvedPlatform, prevFrom, prevTo)

    const totalEngagements = currentPeriod.likes + currentPeriod.comments +
      currentPeriod.shares + currentPeriod.bookmarks
    const engagementRate = currentPeriod.views > 0
      ? (totalEngagements / currentPeriod.views) * 100
      : 0

    return NextResponse.json({
      videoCount: currentPeriod.videos,
      accountCount: currentPeriod.accounts,
      viewCount: currentPeriod.views,
      likeCount: currentPeriod.likes,
      commentCount: currentPeriod.comments,
      shareCount: currentPeriod.shares,
      bookmarkCount: currentPeriod.bookmarks,
      engagementRate,
      prevVideoCount: prevPeriod.videos,
      prevAccountCount: prevPeriod.accounts,
      prevViewCount: prevPeriod.views,
      prevLikeCount: prevPeriod.likes,
      prevCommentCount: prevPeriod.comments,
      prevShareCount: prevPeriod.shares,
      prevBookmarkCount: prevPeriod.bookmarks,
    })
  } catch (error) {
    console.error("[KPIs] DB error:", error)
    return NextResponse.json(
      { error: "Failed to fetch KPIs", details: String(error) },
      { status: 500 }
    )
  }
}

async function aggregateDailyMetrics(
  userId: string,
  platform: string,
  dateFrom: string,
  dateTo: string,
) {
  // Engagement totals come from the daily rollup (cheap, indexed).
  const metricsRows = await db
    .select({
      views: sql<number>`coalesce(sum(${dailyMetrics.totalViews}), 0)`,
      likes: sql<number>`coalesce(sum(${dailyMetrics.totalLikes}), 0)`,
      comments: sql<number>`coalesce(sum(${dailyMetrics.totalComments}), 0)`,
      shares: sql<number>`coalesce(sum(${dailyMetrics.totalShares}), 0)`,
      bookmarks: sql<number>`coalesce(sum(${dailyMetrics.totalBookmarks}), 0)`,
    })
    .from(dailyMetrics)
    .where(and(
      eq(dailyMetrics.userId, userId),
      eq(dailyMetrics.platform, platform),
      gte(dailyMetrics.date, dateFrom),
      lte(dailyMetrics.date, dateTo),
    ))

  // Video count = videos *published* in the window. Distinct from total
  // tracked because we want to show what was made this period.
  const videoConditions = [
    eq(videos.userId, userId),
    gte(videos.publishedDate, dateFrom),
    lte(videos.publishedDate, dateTo),
  ]
  if (platform !== "all") videoConditions.push(eq(videos.platform, platform))
  const videoRows = await db
    .select({ total: count() })
    .from(videos)
    .where(and(...videoConditions))

  // Account count = total tracked accounts (not period-scoped — accounts are
  // long-lived).
  const accountConditions = [eq(accounts.userId, userId)]
  if (platform !== "all") accountConditions.push(eq(accounts.platform, platform))
  const accountRows = await db
    .select({ total: count() })
    .from(accounts)
    .where(and(...accountConditions))

  const r = metricsRows[0]
  return {
    views: Number(r?.views ?? 0),
    likes: Number(r?.likes ?? 0),
    comments: Number(r?.comments ?? 0),
    shares: Number(r?.shares ?? 0),
    bookmarks: Number(r?.bookmarks ?? 0),
    videos: Number(videoRows[0]?.total ?? 0),
    accounts: Number(accountRows[0]?.total ?? 0),
  }
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split("T")[0]
}

function getDefaultDateFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split("T")[0]
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split("T")[0]
}
