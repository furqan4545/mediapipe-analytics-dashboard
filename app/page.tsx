import { redirect } from "next/navigation"

/**
 * Root path lands on the dashboard. Auth check is handled in middleware —
 * unauthenticated users are bounced to the main SaaS sign-in.
 */
export default function RootPage() {
  redirect("/dashboard")
}
