import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { authUsers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getEffectiveContext } from "@/lib/super-admin"

// Reads cookies / DB — always runtime, never prerender.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Lightweight "who am I" probe for the client chrome (sidebar Admin link +
 * impersonation banner). Returns whether the caller is a super admin and, if
 * they're currently viewing a customer, who that customer is.
 */
export async function GET() {
  const ctx = await getEffectiveContext()
  if (!ctx) {
    return NextResponse.json({ isSuperAdmin: false, impersonating: false })
  }

  let viewingEmail: string | null = null
  if (ctx.impersonating) {
    viewingEmail = await db
      .select({ email: authUsers.email })
      .from(authUsers)
      .where(eq(authUsers.id, ctx.effectiveUserId))
      .then((r) => r[0]?.email ?? null)
      .catch(() => null)
  }

  return NextResponse.json({
    isSuperAdmin: ctx.superAdmin,
    impersonating: ctx.impersonating,
    viewingUserId: ctx.impersonating ? ctx.effectiveUserId : null,
    viewingEmail,
  })
}
