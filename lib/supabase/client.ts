import { createBrowserClient } from "@supabase/ssr"

/**
 * Supabase browser client. Cookie domain is set by the server-side `setAll`
 * helper in `./server.ts` and `./middleware.ts`; the browser client just
 * reads what's already there.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
