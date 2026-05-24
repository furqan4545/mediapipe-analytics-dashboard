"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlatformIcon } from "@/components/ui/platform-icons"
import { AccountsTableSkeleton } from "@/components/ui/skeleton"
import { Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from "lucide-react"
import { useAccountsList, formatNumber, getAccountUrl } from "@/lib/hooks/use-dashboard-data"
import { useDebounce } from "@/lib/hooks/use-debounce"

function AccountsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const period = searchParams.get("period") || "7d"
  const platform = searchParams.get("platform") || "all"
  const sortCol = searchParams.get("sortCol") || "totalViewCount"
  const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc"
  const pageParam = parseInt(searchParams.get("page") || "1")
  const dateFrom = searchParams.get("dateFrom") || undefined
  const dateTo = searchParams.get("dateTo") || undefined

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [currentPage, setCurrentPage] = useState(pageParam)

  const debouncedSearch = useDebounce(searchQuery, 300)

  const { data: accounts, pageCount, totalRows, loading, error, isRefreshing } = useAccountsList({
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
    router.push(`/accounts?${params.toString()}`)
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
    router.push(`/accounts?${params.toString()}`)
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
    router.push(`/accounts?${params.toString()}`)
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === "desc"
      ? <ArrowDown className="h-3 w-3" />
      : <ArrowUp className="h-3 w-3" />
  }

  if (loading) {
    return <AccountsTableSkeleton />
  }

  if (error) {
    return (
      <div className="rounded-2xl glass shadow-fluid overflow-hidden">
        <div className="p-8 text-center text-muted-foreground">
          Unable to load accounts
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts..."
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-subtle border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </form>
        <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
          {totalRows.toLocaleString()} accounts
        </div>
      </div>

      <div className={`rounded-2xl glass shadow-fluid overflow-hidden transition-opacity ${isRefreshing ? "opacity-70" : ""}`}>
        <div className="hidden sm:grid grid-cols-[3rem_3rem_1fr_6rem_6rem_5rem_1.5rem] gap-4 px-4 py-3 border-b border-border/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div>#</div>
          <div></div>
          <div>Account</div>
          <button onClick={() => handleSort("followerCount")} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors">
            Followers <SortIcon col="followerCount" />
          </button>
          <button onClick={() => handleSort("totalViewCount")} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors">
            Views <SortIcon col="totalViewCount" />
          </button>
          <button onClick={() => handleSort("engagementRate")} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors">
            Eng. <SortIcon col="engagementRate" />
          </button>
          <div></div>
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No accounts found
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {accounts.map((account, index) => {
              const accountUrl = getAccountUrl(account)
              return (
              <a
                key={account.id}
                href={accountUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`block ${accountUrl ? "" : "pointer-events-none"}`}
                onClick={accountUrl ? undefined : (e) => e.preventDefault()}
              >
                {/* Desktop row */}
                <div className="group hidden sm:grid grid-cols-[3rem_3rem_1fr_6rem_6rem_5rem_1.5rem] gap-4 items-center px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="text-sm font-medium text-muted-foreground">
                    {(currentPage - 1) * 50 + index + 1}
                  </div>

                  <div className="relative">
                    <Avatar className="h-10 w-10 ring-2 ring-white/50 dark:ring-white/10">
                      <AvatarImage src={account.profilePictureUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-chart-3 to-chart-4 text-white text-xs">
                        {account.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 bg-background/80 backdrop-blur-sm rounded-full p-0.5">
                      <PlatformIcon platform={account.platform} size="sm" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">
                      {account.displayName || account.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">@{account.username}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">
                      {formatNumber(account.followerCount)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-foreground">
                      {formatNumber(account.viewCountInPeriod ?? account.totalViewCount ?? account.totalViews ?? 0)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-foreground">
                      {((account.engagementRate || 0) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    {accountUrl && (
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>

                {/* Mobile card */}
                <div className="group sm:hidden flex items-center gap-3 px-4 py-3 active:bg-muted/30 transition-colors cursor-pointer">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10 ring-2 ring-white/50 dark:ring-white/10">
                      <AvatarImage src={account.profilePictureUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-chart-3 to-chart-4 text-white text-xs">
                        {account.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 bg-background/80 backdrop-blur-sm rounded-full p-0.5">
                      <PlatformIcon platform={account.platform} size="sm" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-foreground font-medium truncate">
                      {account.displayName || account.username}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      @{account.username} · {formatNumber(account.followerCount)} followers
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[13px] font-semibold text-foreground tabular-nums">
                      {formatNumber(account.viewCountInPeriod ?? account.totalViewCount ?? account.totalViews ?? 0)}
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

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsTableSkeleton />}>
      <AccountsContent />
    </Suspense>
  )
}
