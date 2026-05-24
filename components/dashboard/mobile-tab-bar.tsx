"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { LayoutGrid, Users, Video } from "lucide-react"

const tabs = [
  { label: "Overview", icon: LayoutGrid, href: "/dashboard" },
  { label: "Videos", icon: Video, href: "/videos" },
  { label: "Accounts", icon: Users, href: "/accounts" },
]

const showOnPaths = ["/dashboard", "/videos", "/accounts"]

export function MobileTabBar() {
  const pathname = usePathname()
  const router = useRouter()

  // Prefetch all tab routes on mount for instant navigation
  useEffect(() => {
    tabs.forEach((tab) => {
      router.prefetch(tab.href)
    })
  }, [router])

  // Only show on main dashboard pages
  if (!showOnPaths.includes(pathname)) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden pointer-events-none">
      <div className="pointer-events-auto mx-auto w-fit mb-4">
        <div className="flex items-center gap-1 rounded-2xl bg-background/70 backdrop-blur-xl border border-border/30 shadow-lg shadow-black/10 dark:shadow-black/30 px-1.5 py-1.5">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground active:bg-muted/60"
                )}
              >
                <tab.icon className="h-4 w-4" strokeWidth={2} />
                {isActive && <span>{tab.label}</span>}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
