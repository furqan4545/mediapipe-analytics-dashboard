/**
 * Tiny client for the analytics worker (https://analytics.kodeui.com).
 *
 * Both endpoints require the current user's Supabase access token in the
 * Authorization header. The worker validates the JWT with its own secret.
 *
 * Called server-side from /api/sync and /api/onboard, which pull the token
 * from the current Supabase session and proxy through.
 */

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://analytics.kodeui.com"

async function postWorker(path: string, accessToken: string): Promise<unknown> {
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    // Short timeout — the worker kicks off async work and returns fast
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Worker ${path} failed (${res.status}): ${body || res.statusText}`)
  }

  return res.json().catch(() => ({}))
}

export function triggerSync(userId: string, accessToken: string): Promise<unknown> {
  return postWorker(`/sync/${userId}`, accessToken)
}

export function triggerOnboard(userId: string, accessToken: string): Promise<unknown> {
  return postWorker(`/onboard/${userId}`, accessToken)
}
