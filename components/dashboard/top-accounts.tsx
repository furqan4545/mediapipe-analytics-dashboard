"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlatformIcon } from "@/components/ui/platform-icons"
import { ArrowRight, TrendingUp, AlertCircle, ExternalLink } from "lucide-react"
import { useTopAccounts, formatNumber, getAccountUrl } from "@/lib/hooks/use-dashboard-data"
import Link from "next/link"
import type { DashboardSource } from "@/lib/types"

interface TopAccountsProps {
  period?: string
  platform?: string
  sort?: string
  /** Ignored — kept so legacy callers still type-check. */
  source?: DashboardSource
  dateFrom?: string
  dateTo?: string
  /** Ignored — kept so legacy callers still type-check. */
  publishedOnly?: boolean
}

export function TopAccounts({ period = "30d", platform = "all", sort = "views", dateFrom, dateTo }: TopAccountsProps) {
  const { data: topAccounts, loading, error, isRefreshing } = useTopAccounts({ limit: 5, period, platform, sort, dateFrom, dateTo })
  const isAutomations = false
  const sectionTitle = "Top Accounts"
  const sectionSubtitle = "By views gained in period"

  if (loading) {
    return (
      <div className="rounded-2xl glass shadow-fluid overflow-hidden animate-fade-in relative" style={{ animationDelay: "450ms" }}>
        <div className="absolute inset-0 inner-light rounded-2xl pointer-events-none" />
        <div className="relative p-4 sm:p-7">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">{sectionTitle}</h3>
              <p className="text-xs text-muted-foreground">{sectionSubtitle}</p>
            </div>
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2.5 animate-pulse">
                <div className="h-6 w-6 bg-muted/50 rounded-lg" />
                <div className="h-10 w-10 bg-muted/50 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 bg-muted/50 rounded" />
                  <div className="h-3 w-1/3 bg-muted/50 rounded" />
                </div>
                <div className="h-5 w-12 bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl glass shadow-fluid overflow-hidden animate-fade-in relative" style={{ animationDelay: "450ms" }}>
        <div className="absolute inset-0 inner-light rounded-2xl pointer-events-none" />
        <div className="relative p-4 sm:p-7">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">{sectionTitle}</h3>
              <p className="text-xs text-muted-foreground">{sectionSubtitle}</p>
            </div>
          </div>
          <div className="text-center py-8 text-sm">
            <AlertCircle className="h-8 w-8 text-destructive/40 mx-auto mb-2" />
            <span className="text-destructive/70">Unable to load accounts</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl glass shadow-fluid overflow-hidden animate-fade-in relative" style={{ animationDelay: "450ms" }}>
      <div className="absolute inset-0 inner-light rounded-2xl pointer-events-none" />
      {isRefreshing && (
        <div className="absolute top-3 right-3 z-10">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      )}

      <div className={`relative p-4 sm:p-7 transition-opacity duration-200 ${isRefreshing ? "opacity-70" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-[15px] font-semibold text-foreground tracking-tight">{sectionTitle}</h3>
            <p className="text-xs text-muted-foreground">{sectionSubtitle}</p>
          </div>
          <Link
            href={`/accounts?${new URLSearchParams({
              period,
              ...(platform !== "all" ? { platform } : {}),
              sort,
            }).toString()}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-2">
          {topAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No accounts found
            </div>
          ) : (
            topAccounts.map((account, index) => {
              const accountUrl = getAccountUrl(account)
              return (
              <a
                key={account.id || account.username || index}
                href={accountUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-3.5 rounded-xl p-3 transition-all duration-200 hover:glass-subtle ${accountUrl ? "cursor-pointer" : "cursor-default"}`}
                onClick={accountUrl ? undefined : (e) => e.preventDefault()}
              >
                {/* Rank */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg glass-subtle text-xs font-medium text-muted-foreground">
                  {index + 1}
                </div>

                {/* Avatar */}
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-foreground truncate">
                      {account.displayName || account.username}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(account.followerCount)} followers
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3">
                  {/* Views */}
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[13px] font-semibold text-foreground">
                      {formatNumber(account.viewCountInPeriod ?? account.totalViewCount ?? account.totalViews ?? 0)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      views
                    </span>
                  </div>

                  {/* External link indicator */}
                  {accountUrl && (
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </a>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
