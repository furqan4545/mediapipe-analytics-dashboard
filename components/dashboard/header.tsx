"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { ChevronDown, Calendar, Filter } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { PlatformIcon } from "@/components/ui/platform-icons"
import { MobileMenuButton } from "@/components/dashboard/sidebar"

interface FilterOption {
  value: string
  label: string
}

interface FilterDef {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  options: FilterOption[]
}

const dashboardFilters: FilterDef[] = [
  {
    key: "period",
    label: "Period",
    icon: Calendar,
    options: [
      { value: "24h", label: "Last 24 hours" },
      { value: "7d", label: "Last 7 days" },
      { value: "14d", label: "Last 14 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 90 days" },
    ],
  },
  {
    key: "platform",
    label: "Platform",
    icon: Filter,
    options: [
      { value: "all", label: "All Platforms" },
      { value: "tiktok", label: "TikTok" },
      { value: "instagram", label: "Instagram" },
      { value: "youtube", label: "YouTube" },
    ],
  },
]

const pageConfig: Record<string, {
  title: string
  subtitle?: string
  filters: FilterDef[]
}> = {
  "/dashboard": {
    title: "Overview",
    subtitle: "Your content performance at a glance",
    filters: dashboardFilters,
  },
  "/": {
    title: "Overview",
    subtitle: "Your content performance at a glance",
    filters: dashboardFilters,
  },
  "/videos": {
    title: "Videos",
    subtitle: "All tracked videos",
    filters: dashboardFilters,
  },
  "/accounts": {
    title: "Accounts",
    subtitle: "All tracked accounts",
    filters: dashboardFilters,
  },
  "/creators": {
    title: "Top Creators",
    subtitle: "Performance leaderboard",
    filters: dashboardFilters,
  },
}

const periodPresets = [
  { value: "24h", label: "24h", labelFull: "Last 24 hours" },
  { value: "7d", label: "7d", labelFull: "Last 7 days" },
  { value: "14d", label: "14d", labelFull: "Last 14 days" },
  { value: "30d", label: "30d", labelFull: "Last 30 days" },
  { value: "90d", label: "90d", labelFull: "Last 90 days" },
]

function formatDateShort(dateStr: string): string {
  if (!dateStr) return ""
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function toLocalDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.round(ms / 86400000)
}

