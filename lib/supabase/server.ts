import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Supabase server client for Server Components and Route Handlers.
 *
 * Cookies are host-only (no custom `domain` attribute) — scoped to this
 * Vercel deployment's own subdomain. We do NOT try to share cookies with
 * the main SaaS (different vercel.app subdomain). Cross-app auth happens
 * via the token-handoff flow at /auth/handoff instead — see middleware.ts.
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
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll throws in Server Components where cookies are read-only.
            // Safe to ignore — middleware refreshes the session next request.
          }
        },
      },
    }
  )
}
