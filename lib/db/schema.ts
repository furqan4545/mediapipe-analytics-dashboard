/**
 * Mirror of the 5 `analytics_*` tables owned by mediapipe-sync-worker.
 *
 * Keep in sync with `/Users/topg/Desktop/typescript/mediapipe-analytics-worker/src/db/schema.ts`.
 * Tables are owned by the worker; the dashboard is read-only. We re-declare
 * them here just to get Drizzle's type-safe select inference — the worker
 * owns the actual migrations.
 *
 * Also exposes a minimal `linkedAccounts` view of the SaaS-owned table so the
 * onboarding gate can check whether the user has any released accounts.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  doublePrecision,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"

// ─── Tracked accounts ─────────────────────────────────────────────────────
export const accounts = pgTable(
  "analytics_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    linkedAccountId: uuid("linked_account_id"),

    platform: text("platform").notNull(),
    platformAccountId: text("platform_account_id").notNull(),
    username: text("username").notNull(),

    displayName: text("display_name"),
    profilePictureUrl: text("profile_picture_url"),
    countryCode: text("country_code"),

    followerCount: bigint("follower_count", { mode: "number" }).default(0).notNull(),
    followingCount: bigint("following_count", { mode: "number" }).default(0).notNull(),

    totalViewCount: bigint("total_view_count", { mode: "number" }).default(0).notNull(),
    totalLikeCount: bigint("total_like_count", { mode: "number" }).default(0).notNull(),
    totalCommentCount: bigint("total_comment_count", { mode: "number" }).default(0).notNull(),
    totalShareCount: bigint("total_share_count", { mode: "number" }).default(0).notNull(),
    totalBookmarkCount: bigint("total_bookmark_count", { mode: "number" }).default(0).notNull(),
    totalVideoCount: integer("total_video_count").default(0).notNull(),

    engagementRate: doublePrecision("engagement_rate").default(0).notNull(),
    viralityRate: doublePrecision("virality_rate"),
    averageViewsPerVideo: doublePrecision("average_views_per_video"),
    p50Views: doublePrecision("p50_views"),
    p90Views: doublePrecision("p90_views"),
    p10Views: doublePrecision("p10_views"),

    totalVideosTracked: integer("total_videos_tracked"),
    totalVideosRetained: integer("total_videos_retained"),
    totalVideosPublished: integer("total_videos_published"),

    latestVideoPublishedAt: timestamp("latest_video_published_at", { withTimezone: true }),
    daysSinceLastPost: integer("days_since_last_post"),

    onboardedAt: timestamp("onboarded_at", { withTimezone: true }).defaultNow().notNull(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("analytics_accounts_user_idx").on(t.userId),
    userPlatformIdx: index("analytics_accounts_user_platform_idx").on(t.userId, t.platform),
    uniqueAccount: uniqueIndex("analytics_accounts_unique").on(
      t.userId,
      t.platform,
      t.platformAccountId
    ),
    lastSyncIdx: index("analytics_accounts_last_sync_idx").on(t.lastSyncAt),
  })
)

// ─── Videos ───────────────────────────────────────────────────────────────
export const videos = pgTable(
  "analytics_videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id").notNull(),

    platform: text("platform").notNull(),
    platformVideoId: text("platform_video_id").notNull(),

    accountUsername: text("account_username"),
    accountDisplayName: text("account_display_name"),
    accountProfilePictureUrl: text("account_profile_picture_url"),

    caption: text("caption"),
    thumbnailUrl: text("thumbnail_url"),
    hashtags: jsonb("hashtags").$type<string[]>(),
    contentType: text("content_type"),
    durationSeconds: integer("duration_seconds"),

    viewCount: bigint("view_count", { mode: "number" }).default(0).notNull(),
    likeCount: bigint("like_count", { mode: "number" }).default(0).notNull(),
    commentCount: bigint("comment_count", { mode: "number" }).default(0).notNull(),
    shareCount: bigint("share_count", { mode: "number" }).default(0).notNull(),
    bookmarkCount: bigint("bookmark_count", { mode: "number" }).default(0).notNull(),
    engagementRate: doublePrecision("engagement_rate").default(0).notNull(),
    viralityFactor: doublePrecision("virality_factor"),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedDate: date("published_date"),

    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("analytics_videos_user_idx").on(t.userId),
    accountIdx: index("analytics_videos_account_idx").on(t.accountId),
    userPublishedIdx: index("analytics_videos_user_published_idx").on(t.userId, t.publishedAt),
    uniqueVideo: uniqueIndex("analytics_videos_unique").on(
      t.userId,
      t.platform,
      t.platformVideoId
    ),
    userViewsIdx: index("analytics_videos_user_views_idx").on(t.userId, t.viewCount),
  })
)

// ─── Daily metrics ────────────────────────────────────────────────────────
export const dailyMetrics = pgTable(
  "analytics_daily_metrics",
  {
    userId: uuid("user_id").notNull(),
    date: date("date").notNull(),
    platform: text("platform").notNull(),

    totalViews: bigint("total_views", { mode: "number" }).default(0).notNull(),
    totalLikes: bigint("total_likes", { mode: "number" }).default(0).notNull(),
    totalComments: bigint("total_comments", { mode: "number" }).default(0).notNull(),
    totalShares: bigint("total_shares", { mode: "number" }).default(0).notNull(),
    totalBookmarks: bigint("total_bookmarks", { mode: "number" }).default(0).notNull(),
    videoCount: integer("video_count").default(0).notNull(),
    accountCount: integer("account_count").default(0).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: uniqueIndex("analytics_daily_metrics_pk").on(t.userId, t.date, t.platform),
    userDateIdx: index("analytics_daily_metrics_user_date_idx").on(t.userId, t.date),
  })
)

// ─── KPI snapshots ────────────────────────────────────────────────────────
export const kpiSnapshots = pgTable(
  "analytics_kpi_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    platform: text("platform").notNull(),

    videoCount: integer("video_count").default(0).notNull(),
    accountCount: integer("account_count").default(0).notNull(),
    viewCount: bigint("view_count", { mode: "number" }).default(0).notNull(),
    likeCount: bigint("like_count", { mode: "number" }).default(0).notNull(),
    commentCount: bigint("comment_count", { mode: "number" }).default(0).notNull(),
    shareCount: bigint("share_count", { mode: "number" }).default(0).notNull(),
    bookmarkCount: bigint("bookmark_count", { mode: "number" }).default(0).notNull(),
    engagementRate: doublePrecision("engagement_rate"),

    prevVideoCount: integer("prev_video_count"),
    prevAccountCount: integer("prev_account_count"),
    prevViewCount: bigint("prev_view_count", { mode: "number" }),
    prevLikeCount: bigint("prev_like_count", { mode: "number" }),
    prevCommentCount: bigint("prev_comment_count", { mode: "number" }),
    prevShareCount: bigint("prev_share_count", { mode: "number" }),
    prevBookmarkCount: bigint("prev_bookmark_count", { mode: "number" }),

    dateFrom: date("date_from").notNull(),
    dateTo: date("date_to").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqueSnap: uniqueIndex("analytics_kpi_snapshots_unique").on(
      t.userId,
      t.dateFrom,
      t.dateTo,
      t.platform
    ),
    userPlatformIdx: index("analytics_kpi_snapshots_user_platform_idx").on(t.userId, t.platform),
  })
)

// ─── Sync job audit trail ─────────────────────────────────────────────────
export const syncJobs = pgTable(
  "analytics_sync_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    trigger: text("trigger").notNull(),
    status: text("status").notNull(),

    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    apiCallsMade: integer("api_calls_made").default(0).notNull(),
    accountsSynced: integer("accounts_synced").default(0).notNull(),
    videosSynced: integer("videos_synced").default(0).notNull(),
    kpisSynced: integer("kpis_synced").default(0).notNull(),
    metricsSynced: integer("metrics_synced").default(0).notNull(),

    error: text("error"),
    stats: jsonb("stats"),
  },
  (t) => ({
    userIdx: index("analytics_sync_jobs_user_idx").on(t.userId),
    startedIdx: index("analytics_sync_jobs_started_idx").on(t.startedAt),
  })
)

// ─── SaaS-owned linked_accounts (read-only view for onboarding gate) ──────
// We only declare the columns the dashboard reads. The actual table is owned
// by the mediapipe SaaS and may have additional columns.
export const linkedAccounts = pgTable("linked_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  oneupUsername: text("oneup_username"),
  oneupSocialType: text("oneup_social_type"),
  releasedAt: timestamp("released_at", { withTimezone: true }),
})

export type Account = typeof accounts.$inferSelect
export type Video = typeof videos.$inferSelect
export type DailyMetric = typeof dailyMetrics.$inferSelect
export type KpiSnapshot = typeof kpiSnapshots.$inferSelect
export type SyncJob = typeof syncJobs.$inferSelect
export type LinkedAccount = typeof linkedAccounts.$inferSelect
