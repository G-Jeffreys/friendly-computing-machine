/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
</ai_context>
*/

import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { isRateLimited } from "@/lib/rate-limit"

const clerkOptions = {
  ignoredRoutes: [
    "/",
    "/about",
    "/contact",
    "/pricing",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/stripe/webhooks"
  ]
} as any

// Wrap Clerk middleware to inject rate-limiting logic **after** auth is resolved.
const appMiddleware = clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl

  // Rate-limit API routes except Stripe webhooks (already ignored above).
  if (
    pathname.startsWith("/api") &&
    !pathname.startsWith("/api/stripe/webhooks")
  ) {
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      // @ts-ignore – `ip` is non-standard in Edge Request but present in Node
      (req as any).ip ||
      "unknown"

    if (isRateLimited(ip)) {
      console.warn("[middleware] 429 for", ip, pathname)
      return NextResponse.json(
        { message: "Too many requests" },
        { status: 429 }
      )
    }
  }

  // Otherwise continue.
  return NextResponse.next()
}, clerkOptions)

export default appMiddleware

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
}
