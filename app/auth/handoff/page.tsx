"use client"

/**
 * Token-handoff landing page.
 *
 * The main mediapipe SaaS redirects users here with tokens packed into
 * the URL fragment:
 *     https://<this-app>/auth/handoff#access_token=...&refresh_token=...
 *
 * The fragment is NEVER sent to the server (HTTP spec), so the tokens
 * stay client-side. This page:
 *   1. Parses the hash for access_token + refresh_token
 *   2. Calls supabase.auth.setSession() — Supabase writes its cookies
 *      onto THIS deployment's origin (host-only cookies)
 *   3. Wipes the hash from the URL so the tokens don't sit in history
 *   4. Redirects to /dashboard (or wherever ?next= points)
 *
 * If the fragment is missing or setSession fails, we bounce the user
 * back through the cross-app flow so the main SaaS can re-issue tokens.
 */

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const MAIN_SAAS_URL = process.env.NEXT_PUBLIC_MAIN_SAAS_URL || "https://hardlaunch.com"

function HandoffInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"working" | "error">("working")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      // Parse tokens from the URL fragment (#k=v&k=v).
      const hash = window.location.hash.replace(/^#/, "")
      const params = new URLSearchParams(hash)
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")

      if (!accessToken || !refreshToken) {
        // No tokens in URL — kick the user back through the cross-app flow.
        const origin = window.location.origin
        const handoffUrl = `${origin}/auth/handoff`
        window.location.replace(
          `${MAIN_SAAS_URL}/api/auth/cross-app?to=${encodeURIComponent(handoffUrl)}`
        )
        return
      }

      try {
        const supabase = createClient()
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) throw error

        // Clear the hash so tokens don't linger in browser history.
        window.history.replaceState(null, "", window.location.pathname)

        // Honor ?next= if provided, else go to the dashboard.
        const next = searchParams.get("next") || "/dashboard"
        router.replace(next)
      } catch (err) {
        console.error("[handoff] setSession failed:", err)
        setErrorMsg(err instanceof Error ? err.message : String(err))
        setStatus("error")
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 rounded-2xl glass shadow-fluid p-8">
          <h1 className="text-xl font-semibold">Sign-in handoff failed</h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <a
            href={MAIN_SAAS_URL}
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
          >
            Back to main SaaS
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-sm text-muted-foreground">Signing you in…</div>
    </div>
  )
}

export default function HandoffPage() {
  // Suspense boundary required for useSearchParams().
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <HandoffInner />
    </Suspense>
  )
}
