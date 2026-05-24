import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"
import { videos } from "@/lib/db/schema"
import { eq, and, gte, lte, desc, sql, type SQL, type Column } from "drizzle-orm"

// Reads cookies / DB — always runtime, never prerender.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Top N videos for the user, filtered by publish date in the requested window.
 *
 * Sort metric is whitelisted (no SQL injection from `?metric=`). The default
 * "viewCount" matches what the dashboard hook asks for.
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
    const conditions = [
      eq(videos.userId, userId),
      gte(videos.publishedAt, new Date(dateFrom)),
      lte(videos.publishedAt, new Date(dateTo + "T23:59:59.999Z")),
    ]
    if (platform && platform !== "all") {
      conditions.push(eq(videos.platform, platform))
    }

    // Whitelist sort columns (never interpolate `metric` into SQL directly).
    const orderColMap: Record<string, Column> = {
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      commentCount: videos.commentCount,
      shareCount: videos.shareCount,
      bookmarkCount: videos.bookmarkCount,
      engagementRate: videos.engagementRate,
      publishedAt: videos.publishedAt,
    }
    const orderCol = orderColMap[metric] || videos.viewCount

    const rows = await db
      .select()
      .from(videos)
      .where(and(...conditions))
      .orderBy(desc(orderCol))
      .limit(limit)

    return NextResponse.json(
      rows.map(v => ({
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
    )
  } catch (error) {
    console.error("[TopVideos] DB error:", error)
    return NextResponse.json(
      { error: "Failed to fetch top videos", details: String(error) },
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