function PeriodFilterDropdown({
  period,
  dateFrom,
  dateTo,
  onBatchChange,
}: {
  period: string
  dateFrom: string
  dateTo: string
  onBatchChange: (changes: Record<string, string>) => void
}) {
  const [open, setOpen] = useState(false)
  const [tempFrom, setTempFrom] = useState(dateFrom || "")
  const [tempTo, setTempTo] = useState(dateTo || "")
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (dateFrom) setTempFrom(dateFrom)
    if (dateTo) setTempTo(dateTo)
  }, [dateFrom, dateTo])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
  }, [open])

  const isCustom = period === "custom"
  const selectedPreset = periodPresets.find((o) => o.value === period)

  const buttonLabel = isCustom && dateFrom && dateTo
    ? `${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)}`
    : selectedPreset?.labelFull || "Last 7 days"

  const handlePresetClick = (value: string) => {
    onBatchChange({ period: value })
    setOpen(false)
  }

  const handleApplyCustom = () => {
    if (tempFrom && tempTo) {
      const [f, t] = tempFrom > tempTo ? [tempTo, tempFrom] : [tempFrom, tempTo]
      onBatchChange({ period: "custom", dateFrom: f, dateTo: t })
      setOpen(false)
    }
  }

  const today = toLocalDateInput(new Date())
  const rangeDays = tempFrom && tempTo ? daysBetween(tempFrom, tempTo) : 0
  const rangeLabel = rangeDays > 0 ? `${rangeDays} day${rangeDays !== 1 ? "s" : ""}` : ""

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
          isCustom
            ? "bg-primary/10 text-primary font-medium hover:bg-primary/15"
            : "bg-muted/50 text-foreground hover:bg-muted"
        )}
      >
        <Calendar className="h-3.5 w-3.5 opacity-60" />
        <span className="hidden sm:inline">{buttonLabel}</span>
        <span className="sm:hidden">{isCustom && dateFrom ? formatDateShort(dateFrom) + "..." : "Period"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-50 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 sm:right-0 sm:left-auto mt-1.5 w-[280px] rounded-2xl bg-background/98 backdrop-blur-2xl border border-border/40 shadow-2xl shadow-black/20 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-3 pb-2">
            <div className="flex gap-1.5">
              {periodPresets.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePresetClick(option.value)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-[12px] font-medium transition-all duration-150",
                    period === option.value && !isCustom
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-3 border-t border-border/30" />

          <div className="p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Custom Range</span>
              {rangeLabel && tempFrom && tempTo && (
                <span className="text-[11px] text-muted-foreground/70 tabular-nums">{rangeLabel}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <label className="absolute left-2.5 top-1 text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider">From</label>
                <input
                  type="date"
                  value={tempFrom}
                  max={today}
                  onChange={(e) => setTempFrom(e.target.value)}
                  className="w-full rounded-lg bg-muted/30 pl-2.5 pr-2 pt-4 pb-1.5 text-[13px] text-foreground border border-border/20 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 focus:bg-muted/50 transition-all"
                />
              </div>
              <div className="relative">
                <label className="absolute left-2.5 top-1 text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider">To</label>
                <input
                  type="date"
                  value={tempTo}
                  max={today}
                  onChange={(e) => setTempTo(e.target.value)}
                  className="w-full rounded-lg bg-muted/30 pl-2.5 pr-2 pt-4 pb-1.5 text-[13px] text-foreground border border-border/20 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 focus:bg-muted/50 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleApplyCustom}
              disabled={!tempFrom || !tempTo}
              className={cn(
                "w-full rounded-lg py-2 text-[13px] font-semibold transition-all duration-150",
                tempFrom && tempTo
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-[0.98]"
                  : "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterDropdown({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef
  value: string
  onChange: (value: string) => void
}) {
  const Icon = filter.icon
  const selectedOption = filter.options.find((o) => o.value === value) || filter.options[0]
  const isPlatformFilter = filter.key === "platform"

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-[13px] text-foreground hover:bg-muted transition-colors">
        {isPlatformFilter && value !== "all" ? (
          <PlatformIcon platform={value} size="sm" />
        ) : (
          <Icon className="h-3.5 w-3.5 opacity-60" />
        )}
        <span className="hidden sm:inline">{selectedOption.label}</span>
        <span className="sm:hidden">{filter.label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </button>

      <div className="absolute top-full right-0 mt-1 min-w-[180px] rounded-xl bg-background/95 backdrop-blur-xl border border-border/50 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="p-1">
          {filter.options.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                value === option.value
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {isPlatformFilter && option.value !== "all" && (
                <PlatformIcon platform={option.value} size="sm" />
              )}
              {isPlatformFilter && option.value === "all" && (
                <Filter className="h-3.5 w-3.5 opacity-60" />
              )}
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const PERSISTED_FILTER_KEYS = ["period", "platform", "dateFrom", "dateTo"] as const
const STORAGE_KEY = "dashboard-filters"

function saveFilters(params: URLSearchParams) {
  try {
    const saved: Record<string, string> = {}
    for (const key of PERSISTED_FILTER_KEYS) {
      const val = params.get(key)
      if (val) saved[key] = val
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {}
}

function loadFilters(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: Record<string, string> = raw ? JSON.parse(raw) : {}
    const allowed = new Set<string>(PERSISTED_FILTER_KEYS)
    return Object.fromEntries(Object.entries(parsed).filter(([k]) => allowed.has(k)))
  } catch {
    return {}
  }
}

function HeaderContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const restoredRef = useRef(false)

  // Restore saved filters on first load if URL has none.
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    const hasAnyFilter = PERSISTED_FILTER_KEYS.some((k) => searchParams.has(k))
    if (hasAnyFilter) return

    const saved = loadFilters()
    if (Object.keys(saved).length === 0) return

    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(saved)) {
      params.set(key, value)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const config = pageConfig[pathname] || pageConfig["/"]
  const filterDefaults: Record<string, string> = { period: "7d" }

  const getFilterValue = (key: string, defaultValue: string) =>
    searchParams.get(key) || filterDefaults[key] || defaultValue

  const setFilterValue = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    saveFilters(params)
    router.push(`${pathname}?${params.toString()}`)
  }

  const setBatchFilterValues = (changes: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      params.set(key, value)
    }
    // Clear custom date params when switching to a preset.
    if (changes.period && changes.period !== "custom") {
      params.delete("dateFrom")
      params.delete("dateTo")
    }
    saveFilters(params)
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasFilters = config.filters.length > 0

  return (
    <>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <MobileMenuButton />
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">{config.title}</h1>
            {config.subtitle && (
              <p className="text-xs text-muted-foreground hidden sm:block">{config.subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            {config.filters.map((filter) =>
              filter.key === "period" ? (
                <PeriodFilterDropdown
                  key="period"
                  period={getFilterValue("period", "7d")}
                  dateFrom={searchParams.get("dateFrom") || ""}
                  dateTo={searchParams.get("dateTo") || ""}
                  onBatchChange={setBatchFilterValues}
                />
              ) : (
                <FilterDropdown
                  key={filter.key}
                  filter={filter}
                  value={getFilterValue(filter.key, filter.options[0].value)}
                  onChange={(value) => setFilterValue(filter.key, value)}
                />
              )
            )}
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="flex sm:hidden items-center gap-2 pt-2.5 w-full overflow-x-auto scrollbar-none">
          {config.filters.map((filter) =>
            filter.key === "period" ? (
              <PeriodFilterDropdown
                key="period"
                period={getFilterValue("period", "7d")}
                dateFrom={searchParams.get("dateFrom") || ""}
                dateTo={searchParams.get("dateTo") || ""}
                onBatchChange={setBatchFilterValues}
              />
            ) : (
              <FilterDropdown
                key={filter.key}
                filter={filter}
                value={getFilterValue(filter.key, filter.options[0].value)}
                onChange={(value) => setFilterValue(filter.key, value)}
              />
            )
          )}
        </div>
      )}
    </>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center bg-background/75 backdrop-blur-xl border-b border-border/50 px-4 sm:px-8 py-3 sm:py-4">
      <Suspense fallback={
        <div className="flex items-center justify-between w-full">
          <div className="h-6 w-24 bg-muted/50 rounded animate-pulse" />
          <div className="h-8 w-32 bg-muted/50 rounded animate-pulse" />
        </div>
      }>
        <HeaderContent />
      </Suspense>
    </header>
  )
}
