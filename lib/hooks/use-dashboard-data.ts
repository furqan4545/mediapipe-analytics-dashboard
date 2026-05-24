"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import type { KPIData, TopVideo, TopAccount, InteractionMetric, PaginatedResponse } from "@/lib/types"

// ─── Date-range helpers ────────────────────────────────────────────────────

function getDateRange(days: number | "all" = 30): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().split("T")[0]

  // "all time" — let the API resolve the true start (anchored to the user's
  // first synced metric). Sentinel `"all"` matches what the worker recognises.
  if (days === "all") {
    return { from: "all", to }
  }

  const fromDate = new Date(now.getTime() - days * 86400000)
  const from = fromDate.toISOString().split("T")[0]
  return { from, to }
}

function periodToDays(period: string): number | "all" {
  switch (period) {
    case "24h": return 1
    case "7d": return 7
    case "14d": return 14
    case "30d": return 30
    case "90d": return 90
    case "all": return "all"
    default: return 30
  }
}

function resolveDateRange(period: string, dateFrom?: string, dateTo?: string): { from: string; to: string } {
  if (period === "custom" && dateFrom && dateTo) {
    return { from: dateFrom, to: dateTo }
  }
  return getDateRange(periodToDays(period))
}

function buildParams(period: string, platform: string, dateFrom?: string, dateTo?: string): URLSearchParams {
  const { from, to } = resolveDateRange(period, dateFrom, dateTo)
  const params = new URLSearchParams({ dateFrom: from, dateTo: to })
  if (platform && platform !== "all") {
    params.set("platform", platform)
  }
  return params
}

// ─── KPIs ──────────────────────────────────────────────────────────────────

export interface KPIFilters {
  period?: string
  platform?: string
  dateFrom?: string
  dateTo?: string
}

export function useKPIs(filters: KPIFilters | string = {}) {
  const { period = "7d", platform = "all", dateFrom, dateTo } = typeof filters === "string"
    ? { period: filters, platform: "all", dateFrom: undefined, dateTo: undefined }
    : filters

  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const prevDataRef = useRef<KPIData | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    if (data) setIsRefreshing(true)
    else setLoading(true)

    const params = buildParams(period, platform, dateFrom, dateTo)

    fetch(`/api/analytics/kpis?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((newData) => {
        if (newData.error) {
          setError(newData.error)
        } else {
          prevDataRef.current = newData
          setData(newData)
          setError(null)
        }
        setLoading(false)
        setIsRefreshing(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(err.message)
        setLoading(false)
        setIsRefreshing(false)
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, platform, dateFrom, dateTo])

  // Show previous data while refreshing for smoother transitions.
  return {
    data: isRefreshing && prevDataRef.current ? prevDataRef.current : data,
    loading,
    error,
    isRefreshing,
  }
}

// ─── Top videos ────────────────────────────────────────────────────────────

export interface VideoFilters {
  platform?: string
  sort?: string
  limit?: number
  period?: string
  dateFrom?: string
  dateTo?: string
}

export function useTopVideos(filters: VideoFilters = {}) {
  const { platform = "all", sort = "views", limit = 5, period = "7d", dateFrom, dateTo } = filters

  const [data, setData] = useState<TopVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const prevDataRef = useRef<TopVideo[]>([])

  useEffect(() => {
    const controller = new AbortController()

    if (data.length > 0) setIsRefreshing(true)
    else setLoading(true)

    const params = buildParams(period, platform, dateFrom, dateTo)
    params.set("limit", limit.toString())

    const metricMap: Record<string, string> = {
      views: "viewCount",
      likes: "likeCount",
      engagement: "engagementRate",
      date: "publishedAt",
    }
    params.set("metric", metricMap[sort] || "viewCount")

    fetch(`/api/analytics/top-videos?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((newData) => {
        if (newData.error) {
          setError(newData.error)
        } else {
          const arr = Array.isArray(newData) ? newData : []
          prevDataRef.current = arr
          setData(arr)
          setError(null)
        }
        setLoading(false)
        setIsRefreshing(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(err.message)
        setLoading(false)
        setIsRefreshing(false)
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, sort, limit, period, dateFrom, dateTo])

  // Client-side sort to ensure correct display even if API order drifts.
  const currentData = isRefreshing && prevDataRef.current.length > 0 ? prevDataRef.current : data
  const filteredData = useMemo(() => {
    let result = currentData

    if (platform !== "all") {
      result = result.filter(v => v.platform === platform)
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "views": {
          const aViews = a.viewCountInPeriod ?? a.viewCount ?? 0
          const bViews = b.viewCountInPeriod ?? b.viewCount ?? 0
          return bViews - aViews
        }
        case "likes":
          return (b.likeCountInPeriod ?? b.likeCount ?? 0) - (a.likeCountInPeriod ?? a.likeCount ?? 0)
        case "engagement":
          return (b.engagementRateInPeriod ?? b.engagementRate ?? 0) - (a.engagementRateInPeriod ?? a.engagementRate ?? 0)
        case "date":
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        default:
          return (b.viewCountInPeriod ?? b.viewCount ?? 0) - (a.viewCountInPeriod ?? a.viewCount ?? 0)
      }
    })

    return result
  }, [currentData, platform, sort])

  return { data: filteredData, loading, error, isRefreshing }
}

