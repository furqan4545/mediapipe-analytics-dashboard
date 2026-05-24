import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { triggerOnboard } from "@/lib/worker-client"

// Reads cookies / DB — always runtime, never prerender.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Proxies POST /onboard/:userId to the analytics worker.
 *
 * Called by the dashboard layout on first visit when the user has linked
 * accounts but no synced analytics yet. The worker reconciles
 * `linked_accounts` → viral.app tracking and kicks an initial sync.
 *
 * Idempotent — safe to call repeatedly.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return NextResponse.json({ error: "No session token" }, { status: 401 })
  }

  try {
    const result = await triggerOnboard(user.id, session.access_token)
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error("[Onboard proxy] failed:", error)
    return NextResponse.json(
      { error: "Onboard failed", details: String(error) },
      { status: 502 }
    )
  }
}
