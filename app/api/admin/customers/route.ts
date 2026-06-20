import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { accounts, videos, authUsers, adminAccounts } from "@/lib/db/schema"
import { sql, inArray } from "drizzle-orm"
import { getEffectiveContext } from "@/lib/super-admin"

// Reads cookies / DB — always runtime, never prerender.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Super-admin only: one row per customer (a user that has tracked accounts),
 * with the headline performance numbers the operator monitors — accounts,
 * videos, total views, average views per video, engagement, last sync.
 *
 * The dataset is small (one row per paying customer), so we run a few simple
 * grouped aggregates and stitch them together in JS rather than one big join.
 */
export async function GET() {
  const ctx = await getEffectiveContext()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!ctx.superAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // Lifetime account-level totals, grouped per customer.
    const accountAgg = await db
      .select({
        userId: accounts.userId,
        accountCount: sql<number>`count(*)::int`,
        followerCount: sql<number>`coalesce(sum(${accounts.followerCount}),0)::float8`,
        totalViews: sql<number>`coalesce(sum(${accounts.totalViewCount}),0)::float8`,
        totalLikes: sql<number>`coalesce(sum(${accounts.totalLikeCount}),0)::float8`,
        totalComments: sql<number>`coalesce(sum(${accounts.totalCommentCount}),0)::float8`,
        totalShares: sql<number>`coalesce(sum(${accounts.totalShareCount}),0)::float8`,
        totalBookmarks: sql<number>`coalesce(sum(${accounts.totalBookmarkCount}),0)::float8`,
        lastSyncAt: sql<string | null>`max(${accounts.lastSyncAt})`,
        platforms: sql<string[]>`array_agg(distinct ${accounts.platform})`,
      })
      .from(accounts)
      .groupBy(accounts.userId)

    // Real per-video counts (the source of truth for "average views/video").
    const videoAgg = await db
      .select({
        userId: videos.userId,
        videoCount: sql<number>`count(*)::int`,
        videoViews: sql<number>`coalesce(sum(${videos.viewCount}),0)::float8`,
      })
      .from(videos)
      .groupBy(videos.userId)

    const userIds = [...new Set(accountAgg.map((a) => a.userId))]

    // Emails + signup dates so each customer is human-identifiable.
    const users = userIds.length
      ? await db
          .select({ id: authUsers.id, email: authUsers.email, createdAt: authUsers.createdAt })
          .from(authUsers)
          .where(inArray(authUsers.id, userIds))
          .catch(() => [])
      : []

    // Live subscription size from the admin inventory (released_at IS NULL).
    const adminAgg = await db
      .select({
        assignedToUser: adminAccounts.assignedToUser,
        active: sql<number>`count(*) filter (where ${adminAccounts.releasedAt} is null)::int`,
      })
      .from(adminAccounts)
      .groupBy(adminAccounts.assignedToUser)
      .catch(() => [] as { assignedToUser: string | null; active: number }[])

    const videoMap = new Map(videoAgg.map((v) => [v.userId, v]))
    const userMap = new Map(users.map((u) => [u.id, u]))
    const adminMap = new Map(
      adminAgg.filter((a) => a.assignedToUser).map((a) => [a.assignedToUser as string, a.active])
    )

    const customers = accountAgg
      .map((a) => {
        const v = videoMap.get(a.userId)
        const videoCount = v?.videoCount ?? 0
        const videoViews = v?.videoViews ?? 0
        const u = userMap.get(a.userId)

        const engagements = a.totalLikes + a.totalComments + a.totalShares + a.totalBookmarks
        const engagementRate = a.totalViews > 0 ? (engagements / a.totalViews) * 100 : 0
        const avgViewsPerVideo = videoCount > 0 ? videoViews / videoCount : 0

        return {
          userId: a.userId,
          email: u?.email ?? null,
          createdAt: u?.createdAt ? new Date(u.createdAt).toISOString() : null,
          accountCount: a.accountCount,
          activeAccountCount: adminMap.get(a.userId) ?? 0,
          followerCount: a.followerCount,
          videoCount,
          totalViews: a.totalViews,
          totalLikes: a.totalLikes,
          totalComments: a.totalComments,
          totalShares: a.totalShares,
          avgViewsPerVideo,
          engagementRate,
          lastSyncAt: a.lastSyncAt ? new Date(a.lastSyncAt).toISOString() : null,
          platforms: (a.platforms ?? []).filter(Boolean).sort(),
        }
      })
      .sort((x, y) => y.totalViews - x.totalViews)

    const totalVideos = customers.reduce((s, r) => s + r.videoCount, 0)
    const totalViews = customers.reduce((s, r) => s + r.totalViews, 0)
    const totals = {
      customers: customers.length,
      accounts: customers.reduce((s, r) => s + r.accountCount, 0),
      activeAccounts: customers.reduce((s, r) => s + r.activeAccountCount, 0),
      videos: totalVideos,
      totalViews,
      followerCount: customers.reduce((s, r) => s + r.followerCount, 0),
      avgViewsPerVideo: totalVideos > 0 ? totalViews / totalVideos : 0,
    }

    return NextResponse.json({ customers, totals })
  } catch (error) {
    console.error("[Admin customers] DB error:", error)
    return NextResponse.json(
      { error: "Failed to load customers", details: String(error) },
      { status: 500 }
    )
  }
}