// ─── Top accounts ──────────────────────────────────────────────────────────

export interface AccountFilters {
  platform?: string
  sort?: string
  limit?: number
  period?: string
  dateFrom?: string
  dateTo?: string
}

export function useTopAccounts(filters: AccountFilters = {}) {
  const { platform = "all", sort = "views", limit = 5, period = "7d", dateFrom, dateTo } = filters

  const [data, setData] = useState<TopAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const prevDataRef = useRef<TopAccount[]>([])

  useEffect(() => {
    const controller = new AbortController()

    if (data.length > 0) setIsRefreshing(true)
    else setLoading(true)

    const params = buildParams(period, platform, dateFrom, dateTo)
    params.set("limit", limit.toString())

    const metricMap: Record<string, string> = {
      views: "viewCount",
      followers: "followerCount",
      engagement: "engagementRate",
      videos: "videoCount",
    }
    params.set("metric", metricMap[sort] || "viewCount")

    fetch(`/api/analytics/top-accounts?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((newData) => {
        if (newData.error) {
          setError(newData.error)
        } else {
          const arr = Array.isArray(newData) ? newData : []
          prevDataRef.current = arr
          setData(arr)
          setError(null)
        }
        setLoading(false)
        setIsRefreshing(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(err.message)
        setLoading(false)
        setIsRefreshing(false)
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, sort, limit, period, dateFrom, dateTo])

  const currentData = isRefreshing && prevDataRef.current.length > 0 ? prevDataRef.current : data
  const filteredData = useMemo(() => {
    let result = currentData

    if (platform !== "all") {
      result = result.filter(a => a.platform === platform)
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "views": {
          const aViews = a.viewCountInPeriod ?? a.totalViewCount ?? a.totalViews ?? 0
          const bViews = b.viewCountInPeriod ?? b.totalViewCount ?? b.totalViews ?? 0
          return bViews - aViews
        }
        case "followers":
          return (b.followerCount || 0) - (a.followerCount || 0)
        case "engagement":
          return (b.engagementRate || 0) - (a.engagementRate || 0)
        case "videos":
          return (b.totalVideoCount || b.videoCount || 0) - (a.totalVideoCount || a.videoCount || 0)
        default:
          return (b.viewCountInPeriod ?? b.totalViewCount ?? 0) - (a.viewCountInPeriod ?? a.totalViewCount ?? 0)
      }
    })

    return result
  }, [currentData, platform, sort])

  return { data: filteredData, loading, error, isRefreshing }
}

// ─── Interaction metrics (chart data) ──────────────────────────────────────

export interface MetricsFilters {
  period?: string
  platform?: string
  dateFrom?: string
  dateTo?: string
}

export function useInteractionMetrics(filters: MetricsFilters | string = {}) {
  const { period = "7d", platform = "all", dateFrom, dateTo } = typeof filters === "string"
    ? { period: filters, platform: "all", dateFrom: undefined, dateTo: undefined }
    : filters

  const [data, setData] = useState<InteractionMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const isInitialLoad = data.length === 0

    if (isInitialLoad) setLoading(true)
    else setIsRefreshing(true)

    const params = buildParams(period, platform, dateFrom, dateTo)

    fetch(`/api/analytics/interaction-metrics?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((newData) => {
        if (newData.error) {
          setError(newData.error)
        } else {
          // API returns { dailyMetrics: [...] } OR a bare array for back-compat
          const arr = Array.isArray(newData) ? newData : (Array.isArray(newData.dailyMetrics) ? newData.dailyMetrics : [])
          setData(arr)
          setError(null)
        }
        setLoading(false)
        setIsRefreshing(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(err.message)
        setLoading(false)
        setIsRefreshing(false)
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, platform, dateFrom, dateTo])

  return { data, loading, error, isRefreshing }
}

// ─── Paginated videos list ────────────────────────────────────────────────

export interface VideosListFilters {
  platform?: string
  sortCol?: string
  sortDir?: "asc" | "desc"
  page?: number
  perPage?: number
  search?: string
  period?: string
  dateFrom?: string
  dateTo?: string
}

export function useVideosList(filters: VideosListFilters = {}) {
  const {
    platform = "all",
    sortCol = "viewCount",
    sortDir = "desc",
    page = 1,
    perPage = 50,
    search,
    period = "7d",
    dateFrom,
    dateTo,
  } = filters

  const [data, setData] = useState<TopVideo[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    if (data.length > 0) setIsRefreshing(true)
    else setLoading(true)

    const params = buildParams(period, platform, dateFrom, dateTo)
    params.set("page", page.toString())
    params.set("perPage", perPage.toString())
    params.set("sortCol", sortCol)
    params.set("sortDir", sortDir)
    if (search) params.set("search", search)

    fetch(`/api/videos/list?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((response: PaginatedResponse<TopVideo> | { error: string }) => {
        if ("error" in response) {
          setError(response.error)
        } else {
          setData(response.data)
          setPageCount(response.pageCount)
          setTotalRows(response.totalRows)
          setError(null)
        }
        setLoading(false)
        setIsRefreshing(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(err.message)
        setLoading(false)
        setIsRefreshing(false)
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, sortCol, sortDir, page, perPage, search, period, dateFrom, dateTo])

  return { data, pageCount, totalRows, loading, error, isRefreshing }
}

// ─── Paginated accounts list ──────────────────────────────────────────────

export interface AccountsListFilters {
  platform?: string
  sortCol?: string
  sortDir?: "asc" | "desc"
  page?: number
  perPage?: number
  search?: string
  period?: string
  dateFrom?: string
  dateTo?: string
}

export function useAccountsList(filters: AccountsListFilters = {}) {
  const {
    platform = "all",
    sortCol = "totalViewCount",
    sortDir = "desc",
    page = 1,
    perPage = 50,
    search,
    period = "7d",
    dateFrom,
    dateTo,
  } = filters

  const [data, setData] = useState<TopAccount[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    if (data.length > 0) setIsRefreshing(true)
    else setLoading(true)

    const params = buildParams(period, platform, dateFrom, dateTo)
    params.set("page", page.toString())
    params.set("perPage", perPage.toString())
    params.set("sortCol", sortCol)
    params.set("sortDir", sortDir)
    if (search) params.set("search", search)

    fetch(`/api/accounts/list?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((response: PaginatedResponse<TopAccount> | { error: string }) => {
        if ("error" in response) {
          setError(response.error)
        } else {
          setData(response.data)
          setPageCount(response.pageCount)
          setTotalRows(response.totalRows)
          setError(null)
        }
        setLoading(false)
        setIsRefreshing(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(err.message)
        setLoading(false)
        setIsRefreshing(false)
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, sortCol, sortDir, page, perPage, search, period, dateFrom, dateTo])

  return { data, pageCount, totalRows, loading, error, isRefreshing }
}

// ─── Formatting + URL helpers ─────────────────────────────────────────────

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "0"
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) {
    // Handle the boundary where K rounds up to 1000+ (999,999 → "1.0M").
    const kVal = num / 1000
    if (kVal >= 999.95) return `${(num / 1000000).toFixed(1)}M`
    return `${kVal.toFixed(1)}K`
  }
  return num.toString()
}

export function getAccountUrl(account: { platform: string; username: string }): string | null {
  const { platform, username } = account
  if (!username) return null

  switch (platform) {
    case "tiktok": return `https://www.tiktok.com/@${username}`
    case "instagram": return `https://www.instagram.com/${username}/`
    case "youtube": return `https://www.youtube.com/@${username}`
    default: return null
  }
}

export function getVideoUrl(video: { platform: string; platformVideoId: string; accountUsername?: string; postUrl?: string }): string | null {
  if (video.postUrl) return video.postUrl
  const { platform, platformVideoId, accountUsername } = video

  switch (platform) {
    case "tiktok":
      return accountUsername ? `https://www.tiktok.com/@${accountUsername}/video/${platformVideoId}` : null
    case "instagram":
      return `https://www.instagram.com/reel/${platformVideoId}/`
    case "youtube":
      return `https://www.youtube.com/watch?v=${platformVideoId}`
    default:
      return null
  }
}

export function formatChangeValue(current: number, previous?: number): { value: string; type: "positive" | "negative" | "neutral" } {
  if (previous === undefined || previous === 0) {
    if (current > 0 && previous === undefined) return { value: "—", type: "neutral" }
    if (previous === 0 && current > 0) return { value: "New", type: "positive" }
    return { value: "—", type: "neutral" }
  }

  const percentChange = ((current - previous) / previous) * 100
  if (percentChange > 0) return { value: `+${percentChange.toFixed(1)}%`, type: "positive" }
  if (percentChange < 0) return { value: `${percentChange.toFixed(1)}%`, type: "negative" }
  return { value: "0%", type: "neutral" }
}
