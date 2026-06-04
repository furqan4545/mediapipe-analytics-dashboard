import React from "react"
import Link from "next/link"
import { AlertCircle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"
import { adminAccounts } from "@/lib/db/schema"
import { and, eq, isNull, sql } from "drizzle-orm"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { OnboardKick } from "./onboard-kick"

// This layout reads the auth cookie + queries Postgres. Both are runtime
// concerns — never let Next try to prerender us at build time on Vercel.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAIN_SAAS_URL = process.env.NEXT_PUBLIC_MAIN_SAAS_URL || "https://hardlaunch.com"

/**
 * Dashboard route group layout.
 *
 * Source of truth: mediapipe-admin's `accounts` table (canonical inventory).
 * We look at two counts per user:
 *
 *   - active = released_at IS NULL                     (subscription still valid)
 *   - warmed = active AND warming_status = 'warmed'   (live on platform, fetchable)
 *
 * The banner has three states:
 *   • active == 0           → "Please connect accounts" (link to main SaaS)
 *   • active > 0, warmed == 0 → "Accounts being set up, analytics pending"
 *   • 0 < warmed < active   → "X of Y accounts are live, rest pending"
 *   • warmed == active      → no banner (everything live)
 */
export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Defensive — middleware already redirects unauthenticated requests.
    return null
  }

  // Single query: counts both active and warmed in one round trip.
  const counts = await db
    .select({
      active: sql<number>`count(*)::int`,
      warmed: sql<number>`count(*) filter (where ${adminAccounts.warmingStatus} = 'warmed')::int`,
    })
    .from(adminAccounts)
    .where(and(
      eq(adminAccounts.assignedToUser, user.id),
      isNull(adminAccounts.releasedAt),
    ))
    .then(r => r[0] ?? { active: 0, warmed: 0 })
    .catch(err => {
      console.error("[Dashboard layout] admin.accounts lookup failed:", err)
      return { active: -1, warmed: -1 }
    })

  console.log(
    `[Dashboard layout] userId=${user.id} email=${user.email} active=${counts.active} warmed=${counts.warmed}`
  )

  return (
    <div className="min-h-screen mesh-gradient">
      <Sidebar />

      <div className="transition-all duration-300" style={{ marginLeft: "var(--sidebar-width, 220px)" }}>
        <Header />
        <main className="p-4 sm:p-8 pb-24 md:pb-8 space-y-4 sm:space-y-6">
          <Banner active={counts.active} warmed={counts.warmed} />
          {children}
        </main>
        <OnboardKick />
      </div>
    </div>
  )
}

function Banner({ active, warmed }: { active: number; warmed: number }) {
  // active <= 0 covers the "no subscriptions" case AND the "lookup failed"
  // sentinel (-1). We prompt to connect accounts in both cases — better to
  // over-prompt than to leave the user confused.
  if (active <= 0) {
    return (
      <BannerShell
        tone="amber"
        icon={<AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        title="Please connect accounts to see analytics"
        body="Once you purchase an account in the main SaaS, your analytics will start flowing in here automatically."
        cta={{ href: MAIN_SAAS_URL, label: "Connect accounts" }}
      />
    )
  }

  // User has accounts but none are warmed yet — they're still being set up
  // by the admin / TokPortal workflow.
  if (warmed === 0) {
    return (
      <BannerShell
        tone="blue"
        icon={<Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        title="Your accounts are being set up"
        body={`${active} account${active === 1 ? "" : "s"} pending. Analytics will appear here as each one goes live on the platform (typically 3–7 days).`}
      />
    )
  }

  // Mixed state: some live, some still warming.
  if (warmed < active) {
    return (
      <BannerShell
        tone="blue"
        icon={<Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        title={`${warmed} of ${active} accounts are live`}
        body={`Analytics for the remaining ${active - warmed} account${active - warmed === 1 ? "" : "s"} will appear once they go live.`}
      />
    )
  }

  // warmed === active → everything live, no banner.
  return null
}

function BannerShell({
  tone,
  icon,
  title,
  body,
  cta,
}: {
  tone: "amber" | "blue"
  icon: React.ReactNode
  title: string
  body: string
  cta?: { href: string; label: string }
}) {
  const toneClasses = tone === "amber"
    ? "border-amber-500/30 bg-amber-500/5"
    : "border-blue-500/30 bg-blue-500/5"

  return (
    <div className={`rounded-2xl glass shadow-fluid border ${toneClasses} p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4`}>
      <div className="flex items-start gap-3 flex-1">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{body}</p>
        </div>
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="shrink-0 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto"
        >
          {cta.label}
        </Link>
      )}
    </div>
  )
}
