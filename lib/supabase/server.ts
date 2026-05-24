import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

const COOKIE_DOMAIN = process.env.NODE_ENV === "production" ? ".kodeui.com" : undefined

/**
 * Supabase server client for use in Server Components and Route Handlers.
 *
 * Cookies are written with `domain=.kodeui.com` in production so the session
 * is shared with the main mediapipe SaaS at app.kodeui.com.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
              })
            )
          } catch {
            // setAll throws in Server Components where cookies are read-only.
            // Safe to ignore — middleware refreshes the session on the next request.
          }
        },
      },
    }
  )
}
