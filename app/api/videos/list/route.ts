import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"
import { videos } from "@/lib/db/schema"
import { eq, and, gte, lte, desc, asc, ilike, or, sql, type SQL, type Column } from "drizzle-orm"

const VALID_SORT_COLS = [
  "viewCount",
  "likeCount",
  "commentCount",
  "shareCount",
  "bookmarkCount",
  "engagementRate",
  "publishedAt",
] as const

type SortCol = typeof VALID_SORT_COLS[number]

/**
 * Paginated videos list scoped to the authenticated user, filtered by
 * publishedAt in the requested window.
 *
 * Sort columns are whitelisted; "viewCount" is the default and what the hook
 * sends most often.
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
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get("perPage") || "50")))
  const sortColParam = searchParams.get("sortCol") || "viewCount"
  const sortCol: SortCol = (VALID_SORT_COLS as readonly string[]).includes(sortColParam)
    ? sortColParam as SortCol
    : "viewCount"
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc"
  const platform = searchParams.get("platform") || undefined
  const search = searchParams.get("search") || undefined

  try {
    const conditions: SQL[] = [
      eq(videos.userId, userId),
      gte(videos.publishedAt, new Date(dateFrom)),
      lte(videos.publishedAt, new Date(dateTo + "T23:59:59.999Z")),
    ]
    if (platform && platform !== "all") {
      conditions.push(eq(videos.platform, platform))
    }
    if (search) {
      const searchClause = or(
        ilike(videos.accountUsername, `%${search}%`),
        ilike(videos.caption, `%${search}%`),
      )
      if (searchClause) conditions.push(searchClause)
    }

    const sortColMap: Record<SortCol, Column> = {
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      commentCount: videos.commentCount,
      shareCount: videos.shareCount,
      bookmarkCount: videos.bookmarkCount,
      engagementRate: videos.engagementRate,
      publishedAt: videos.publishedAt,
    }
    const orderCol = sortColMap[sortCol]
    const orderFn = sortDir === "desc" ? desc : asc

    const [dbVideos, countResult] = await Promise.all([
      db.select().from(videos).where(and(...conditions))
        .orderBy(orderFn(orderCol))
        .limit(perPage)
        .offset((page - 1) * perPage),
      db.select({ total: sql<number>`count(*)::int` }).from(videos).where(and(...conditions))
        .then(r => r[0]?.total ?? 0),
    ])

    const mapped = dbVideos.map(v => ({
      id: v.id,
      platformVideoId: v.platformVideoId,
      platform: v.platform,
      accountUsername: v.accountUsername ?? "",
      platformAccountId: "",
      accountDisplayName: v.accountDisplayName,
      accountProfilePictureUrl: v.accountProfilePictureUrl,
      caption: v.caption,
      thumbnailUrl: v.thumbnailUrl,
      viewCount: v.viewCount,
      likeCount: v.likeCount,
      commentCount: v.commentCount,
      shareCount: v.shareCount,
      bookmarkCount: v.bookmarkCount,
      engagementRate: v.engagementRate,
      viralityFactor: v.viralityFactor,
      publishedAt: v.publishedAt ? new Date(v.publishedAt).toISOString() : "",
      publishedDate: v.publishedDate,
      contentType: v.contentType ?? undefined,
      durationSeconds: v.durationSeconds ?? undefined,
      hashtags: Array.isArray(v.hashtags) ? v.hashtags : [],
    }))

    return NextResponse.json({
      data: mapped,
      pageCount: Math.ceil(countResult / perPage),
      totalRows: countResult,
    })
  } catch (error) {
    console.error("[VideosList] DB error:", error)
    return NextResponse.json(
      { error: "Failed to fetch videos list", details: String(error) },
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
