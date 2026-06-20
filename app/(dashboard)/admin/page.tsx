import { redirect } from "next/navigation"
import { getEffectiveContext } from "@/lib/super-admin"
import { AdminCustomers } from "@/components/admin/admin-customers"

// Reads the auth cookie + queries Postgres — runtime only, never prerender.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Super-admin home. Gated server-side: a normal authenticated user is bounced
 * to their own dashboard, an unauthenticated one is handled upstream by
 * middleware (token handoff). The actual data fetch is also super-admin gated
 * in /api/admin/customers, so this page is a convenience surface, not the
 * security boundary.
 */
export default async function AdminPage() {
  const ctx = await getEffectiveContext()
  if (!ctx) return null
  if (!ctx.superAdmin) redirect("/dashboard")

  return <AdminCustomers />
}
