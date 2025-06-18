/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
</ai_context>
*/

import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const clerkOptions = {
  ignoredRoutes: [
    "/",
    "/about",
    "/contact",
    "/pricing",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/stripe/webhooks",
  ],
} as any;

// Wrap Clerk's middleware so we can enforce rate limiting *after* authentication
// checks have run but **before** hitting our API/business logic.
export default clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl;

  // Only rate-limit API calls (except the Stripe webhook b/c it comes from
  // Stripe's IPs and must never be blocked) and non-static routes.
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/stripe/webhooks")) {
    const allowed = checkRateLimit(req);
    if (!allowed) {
      // eslint-disable-next-line no-console
      console.warn("[middleware] rate limit triggered for", pathname);
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // Delegate to Clerk's default behaviour.
  return NextResponse.next();
}, clerkOptions);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
