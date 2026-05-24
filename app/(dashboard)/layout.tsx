import React from "react"
import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"
import { linkedAccounts } from "@/lib/db/schema"
import { eq, and, isNull, sql } from "drizzle-orm"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { OnboardKick } from "./onboard-kick"

// This layout reads the auth cookie + queries Postgres. Both are runtime
// concerns — never let Next try to prerender us at build time on Vercel.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAIN_SAAS_URL = process.env.NEXT_PUBLIC_MAIN_SAAS_URL || "https://app.kodeui.com"

/**
 * Dashboard route group layout.
 *
 * Responsibilities:
 *   1. Confirm the user is authenticated (middleware already redirects
 *      unauthenticated requests, but we re-check defensively).
 *   2. If the user has zero active linked_accounts, render the dashboard
 *      anyway but show a top banner prompting them to connect accounts.
 *      Charts/tables in child pages just render their own empty states.
 *   3. Fire-and-forget POST /api/onboard from the client to reconcile linked
 *      accounts with viral.app and kick a sync if needed. Idempotent on the
 *      worker side.
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

  // Count ACTIVE linked accounts (released_at IS NULL = active; released_at
  // NOT NULL means the SaaS marked the subscription as cancelled).
  //
  // Sentinel -1 = lookup failed. We err on the side of SHOWING the banner
  // when we can't read the table — better to over-prompt than to leave a
  // genuinely-unconnected user staring at zeros with no explanation.
  const activeCount = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(linkedAccounts)
    .where(and(
      eq(linkedAccounts.userId, user.id),
      isNull(linkedAccounts.releasedAt),
    ))
    .then(r => r[0]?.total ?? 0)
    .catch(err => {
      console.error("[Dashboard layout] linked_accounts lookup failed:", err)
      return -1
    })

  console.log(
    `[Dashboard layout] userId=${user.id} email=${user.email} activeLinkedAccounts=${activeCount}`
  )

  const showNoAccountsBanner = activeCount <= 0

  return (
    <div className="min-h-screen mesh-gradient">
      <Sidebar />

      <div className="transition-all duration-300" style={{ marginLeft: "var(--sidebar-width, 220px)" }}>
        <Header />
        <main className="p-4 sm:p-8 pb-24 md:pb-8 space-y-4 sm:space-y-6">
          {showNoAccountsBanner && <NoAccountsBanner />}
          {children}
        </main>
        <OnboardKick />
      </div>
    </div>
  )
}

function NoAccountsBanner() {
  return (
    <div className="rounded-2xl glass shadow-fluid border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
      <div className="flex items-start gap-3 flex-1">
        <div className="shrink-0 mt-0.5">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            Please connect accounts to see analytics
          </p>
          <p className="text-xs text-muted-foreground">
            Once you purchase a linked account in the main SaaS, your analytics
            will start flowing in automatically within a few minutes.
          </p>
        </div>
      </div>
      <Link
        href={MAIN_SAAS_URL}
        className="shrink-0 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto"
      >
        Connect accounts
      </Link>
    </div>
  )
}
