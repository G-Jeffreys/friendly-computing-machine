/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
</ai_context>
*/

import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"

const clerkOptions = {
  ignoredRoutes: [
    "/about",
    "/contact",
    "/pricing",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/stripe/webhooks"
  ]
} as any

// Wrap Clerk's middleware so we can enforce rate limiting *after* authentication
// checks have run but **before** hitting our API/business logic.
export default clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl

  // Only rate-limit API calls (except the Stripe webhook b/c it comes from
  // Stripe's IPs and must never be blocked) and non-static routes.
  if (
    pathname.startsWith("/api") &&
    !pathname.startsWith("/api/stripe/webhooks")
  ) {
    const allowed = checkRateLimit(req)
    if (!allowed) {
      // eslint-disable-next-line no-console
      console.warn("[middleware] rate limit triggered for", pathname)
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }
  }

  // When rate limit is not triggered we intentionally **return nothing** so
  // Clerk's internal middleware can continue and emit the headers required
  // for the `auth()` helper to detect that the middleware executed.
  return undefined as any
}, clerkOptions)

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
}
