/*
<ai_context>
Very lightweight in-memory rate limiter. Suitable for single-instance
serverless functions (e.g. Vercel edge) but **not** a robust production
solution – for that we'll swap to Redis/Upstash. We log aggressively so we can
trace behaviour in the platform logs.
</ai_context>
*/

import { NextRequest } from "next/server"

// Configuration – tweak as required.
const WINDOW_MS = 60_000 // 1 minute
const MAX_REQS = 20 // requests per window per IP

// Map ip -> { count, expires }
const counters = new Map<string, { count: number; expires: number }>()

/**
 * Apply a token-bucket style rate-limit. Returns `true` if the request should
 * proceed or `false` if it exceeds the limit.
 */
export function checkRateLimit(req: NextRequest): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

  const now = Date.now()
  const entry = counters.get(ip) || { count: 0, expires: now + WINDOW_MS }

  if (now > entry.expires) {
    // Reset window
    entry.count = 0
    entry.expires = now + WINDOW_MS
  }

  entry.count += 1
  counters.set(ip, entry)

  // eslint-disable-next-line no-console
  console.log("[rate-limit]", { ip, count: entry.count, limit: MAX_REQS })

  return entry.count <= MAX_REQS
}
