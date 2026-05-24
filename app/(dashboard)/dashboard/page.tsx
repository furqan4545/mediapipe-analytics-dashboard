"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { StatsSection } from "@/components/dashboard/stats-section"
import { MetricsChart } from "@/components/dashboard/metrics-chart"
import { TopVideos } from "@/components/dashboard/top-videos"
import { TopAccounts } from "@/components/dashboard/top-accounts"
import { DashboardSkeleton } from "@/components/ui/skeleton"

function DashboardContent() {
  const searchParams = useSearchParams()
  const period = searchParams.get("period") || "7d"
  const platform = searchParams.get("platform") || "all"
  const dateFrom = searchParams.get("dateFrom") || undefined
  const dateTo = searchParams.get("dateTo") || undefined

  return (
    <div className="space-y-4 sm:space-y-8">
      <StatsSection period={period} platform={platform} dateFrom={dateFrom} dateTo={dateTo} />

      <section>
        <MetricsChart period={period} platform={platform} dateFrom={dateFrom} dateTo={dateTo} />
      </section>

      <section className="grid gap-4 sm:gap-8 grid-cols-1 lg:grid-cols-2">
        <TopVideos period={period} platform={platform} sort="views" dateFrom={dateFrom} dateTo={dateTo} />
        <TopAccounts period={period} platform={platform} sort="views" dateFrom={dateFrom} dateTo={dateTo} />
      </section>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
