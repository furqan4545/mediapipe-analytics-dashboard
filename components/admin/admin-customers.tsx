"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  UserCircle,
  Video,
  Eye,
  Gauge,
  TrendingUp,
  Search,
  ArrowUpDown,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { PlatformIcon } from "@/components/ui/platform-icons"
import { formatNumber } from "@/lib/hooks/use-dashboard-data"
import { cn } from "@/lib/utils"

interface Customer {
  userId: string
  email: string | null
  createdAt: string | null
  accountCount: number
  activeAccountCount: number
  followerCount: number
  videoCount: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  avgViewsPerVideo: number
  engagementRate: number
  lastSyncAt: string | null
  platforms: string[]
}

interface Totals {
  customers: number
  accounts: number
  activeAccounts: number
  videos: number
  totalViews: number
  followerCount: number
  avgViewsPerVideo: number
}

type SortKey =
  | "email"
  | "accountCount"
  | "videoCount"
  | "totalViews"
  | "avgViewsPerVideo"
  | "engagementRate"
  | "lastSyncAt"

function timeAgo(iso: string | null): string {
  if (!iso) return "Never"
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (diff < 0) return "Just now"
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function AdminCustomers() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("totalViews")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [openingId, setOpeningId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/admin/customers", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setCustomers(data.customers ?? [])
          setTotals(data.totals ?? null)
          setError(null)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(err.message)
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = q
      ? customers.filter(
          (c) =>
            (c.email || "").toLowerCase().includes(q) ||
            c.userId.toLowerCase().includes(q)
        )
      : customers

    const sorted = [...rows].sort((a, b) => {
      let av: number | string
      let bv: number | string
      switch (sortKey) {
        case "email":
          av = (a.email || a.userId).toLowerCase()
          bv = (b.email || b.userId).toLowerCase()
          break
        case "lastSyncAt":
          av = a.lastSyncAt ? new Date(a.lastSyncAt).getTime() : 0
          bv = b.lastSyncAt ? new Date(b.lastSyncAt).getTime() : 0
          break
        default:
          av = a[sortKey]
          bv = b[sortKey]
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return 0
    })
    return sorted
  }, [customers, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "email" ? "asc" : "desc")
    }
  }

  async function viewAs(userId: string) {
    setOpeningId(userId)
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || "Could not open customer")
        setOpeningId(null)
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open customer")
      setOpeningId(null)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Platform-wide KPI cards */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Customers"
          value={totals ? totals.customers.toString() : "—"}
          icon={Users}
          delay={0}
        />
        <StatCard
          title="Tracked Accounts"
          value={totals ? formatNumber(totals.accounts) : "—"}
          change={totals ? `${formatNumber(totals.activeAccounts)} active` : undefined}
          changeType="neutral"
          icon={UserCircle}
          delay={50}
        />
        <StatCard
          title="Videos"
          value={totals ? formatNumber(totals.videos) : "—"}
          icon={Video}
          delay={100}
        />
        <StatCard
          title="Total Views"
          value={totals ? formatNumber(totals.totalViews) : "—"}
          icon={Eye}
          delay={150}
        />
        <StatCard
          title="Avg Views / Video"
          value={totals ? formatNumber(Math.round(totals.avgViewsPerVideo)) : "—"}
          icon={Gauge}
          delay={200}
        />
      </section>

      {/* Customers table */}
      <section className="rounded-2xl glass shadow-fluid overflow-hidden relative animate-fade-in">
        <div className="absolute inset-0 inner-light rounded-2xl pointer-events-none" />
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="space-y-1">
              <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
                All customers
              </h2>
              <p className="text-xs text-muted-foreground">
                Click a customer to open their full analytics dashboard.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email"
                className="w-full rounded-lg bg-muted/40 pl-9 pr-3 py-2 text-[13px] text-foreground border border-border/20 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm text-destructive/80 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {search ? "No customers match your search." : "No customers with analytics yet."}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Th label="Customer" onClick={() => toggleSort("email")} active={sortKey === "email"} dir={sortDir} align="left" />
                    <th className="px-3 py-2.5 text-left font-medium">Platforms</th>
                    <Th label="Accounts" onClick={() => toggleSort("accountCount")} active={sortKey === "accountCount"} dir={sortDir} />
                    <Th label="Videos" onClick={() => toggleSort("videoCount")} active={sortKey === "videoCount"} dir={sortDir} />
                    <Th label="Total Views" onClick={() => toggleSort("totalViews")} active={sortKey === "totalViews"} dir={sortDir} />
                    <Th label="Avg / Video" onClick={() => toggleSort("avgViewsPerVideo")} active={sortKey === "avgViewsPerVideo"} dir={sortDir} />
                    <Th label="Engagement" onClick={() => toggleSort("engagementRate")} active={sortKey === "engagementRate"} dir={sortDir} />
                    <Th label="Last Sync" onClick={() => toggleSort("lastSyncAt")} active={sortKey === "lastSyncAt"} dir={sortDir} />
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.userId}
                      onClick={() => !openingId && viewAs(c.userId)}
                      className={cn(
                        "group border-b border-border/20 last:border-0 cursor-pointer transition-colors hover:bg-muted/30",
                        openingId === c.userId && "bg-primary/5"
                      )}
                    >
                      <td className="px-3 py-3 text-left">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-chart-3 to-chart-4 text-[11px] font-medium text-white">
                            {(c.email || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-foreground truncate max-w-[200px]">
                              {c.email || "Unknown"}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {c.userId.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {c.platforms.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            c.platforms.map((p) => (
                              <PlatformIcon key={p} platform={p} size="sm" />
                            ))
                          )}
                        </div>
                      </td>
                      <Td>
                        <span className="font-medium text-foreground">{c.accountCount}</span>
                        {c.activeAccountCount > 0 && (
                          <span className="text-[11px] text-muted-foreground"> / {c.activeAccountCount}</span>
                        )}
                      </Td>
                      <Td>{formatNumber(c.videoCount)}</Td>
                      <Td>
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatNumber(c.totalViews)}
                        </span>
                      </Td>
                      <Td>{formatNumber(Math.round(c.avgViewsPerVideo))}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <TrendingUp className="h-3 w-3 text-emerald-500/70" />
                          {c.engagementRate.toFixed(1)}%
                        </span>
                      </Td>
                      <Td>
                        <span className="text-muted-foreground">{timeAgo(c.lastSyncAt)}</span>
                      </Td>
                      <td className="px-3 py-3 text-right">
                        {openingId === c.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Th({
  label,
  onClick,
  active,
  dir,
  align = "right",
}: {
  label: string
  onClick: () => void
  active: boolean
  dir: "asc" | "desc"
  align?: "left" | "right"
}) {
  return (
    <th className={cn("px-3 py-2.5 font-medium", align === "right" ? "text-right" : "text-left")}>
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          align === "right" && "flex-row-reverse",
          active && "text-foreground"
        )}
      >
        <span>{label}</span>
        <ArrowUpDown className={cn("h-3 w-3", active ? "opacity-100" : "opacity-40")} />
      </button>
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-3 text-right text-[13px] text-foreground tabular-nums whitespace-nowrap">
      {children}
    </td>
  )
}
