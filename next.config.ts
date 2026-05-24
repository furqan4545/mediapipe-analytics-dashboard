import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Allow remote images from common CDN sources used by viral.app's CSV.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.tiktokcdn-us.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.ggpht.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.ytimg.com" },
      { protocol: "https", hostname: "p16-sign-va.tiktokcdn.com" },
    ],
  },
  // Worker URL injected at build time so client components can read it.
  env: {
    NEXT_PUBLIC_WORKER_URL: process.env.NEXT_PUBLIC_WORKER_URL ?? "https://analytics.kodeui.com",
  },
}

export default nextConfig
