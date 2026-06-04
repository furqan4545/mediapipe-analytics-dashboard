import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const MAIN_SAAS_URL = process.env.NEXT_PUBLIC_MAIN_SAAS_URL || "https://hardlaunch.com"

/**
 * Refreshes the user's Supabase session and gates protected routes.
 *
 * Cookies are scoped to this app's own origin (no custom domain). The main
 * mediapipe SaaS runs on a different vercel.app subdomain, so the browser
 * won't share cookies between them. We use a token-handoff flow instead:
 *
 *   1. Unauthenticated visit to a protected page
 *   2. Middleware redirects to main SaaS `/api/auth/cross-app?to=<our /auth/handoff>`
 *   3. Main SaaS reads its own Supabase session, redirects back to
 *      `<our origin>/auth/handoff#access_token=...&refresh_token=...`
 *   4. Our /auth/handoff page calls supabase.auth.setSession(), which
 *      writes Supabase cookies on THIS origin
 *   5. User lands on /dashboard. Subsequent visits skip the handoff.
 *
 * API routes do their own auth check — they should NOT be 302'd here or
 * the client never sees a JSON 401 (it gets HTML instead).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            // Host-only cookie (no `domain`) — scoped to current Vercel subdomain.
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Whitelist /auth/* — the handoff page must be reachable WITHOUT a
  // session (it's the one that CREATES the session from the URL fragment).
  if (pathname.startsWith("/auth/")) {
    return supabaseResponse
  }

  // Page routes require auth. API routes return JSON 401 themselves.
  const isProtectedPage =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/accounts") ||
    pathname.startsWith("/videos") ||
    pathname.startsWith("/creators")

  if (isProtectedPage && !user) {
    // Send the user to the main SaaS, asking it to bounce them back here
    // with fresh tokens in a URL fragment. The `to` param tells main SaaS
    // where to send the user after extracting the session.
    const origin = request.nextUrl.origin
    const handoffUrl = `${origin}/auth/handoff`
    const target = `${MAIN_SAAS_URL}/api/auth/cross-app?to=${encodeURIComponent(handoffUrl)}`
    return NextResponse.redirect(target)
  }

  return supabaseResponse
}
