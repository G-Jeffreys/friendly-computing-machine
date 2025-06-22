/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
</ai_context>
*/

import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"

// Create an array of public routes that don't require authentication
const publicRoutes = [
  "/about",
  "/features",
  "/demo",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/stripe/webhooks"
]

// Combine rate limiting with auth middleware
export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId } = await auth()
  const { pathname } = req.nextUrl
  const isPublicRoute = publicRoutes.some(pattern => {
    if (pattern.includes("(.*)")) {
      return pathname.match(new RegExp(`^${pattern.replace("(.*)", ".*")}$`))
    }
    return pathname === pattern
  })

  // If the user is signed in and trying to access the root or public pages,
  // redirect them to /documents
  if (userId && (pathname === "/" || isPublicRoute)) {
    return NextResponse.redirect(new URL("/documents", req.url))
  }

  // If the user is not signed in and trying to access a protected route,
  // redirect them to /about
  if (!userId && !isPublicRoute && pathname !== "/") {
    return NextResponse.redirect(new URL("/about", req.url))
  }

  // Handle rate limiting for API routes
  if (
    pathname.startsWith("/api") &&
    !pathname.startsWith("/api/stripe/webhooks")
  ) {
    const allowed = checkRateLimit(req)
    if (!allowed) {
      return NextResponse.json(
        { message: "Rate limit exceeded" },
        { status: 429 }
      )
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)", // match all paths except static files
    "/", // include root
    "/(api|trpc)(.*)" // include API routes
  ]
}
