import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { triggerSync } from "@/lib/worker-client"

// Reads cookies / DB — always runtime, never prerender.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Proxies POST /sync/:userId to the analytics worker.
 *
 * We forward the user's Supabase access token in Authorization so the worker
 * can re-validate the JWT with its own secret. The worker scopes all DB
 * writes to the userId derived from the JWT `sub`, so we don't pass user id
 * in the URL — defence in depth.
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
    const result = await triggerSync(user.id, session.access_token)
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error("[Sync proxy] failed:", error)
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 502 }
    )
  }
}
