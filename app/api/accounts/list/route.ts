import { NextResponse } from "next/server"
import { getEffectiveContext } from "@/lib/super-admin"
import { db } from "@/lib/db/client"
import { accounts, videos } from "@/lib/db/schema"
import { eq, and, gte, lte, desc, asc, ilike, or, sql, type SQL, type Column } from "drizzle-orm"

// Reads cookies / DB — always runtime, never prerender.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const VALID_SORT_COLS = [
  "totalViewCount",
  "totalLikeCount",
  "totalCommentCount",
  "followerCount",
  "engagementRate",
  "totalVideoCount",
] as const

type SortCol = typeof VALID_SORT_COLS[number]

/**
 * Paginated accounts list scoped to the authenticated user.
 *
 * Sort columns are whitelisted (see VALID_SORT_COLS). Period-scoped view
 * counts are joined in from videos published within the date range so the UI
 * can show "views this period" alongside lifetime totals.
 */
export async function GET(request: Request) {
  const ctx = await getEffectiveContext()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = ctx.effectiveUserId

  const { searchParams } = new URL(request.url)
  const dateFromRaw = searchParams.get("dateFrom") || getDefaultDateFrom()
  const dateTo = searchParams.get("dateTo") || getDefaultDateTo()
  const dateFrom = dateFromRaw === "all" ? "2020-01-01" : dateFromRaw
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get("perPage") || "50")))
  const sortColParam = searchParams.get("sortCol") || "totalViewCount"
  const sortCol: SortCol = (VALID_SORT_COLS as readonly string[]).includes(sortColParam)
    ? sortColParam as SortCol
    : "totalViewCount"
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc"
  const platform = searchParams.get("platform") || undefined
  const search = searchParams.get("search") || undefined

  try {
    const conditions: SQL[] = [eq(accounts.userId, userId)]
    if (platform && platform !== "all") {
      conditions.push(eq(accounts.platform, platform))
    }
    if (search) {
      const searchClause = or(
        ilike(accounts.username, `%${search}%`),
        ilike(accounts.displayName, `%${search}%`),
      )
      if (searchClause) conditions.push(searchClause)
    }

    const sortColMap: Record<SortCol, Column> = {
      totalViewCount: accounts.totalViewCount,
      totalLikeCount: accounts.totalLikeCount,
      totalCommentCount: accounts.totalCommentCount,
      followerCount: accounts.followerCount,
      engagementRate: accounts.engagementRate,
      totalVideoCount: accounts.totalVideoCount,
    }
    const orderCol = sortColMap[sortCol]
    const orderFn = sortDir === "desc" ? desc : asc

    const [dbAccounts, countResult] = await Promise.all([
      db.select().from(accounts).where(and(...conditions))
        .orderBy(orderFn(orderCol))
        .limit(perPage)
        .offset((page - 1) * perPage),
      db.select({ total: sql<number>`count(*)::int` }).from(accounts).where(and(...conditions))
        .then(r => r[0]?.total ?? 0),
    ])

    // Enrich with period-scoped view/video counts (same join as top-accounts).
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

    const enriched = dbAccounts.map(a => {
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

    return NextResponse.json({
      data: enriched,
      pageCount: Math.ceil(countResult / perPage),
      totalRows: countResult,
    })
  } catch (error) {
    console.error("[AccountsList] DB error:", error)
    return NextResponse.json(
      { error: "Failed to fetch accounts list", details: String(error) },
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
