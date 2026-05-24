"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlatformIcon } from "@/components/ui/platform-icons"
import { VideosTableSkeleton } from "@/components/ui/skeleton"
import { Play, Search, ChevronLeft, ChevronRight, Hash, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from "lucide-react"
import { useVideosList, formatNumber, getVideoUrl } from "@/lib/hooks/use-dashboard-data"
import { useDebounce } from "@/lib/hooks/use-debounce"

function VideosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const period = searchParams.get("period") || "7d"
  const platform = searchParams.get("platform") || "all"
  const sortCol = searchParams.get("sortCol") || "viewCount"
  const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc"
  const pageParam = parseInt(searchParams.get("page") || "1")
  const dateFrom = searchParams.get("dateFrom") || undefined
  const dateTo = searchParams.get("dateTo") || undefined

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [currentPage, setCurrentPage] = useState(pageParam)

  const debouncedSearch = useDebounce(searchQuery, 300)

  const { data: videos, pageCount, totalRows, loading, error, isRefreshing } = useVideosList({
    platform,
    sortCol,
    sortDir,
    page: currentPage,
    perPage: 50,
    search: debouncedSearch || undefined,
    period,
    dateFrom,
    dateTo,
  })

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`/videos?${params.toString()}`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    const params = new URLSearchParams(searchParams.toString())
    if (searchQuery) {
      params.set("search", searchQuery)
    } else {
      params.delete("search")
    }
    params.set("page", "1")
    router.push(`/videos?${params.toString()}`)
  }

  const handleSort = (col: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (sortCol === col) {
      params.set("sortDir", sortDir === "desc" ? "asc" : "desc")
    } else {
      params.set("sortCol", col)
      params.set("sortDir", "desc")
    }
    params.set("page", "1")
    setCurrentPage(1)
    router.push(`/videos?${params.toString()}`)
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === "desc"
      ? <ArrowDown className="h-3 w-3" />
      : <ArrowUp className="h-3 w-3" />
  }

  if (loading) {
    return <VideosTableSkeleton />
  }

  if (error) {
    return (
      <div className="rounded-2xl glass shadow-fluid overflow-hidden">
        <div className="p-8 text-center text-muted-foreground">
          Unable to load videos
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos..."
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-subtle border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </form>
        <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
          {totalRows.toLocaleString()} videos
        </div>
      </div>

      <div className={`rounded-2xl glass shadow-fluid overflow-hidden transition-opacity ${isRefreshing ? "opacity-70" : ""}`}>
        <div className="hidden sm:grid grid-cols-[3rem_3rem_1fr_5.5rem_5rem_5rem_4rem_1.5rem] gap-4 px-4 py-3 border-b border-border/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div>#</div>
          <div></div>
          <div>Video</div>
          <button onClick={() => handleSort("publishedAt")} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors">
            Date <SortIcon col="publishedAt" />
          </button>
          <button onClick={() => handleSort("viewCount")} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors">
            Views <SortIcon col="viewCount" />
          </button>
          <button onClick={() => handleSort("likeCount")} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors">
            Likes <SortIcon col="likeCount" />
          </button>
          <button onClick={() => handleSort("engagementRate")} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors">
            Eng. <SortIcon col="engagementRate" />
          </button>
          <div></div>
        </div>

        {videos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No videos found
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {videos.map((video, index) => {
              const videoUrl = getVideoUrl(video)
              return (
              <a
                key={video.id}
                href={videoUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`block ${videoUrl ? "" : "pointer-events-none"}`}
                onClick={videoUrl ? undefined : (e) => e.preventDefault()}
              >
                {/* Desktop row */}
                <div className="group hidden sm:grid grid-cols-[3rem_3rem_1fr_5.5rem_5rem_5rem_4rem_1.5rem] gap-4 items-center px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="text-sm font-medium text-muted-foreground">
                    {(currentPage - 1) * 50 + index + 1}
                  </div>

                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted/50 flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Play className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 bg-background/80 backdrop-blur-sm rounded-full p-0.5">
                      <PlatformIcon platform={video.platform} size="sm" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate font-medium">
                      {video.caption || "Untitled video"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={video.accountProfilePictureUrl || undefined} />
                        <AvatarFallback className="text-[8px] bg-gradient-to-br from-chart-1 to-chart-2 text-white">
                          {video.accountUsername?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">
                        {video.accountUsername}
                      </span>
                      {video.hashtags && video.hashtags.length > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Hash className="h-3 w-3" />
                          <span className="text-[10px]">{video.hashtags.length}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">
                      {formatNumber(video.viewCountInPeriod ?? video.viewCount)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-foreground">
                      {formatNumber(video.likeCount)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-foreground">
                      {((video.engagementRate || 0) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    {videoUrl && (
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>

                {/* Mobile card */}
                <div className="group sm:hidden flex items-center gap-3 px-4 py-3 active:bg-muted/30 transition-colors cursor-pointer">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted/50 flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Play className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 bg-background/80 backdrop-blur-sm rounded-full p-0.5">
                      <PlatformIcon platform={video.platform} size="sm" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-foreground font-medium truncate">
                      {video.caption || "Untitled video"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {video.accountUsername}{video.publishedAt ? ` · ${new Date(video.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[13px] font-semibold text-foreground tabular-nums">
                      {formatNumber(video.viewCountInPeriod ?? video.viewCount)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">views</span>
                  </div>
                </div>
              </a>
              )
            })}
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 sm:py-3 border-t border-border/50">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Page {currentPage} of {pageCount}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center justify-center h-9 w-9 sm:h-8 sm:w-8 rounded-lg glass-subtle disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50 active:scale-95 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pageCount}
                className="flex items-center justify-center h-9 w-9 sm:h-8 sm:w-8 rounded-lg glass-subtle disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50 active:scale-95 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VideosPage() {
  return (
    <Suspense fallback={<VideosTableSkeleton />}>
      <VideosContent />
    </Suspense>
  )
}
