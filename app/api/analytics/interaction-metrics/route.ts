import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"
import { dailyMetrics } from "@/lib/db/schema"
import { eq, and, gte, lte, asc } from "drizzle-orm"

// Reads cookies / DB — always runtime, never prerender.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Daily interaction metrics for the requested window, gap-filled with zeros
 * so the chart renders a continuous series.
 *
 * Returns a bare array (matches the legacy shape the chart hook expects).
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
  const dateFrom = dateFromRaw === "all" ? "2020-01-01" : dateFromRaw
  const platform = searchParams.get("platform") || undefined
  const resolvedPlatform = (platform && platform !== "all") ? platform : "all"

  try {
    const rows = await db
      .select()
      .from(dailyMetrics)
      .where(and(
        eq(dailyMetrics.userId, userId),
        eq(dailyMetrics.platform, resolvedPlatform),
        gte(dailyMetrics.date, dateFrom),
        lte(dailyMetrics.date, dateTo),
      ))
      .orderBy(asc(dailyMetrics.date))

    const mapped = rows.map(m => ({
      date: m.date,
      viewCount: m.totalViews || 0,
      likeCount: m.totalLikes || 0,
      commentCount: m.totalComments || 0,
      shareCount: m.totalShares || 0,
      bookmarkCount: m.totalBookmarks || 0,
      videoCount: m.videoCount || 0,
      accountCount: m.accountCount || 0,
    }))

    const filled = fillDateGaps(mapped, dateFrom, dateTo)
    return NextResponse.json(filled)
  } catch (error) {
    console.error("[InteractionMetrics] DB error:", error)
    return NextResponse.json(
      { error: "Failed to fetch interaction metrics", details: String(error) },
      { status: 500 }
    )
  }
}

interface MetricRow {
  date: string
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  bookmarkCount: number
  videoCount: number
  accountCount: number
}

/** Fill missing dates so the chart shows a continuous time series. */
function fillDateGaps(data: MetricRow[], dateFrom: string, dateTo: string): MetricRow[] {
  const map = new Map(data.map(d => [d.date, d]))
  const result: MetricRow[] = []
  const current = new Date(dateFrom + "T00:00:00Z")
  const end = new Date(dateTo + "T00:00:00Z")

  while (current <= end) {
    const key = current.toISOString().split("T")[0]
    result.push(map.get(key) || {
      date: key,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      bookmarkCount: 0,
      videoCount: 0,
      accountCount: 0,
    })
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return result
}

function getDefaultDateFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split("T")[0]
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split("T")[0]
}
