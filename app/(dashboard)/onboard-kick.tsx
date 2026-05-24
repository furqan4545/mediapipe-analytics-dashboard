"use client"

import { useEffect, useRef } from "react"

const KICKED_KEY = "analytics-onboard-kicked"

/**
 * Client island that POSTs once to /api/onboard per session.
 *
 * The worker is idempotent — calling it more than once is fine, but it eats
 * a viral.app API call each time, so we throttle via sessionStorage.
 */
export function OnboardKick() {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    try {
      if (sessionStorage.getItem(KICKED_KEY) === "1") return
      sessionStorage.setItem(KICKED_KEY, "1")
    } catch {
      // sessionStorage can throw in private browsing; fail open.
    }

    fetch("/api/onboard", { method: "POST" }).catch((err) => {
      console.warn("[OnboardKick] /api/onboard failed:", err)
    })
  }, [])

  return null
}

export default OnboardKick
