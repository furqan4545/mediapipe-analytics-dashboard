import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50",
        className
      )}
    />
  )
}

// Stats card skeleton
export function StatCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="rounded-2xl glass shadow-fluid p-5 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  )
}

// Stats section skeleton (6 cards)
export function StatsSectionSkeleton() {
  return (
    <section className="grid gap-4 grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {[...Array(6)].map((_, i) => (
        <StatCardSkeleton key={i} delay={i * 50} />
      ))}
    </section>
  )
}

// Chart skeleton
export function ChartSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="rounded-2xl glass shadow-fluid overflow-hidden animate-fade-in relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 inner-light rounded-2xl pointer-events-none" />
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="mb-4">
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-[180px] w-full rounded-lg" />
      </div>
    </div>
  )
}

// Video list item skeleton
export function VideoItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl p-2.5">
      <Skeleton className="h-6 w-6 rounded-lg" />
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  )
}

// Top videos/accounts card skeleton
export function TopListSkeleton({ delay = 0, title = "Loading..." }: { delay?: number; title?: string }) {
  return (
    <div
      className="rounded-2xl glass shadow-fluid overflow-hidden animate-fade-in relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 inner-light rounded-2xl pointer-events-none" />
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <VideoItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Activity heatmap skeleton
export function ActivitySkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="rounded-2xl glass shadow-fluid overflow-hidden animate-fade-in relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 inner-light rounded-2xl pointer-events-none" />
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-44" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <Skeleton className="h-[100px] w-full rounded-lg mb-4" />
        <div className="flex justify-between pt-3 border-t border-border/50">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="grid grid-cols-5 gap-3 mt-4 pt-4 border-t border-border/50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="h-3 w-3 mx-auto rounded-full" />
              <Skeleton className="h-4 w-8 mx-auto" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Full dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <StatsSectionSkeleton />
      <section className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        <ChartSkeleton delay={300} />
        <ChartSkeleton delay={350} />
      </section>
      <section className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        <TopListSkeleton delay={400} />
        <TopListSkeleton delay={450} />
      </section>
      <section>
        <ActivitySkeleton delay={500} />
      </section>
    </div>
  )
}

// Table row skeleton for listings
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Skeleton className="h-5 w-8" />
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      {[...Array(columns - 3)].map((_, i) => (
        <Skeleton key={i} className="h-4 w-16" />
      ))}
    </div>
  )
}

// Videos table skeleton
export function VideosTableSkeleton() {
  return (
    <div className="rounded-2xl glass shadow-fluid overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[3rem_3rem_1fr_6rem_6rem_5rem] gap-4 px-4 py-3 border-b border-border/50">
        <Skeleton className="h-3 w-4" />
        <div />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-10 ml-auto" />
        <Skeleton className="h-3 w-10 ml-auto" />
        <Skeleton className="h-3 w-8 ml-auto" />
      </div>
      {/* Rows */}
      <div className="divide-y divide-border/30">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[3rem_3rem_1fr_6rem_6rem_5rem] gap-4 items-center px-4 py-3"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-14 ml-auto" />
            <Skeleton className="h-4 w-12 ml-auto" />
            <Skeleton className="h-4 w-10 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Accounts table skeleton
export function AccountsTableSkeleton() {
  return (
    <div className="rounded-2xl glass shadow-fluid overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[3rem_3rem_1fr_6rem_6rem_5rem_5rem] gap-4 px-4 py-3 border-b border-border/50">
        <Skeleton className="h-3 w-4" />
        <div />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14 ml-auto" />
        <Skeleton className="h-3 w-10 ml-auto" />
        <Skeleton className="h-3 w-12 ml-auto" />
        <Skeleton className="h-3 w-8 ml-auto" />
      </div>
      {/* Rows */}
      <div className="divide-y divide-border/30">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[3rem_3rem_1fr_6rem_6rem_5rem_5rem] gap-4 items-center px-4 py-3"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-14 ml-auto" />
            <Skeleton className="h-4 w-12 ml-auto" />
            <Skeleton className="h-4 w-10 ml-auto" />
            <Skeleton className="h-4 w-10 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
