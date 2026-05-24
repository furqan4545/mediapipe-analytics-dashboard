"use client"

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: LucideIcon
  delay?: number
  active?: boolean
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  delay = 0,
  active,
  onClick,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl p-4 sm:p-6 transition-all duration-300",
        "glass hover:glass-strong hover-float shadow-fluid",
        "animate-fade-in",
        onClick && "cursor-pointer",
        active && "ring-2 ring-primary/50"
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      {/* Inner highlight */}
      <div className="absolute inset-0 inner-light rounded-2xl pointer-events-none" />

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 sm:gap-1.5 min-w-0">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-tight">
            {title}
          </span>
          <span className="text-[1.15rem] sm:text-2xl font-semibold tracking-tight text-foreground leading-none">
            {value}
          </span>
          {change && (
            <div className="flex items-center gap-0.5 mt-1">
              {changeType === "positive" && (
                <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500" />
              )}
              {changeType === "negative" && (
                <ArrowDownRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500" />
              )}
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-medium",
                  changeType === "positive" && "text-emerald-500",
                  changeType === "negative" && "text-red-500",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </span>
            </div>
          )}
        </div>

        <div className={cn(
          "flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl",
          "transition-all duration-300",
          active
            ? "bg-gradient-to-br from-primary to-chart-2 scale-110 shadow-lg"
            : "glass group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-chart-2 group-hover:text-white group-hover:scale-110 group-hover:shadow-lg group-hover:glow-sm"
        )}>
          <Icon className={cn(
            "h-4 w-4 sm:h-5 sm:w-5 transition-colors",
            active ? "text-white" : "text-primary group-hover:text-white"
          )} />
        </div>
      </div>
    </div>
  )
}
