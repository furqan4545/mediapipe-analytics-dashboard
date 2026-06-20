import { cookies } from "next/headers"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

/**
 * Super-admin layer.
 *
 * A super admin is a small, hard-coded allowlist of operator emails. They can
 * "view as" any customer: a secure cookie (`as_user`) holds the customer's
 * user id, and every analytics route resolves the *effective* user through
 * `getEffectiveContext()` instead of trusting `auth.getUser().id` directly.
 *
 * This is what lets the entire existing dashboard (overview, charts, accounts,
 * per-video views) render for an arbitrary customer with zero new UI — the
 * super admin just impersonates and the normal pages do the rest.
 *
 * Gating is enforced server-side in every admin route + in `getEffectiveContext`.
 * The cookie is only ever honored when the caller is a confirmed super admin,
 * so a normal user setting `as_user` by hand changes nothing for them.
 */

export const IMPERSONATE_COOKIE = "as_user"

const DEFAULT_SUPER_ADMINS = [
  "faqi9500@gmail.com",
  "furqan.adeveloper@gmail.com",
]

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The allowlist. Override in prod with `SUPER_ADMIN_EMAILS` (comma-separated);
 * falls back to the built-in operators if the env var is unset/empty.
 */
export function superAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS
  const fromEnv = raw
    ? raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : []
  return fromEnv.length > 0 ? fromEnv : DEFAULT_SUPER_ADMINS
}

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false
  return superAdminEmails().includes(email.toLowerCase())
}

export interface EffectiveContext {
  /** The actually-logged-in user (never the impersonated one). */
  user: User
  superAdmin: boolean
  /** The user id all analytics queries should scope to. */
  effectiveUserId: string
  /** True when a super admin is viewing someone else's data. */
  impersonating: boolean
}

/**
 * Resolves who the current request should see data for.
 *
 * - Normal user            → always their own id, no impersonation.
 * - Super admin, no cookie  → their own id.
 * - Super admin, valid cookie pointing at another user → that customer's id.
 *
 * Returns `null` only when there's no authenticated session at all.
 */
export async function getEffectiveContext(): Promise<EffectiveContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const superAdmin = isSuperAdmin(user.email)
  if (!superAdmin) {
    return { user, superAdmin: false, effectiveUserId: user.id, impersonating: false }
  }

  const cookieStore = await cookies()
  const target = (cookieStore.get(IMPERSONATE_COOKIE)?.value || "").trim()

  if (target && UUID_RE.test(target) && target !== user.id) {
    return { user, superAdmin: true, effectiveUserId: target, impersonating: true }
  }

  return { user, superAdmin: true, effectiveUserId: user.id, impersonating: false }
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
