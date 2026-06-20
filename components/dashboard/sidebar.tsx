"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useTheme } from "next-themes"
import {
  LayoutGrid,
  Users,
  Video,
  Shield,
  ChevronLeft,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutGrid, href: "/dashboard" },
  { label: "Accounts", icon: Users, href: "/accounts" },
  { label: "Videos", icon: Video, href: "/videos" },
]

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed"

export function MobileMenuButton() {
  return (
    <button
      onClick={() => {
        document.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"))
      }}
      className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // Always start expanded so SSR and first client render match.
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true") {
      setCollapsed(true)
    }
    setMounted(true)

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null)
        setUserName(
          user.user_metadata?.display_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] || null
        )
      }
    })

    // Server decides who's a super admin (allowlist) — the link is just chrome.
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setIsSuperAdmin(!!d?.isSuperAdmin))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
      document.documentElement.style.setProperty(
        "--sidebar-width",
        collapsed ? "72px" : "220px"
      )
    }
  }, [collapsed, mounted])

  // On mobile the sidebar is an overlay → effective width is 0.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    function handleChange(e: MediaQueryListEvent | MediaQueryList) {
      if (e.matches) {
        document.documentElement.style.setProperty("--sidebar-width", "0px")
      } else {
        document.documentElement.style.setProperty(
          "--sidebar-width",
          collapsed ? "72px" : "220px"
        )
      }
    }
    handleChange(mq)
    mq.addEventListener("change", handleChange)
    return () => mq.removeEventListener("change", handleChange)
  }, [collapsed])

  useEffect(() => {
    const handler = () => setMobileOpen((prev) => !prev)
    document.addEventListener("toggle-mobile-sidebar", handler)
    return () => document.removeEventListener("toggle-mobile-sidebar", handler)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail
      ? userEmail[0].toUpperCase()
      : "?"

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn("py-4", collapsed ? "flex justify-center md:flex" : "px-6")}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-2 shadow-sm flex-shrink-0">
            <span className="text-xs font-semibold text-white">A</span>
          </div>
          {(!collapsed || mobileOpen) && (
            <span className="text-[15px] font-semibold text-foreground tracking-tight whitespace-nowrap">
              Analytics
            </span>
          )}
        </div>
      </div>

      {/* Collapse toggle (desktop only) */}
      <div className={cn("pb-2 hidden", collapsed && !mobileOpen ? "md:flex justify-center" : "md:block px-3")}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center rounded-lg py-2 text-[13px] text-muted-foreground",
            "transition-all duration-200 ease-out hover:bg-muted/50 hover:text-foreground",
            collapsed && !mobileOpen ? "justify-center w-10" : "gap-2.5 px-3 w-full"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 flex-shrink-0 transition-transform duration-300 ease-out",
              collapsed ? "rotate-180" : "rotate-0"
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 py-2", collapsed && !mobileOpen ? "" : "px-3")}>
        <div className="space-y-1">
          {(isSuperAdmin
            ? [...navItems, { label: "Admin", icon: Shield, href: "/admin" }]
            : navItems
          ).map((item) => {
            const isActive = pathname === item.href
            return (
              <div key={item.label} className={cn(collapsed && !mobileOpen && "flex justify-center")}>
                <Link
                  href={item.href}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                  className={cn(
                    "relative flex items-center rounded-lg py-2.5 text-[13px]",
                    "transition-all duration-200 ease-out",
                    collapsed && !mobileOpen ? "justify-center w-10" : "gap-2.5 px-3",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] flex-shrink-0 transition-all duration-200",
                      isActive ? "text-primary" : "opacity-70"
                    )}
                  />
                  {(!collapsed || mobileOpen) && <span>{item.label}</span>}
                </Link>
              </div>
            )
          })}
        </div>
      </nav>

      {/* User + theme + sign out */}
      <div className={cn("border-t border-border/50 py-3 space-y-1", collapsed && !mobileOpen ? "" : "px-3")}>
        <div className={cn(collapsed && !mobileOpen && "flex justify-center")}>
          <div
            className={cn(
              "flex items-center rounded-lg py-1.5",
              collapsed && !mobileOpen ? "justify-center w-10" : "gap-2.5 px-3"
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-chart-3 to-chart-4 text-[11px] font-medium text-white flex-shrink-0">
              {initials}
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground truncate">
                  {userName || userEmail || "User"}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {userEmail}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={cn(collapsed && !mobileOpen && "flex justify-center")}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={collapsed && !mobileOpen ? "Toggle theme" : undefined}
            className={cn(
              "flex items-center rounded-lg py-2 text-[13px] text-muted-foreground",
              "transition-all duration-200 ease-out hover:bg-muted/50 hover:text-foreground",
              collapsed && !mobileOpen ? "justify-center w-10" : "gap-2.5 px-3 w-full"
            )}
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4 flex-shrink-0" />
            ) : (
              <Moon className="h-4 w-4 flex-shrink-0" />
            )}
            {(!collapsed || mobileOpen) && (
              <span>{mounted && theme === "dark" ? "Light mode" : "Dark mode"}</span>
            )}
          </button>
        </div>
        {/*
          Sign-out intentionally omitted: account/session lifecycle is owned
          by the main mediapipe SaaS. Users log out from there; this dashboard
          is just a feature surface of that SaaS.
        */}
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-20 hidden md:flex h-screen flex-col bg-background/75 backdrop-blur-xl border-r border-border/50",
          "transition-[width] duration-300 ease-out",
          collapsed ? "w-[72px]" : "w-[220px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 flex md:hidden w-[280px] flex-col bg-background/95 backdrop-blur-xl border-r border-border/50",
          "transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  )
}
