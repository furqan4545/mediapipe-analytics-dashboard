import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

/**
 * Postgres connection pool shared across all server requests in this process.
 *
 * `prepare: false` is required by Supabase's pooler ("Transaction" mode on
 * port 6543). Switching to the direct connection on port 5432 would let us
 * enable prepared statements, but we don't need it.
 *
 * `max: 10` keeps us under the per-project pool limit shared with the main
 * SaaS — bump only if needed.
 */
const queryClient = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 30,
  prepare: false,
})

export const db = drizzle(queryClient, { schema })
