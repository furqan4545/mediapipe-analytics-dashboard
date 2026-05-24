import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const COOKIE_DOMAIN = process.env.NODE_ENV === "production" ? ".kodeui.com" : undefined
const MAIN_SAAS_URL = process.env.NEXT_PUBLIC_MAIN_SAAS_URL || "https://app.kodeui.com"

/**
 * Refreshes the user's Supabase session and gates protected routes.
 *
 * Unauthenticated requests to dashboard pages are redirected to the main
 * mediapipe SaaS sign-in URL (the SaaS is the only place users sign in).
 *
 * Note: API routes do their own auth check — they should NOT be 302'd or
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
            supabaseResponse.cookies.set(name, value, {
              ...options,
              ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
            })
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Page routes require auth. API routes return JSON 401 themselves.
  const isProtectedPage =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/accounts") ||
    pathname.startsWith("/videos") ||
    pathname.startsWith("/creators")

  if (isProtectedPage && !user) {
    // Send users to the main SaaS sign-in. The SaaS, after login, can redirect
    // back here via `?next=https://analytics.kodeui.com/dashboard`.
    const next = encodeURIComponent(request.nextUrl.toString())
    return NextResponse.redirect(`${MAIN_SAAS_URL}/login?next=${next}`)
  }

  return supabaseResponse
}
