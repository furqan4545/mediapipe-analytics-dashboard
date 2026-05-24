import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"
import { accounts, videos } from "@/lib/db/schema"
import { eq, and, gte, lte, desc, sql, type Column } from "drizzle-orm"

// Reads cookies / DB — always runtime, never prerender.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Top N accounts for the user, enriched with period-specific view counts
 * computed from videos published in the window.
 *
 * Sort by lifetime totals on the `accounts` table (cheap, indexed); the
 * "viewCountInPeriod" enrichment is best-effort and may be 0 for accounts
 * with no posts in the window.
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
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50)
  const platform = searchParams.get("platform") || undefined
  const metric = searchParams.get("metric") || "viewCount"

  try {
    const orderColMap: Record<string, Column> = {
      viewCount: accounts.totalViewCount,
      followerCount: accounts.followerCount,
      engagementRate: accounts.engagementRate,
      videoCount: accounts.totalVideoCount,
    }
    const orderCol = orderColMap[metric] || accounts.totalViewCount

    const accountConditions = [eq(accounts.userId, userId)]
    if (platform && platform !== "all") {
      accountConditions.push(eq(accounts.platform, platform))
    }

    const dbAccounts = await db
      .select()
      .from(accounts)
      .where(and(...accountConditions))
      .orderBy(desc(orderCol))
      .limit(limit)

    // Enrich with period-scoped view/video counts from the videos table.
    const videoConditions = [
      eq(videos.userId, userId),
      gte(videos.publishedAt, new Date(dateFrom)),
      lte(videos.publishedAt, new Date(dateTo + "T23:59:59.999Z")),
    ]
    if (platform && platform !== "all") {
      videoConditions.push(eq(videos.platform, platform))
    }
    const periodStats = await db
      .select({
        accountUsername: videos.accountUsername,
        platform: videos.platform,
        views: sql<number>`coalesce(sum(${videos.viewCount}), 0)`,
        videoCount: sql<number>`count(*)`,
      })
      .from(videos)
      .where(and(...videoConditions))
      .groupBy(videos.accountUsername, videos.platform)

    const periodMap = new Map<string, { views: number; videoCount: number }>()
    for (const s of periodStats) {
      const key = `${s.accountUsername || ""}|${s.platform || "unknown"}`
      periodMap.set(key, { views: Number(s.views), videoCount: Number(s.videoCount) })
    }

    return NextResponse.json(
      dbAccounts.map(a => {
        const key = `${a.username}|${a.platform || "unknown"}`
        const ps = periodMap.get(key)
        return {
          id: a.id,
          platformAccountId: a.platformAccountId,
          platform: a.platform,
          username: a.username,
          displayName: a.displayName,
          profilePictureUrl: a.profilePictureUrl,
          followerCount: a.followerCount,
          followingCount: a.followingCount,
          totalViewCount: a.totalViewCount,
          totalViews: a.totalViewCount,
          totalLikeCount: a.totalLikeCount,
          likeCount: a.totalLikeCount,
          totalCommentCount: a.totalCommentCount,
          commentCount: a.totalCommentCount,
          totalVideoCount: a.totalVideoCount,
          videoCount: a.totalVideoCount,
          totalShares: a.totalShareCount,
          shareCount: a.totalShareCount,
          totalBookmarks: a.totalBookmarkCount,
          bookmarkCount: a.totalBookmarkCount,
          engagementRate: a.engagementRate,
          viralityRate: a.viralityRate ?? undefined,
          p50Views: a.p50Views ?? undefined,
          p90Views: a.p90Views ?? undefined,
          p10Views: a.p10Views ?? undefined,
          averageViewsPerVideo: a.averageViewsPerVideo ?? undefined,
          totalVideosTracked: a.totalVideosTracked ?? undefined,
          totalVideosRetained: a.totalVideosRetained ?? undefined,
          totalVideosPublished: a.totalVideosPublished ?? undefined,
          latestVideoPublishedAt: a.latestVideoPublishedAt
            ? new Date(a.latestVideoPublishedAt).toISOString()
            : undefined,
          daysSinceLastPost: a.daysSinceLastPost ?? undefined,
          countryCode: a.countryCode ?? undefined,
          viewCountInPeriod: ps?.views ?? 0,
          videoCountInPeriod: ps?.videoCount ?? 0,
        }
      })
    )
  } catch (error) {
    console.error("[TopAccounts] DB error:", error)
    return NextResponse.json(
      { error: "Failed to fetch top accounts", details: String(error) },
      { status: 500 }
    )
  }
}

function getDefaultDateFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split("T")[0]
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split("T")[0]
}
