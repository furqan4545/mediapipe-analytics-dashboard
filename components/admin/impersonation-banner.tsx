"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, LogOut, Loader2 } from "lucide-react"

/**
 * Sits at the top of every page while a super admin is "viewing as" a
 * customer, so it's always obvious the data on screen isn't the operator's own.
 * "Exit" clears the impersonation cookie and returns to the admin home.
 */
export function ImpersonationBanner({
  email,
  userId,
}: {
  email: string | null
  userId: string
}) {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  async function exit() {
    setExiting(true)
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" })
      router.push("/admin")
      router.refresh()
    } catch {
      setExiting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/10 shadow-fluid p-3 sm:p-4 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20">
        <Eye className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Admin view
        </p>
        <p className="text-xs text-muted-foreground truncate">
          Viewing{" "}
          <span className="font-medium text-foreground">
            {email || `${userId.slice(0, 8)}…`}
          </span>{" "}
          analytics. They are not notified.
        </p>
      </div>
      <button
        onClick={exit}
        disabled={exiting}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {exiting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <LogOut className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">Exit admin view</span>
        <span className="sm:hidden">Exit</span>
      </button>
    </div>
  )
}
