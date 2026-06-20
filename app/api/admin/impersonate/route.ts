import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { authUsers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getEffectiveContext, isUuid, IMPERSONATE_COOKIE } from "@/lib/super-admin"

// Reads cookies / DB — always runtime, never prerender.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Start "view as customer": writes the `as_user` cookie so every analytics
 * route resolves to that customer. Super-admin only — a normal user calling
 * this is rejected, and even if the cookie were set by hand it's ignored by
 * `getEffectiveContext` for non-admins.
 */
export async function POST(request: Request) {
  const ctx = await getEffectiveContext()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!ctx.superAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { userId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const userId = (body.userId || "").trim()
  if (!userId || !isUuid(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 })
  }

  // Only allow impersonating a real user that actually exists.
  const exists = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .then((r) => r.length > 0)
    .catch(() => false)
  if (!exists) {
    return NextResponse.json({ error: "Unknown user" }, { status: 404 })
  }

  const res = NextResponse.json({ ok: true, userId })
  res.cookies.set(IMPERSONATE_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h — operator session, not permanent
  })
  return res
}

/**
 * Stop impersonating — clears the cookie. Safe to call as any authenticated
 * user (no-op if there's nothing to clear).
 */
export async function DELETE() {
  const ctx = await getEffectiveContext()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(IMPERSONATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return res
}
