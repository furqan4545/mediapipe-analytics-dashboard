import React from "react"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { MobileTabBar } from "@/components/dashboard/mobile-tab-bar"
import "./globals.css"

export const metadata: Metadata = {
  title: "Analytics Dashboard",
  description: "Track your creative performance across platforms",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <MobileTabBar />
        </ThemeProvider>
      </body>
    </html>
  )
}
