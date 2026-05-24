// API Response Types

export type Platform = "tiktok" | "instagram" | "youtube"

export interface KPIData {
  videoCount: number
  accountCount: number
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  bookmarkCount: number
  engagementRate?: number
  prevVideoCount?: number
  prevAccountCount?: number
  prevViewCount?: number
  prevLikeCount?: number
  prevCommentCount?: number
  prevShareCount?: number
  prevBookmarkCount?: number
  prevEngagementRate?: number
  lastSyncAt?: string
}

export interface TopVideo {
  id: string
  platformVideoId: string
  platform: Platform
  accountUsername: string
  platformAccountId: string
  accountDisplayName: string | null
  accountProfilePictureUrl: string | null
  caption: string | null
  thumbnailUrl: string | null

  // Lifetime metrics
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  bookmarkCount: number
  engagementRate: number
  publishedAt: string

  // Period-specific metrics (gains within selected date range)
  viewCountInPeriod?: number
  likeCountInPeriod?: number
  commentCountInPeriod?: number
  shareCountInPeriod?: number
  bookmarkCountInPeriod?: number
  engagementRateInPeriod?: number

  // Virality metrics
  viralityFactor?: number

  // Video metadata
  hashtags?: string[]
  contentType?: "video" | "slideshow"
  durationSeconds?: number
  publishedDate?: string
  loadAt?: string

  // Tracking info
  isCompetitor?: boolean
  tracking_status?: 0 | 1
  orgAccountId?: string
  videoIndex?: number

  // Direct link to the video
  postUrl?: string
  status?: string
}

export interface TopAccount {
  id: string
  platformAccountId: string
  platform: Platform
  username: string
  displayName: string | null
  profilePictureUrl: string | null

  // Follower metrics
  followerCount: number
  followingCount?: number

  // Lifetime totals (API may return either format)
  totalViewCount?: number
  totalViews?: number // API alternate name
  totalLikeCount?: number
  likeCount?: number // API alternate name
  totalCommentCount?: number
  commentCount?: number // API alternate name
  totalVideoCount?: number
  videoCount?: number // API alternate name
  totalShares?: number
  shareCount?: number // API alternate name
  totalBookmarks?: number
  bookmarkCount?: number // API alternate name
  engagementRate: number

  // Period-specific metrics (gains within selected date range)
  viewCountInPeriod?: number
  likeCountInPeriod?: number
  commentCountInPeriod?: number
  shareCountInPeriod?: number
  bookmarkCountInPeriod?: number
  videoCountInPeriod?: number
  engagementRateInPeriod?: number
  averageViewsPerVideoInPeriod?: number

  // Virality metrics
  viralityRate?: number
  p50Views?: number
  p90Views?: number
  p10Views?: number
  averageViewsPerVideo?: number

  // Account metadata
  totalVideosTracked?: number
  totalVideosRetained?: number
  totalVideosPublished?: number
  latestVideoPublishedAt?: string
  daysSinceLastPost?: number
  countryCode?: string
  isCompetitor?: boolean
}

export interface InteractionMetric {
  date: string
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  bookmarkCount: number
  engagementRate?: number
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  data: T[]
  pageCount: number
  totalRows: number
}

// Legacy dashboard-source type — kept so leftover `source` props on copied
// components still type-check, but the actual value is ignored. We have only
// one stream of data: the user's own analytics.
export type DashboardSource = "creators"
