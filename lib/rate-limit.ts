/*
  Naïve in-memory rate-limit helper designed for use inside Next.js middleware.
  NOTE: In a distributed environment (multiple serverless instances) this provides
  best-effort protection only. Upgrade to a persistent store (Redis) for production.
*/

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitOptions {
  windowMs?: number // duration of window in ms
  max?: number // max requests within window
}

export function isRateLimited(
  key: string,
  { windowMs = 60_000, max = 60 }: RateLimitOptions = {}
): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    console.debug("[rate-limit] new bucket", { key, max, windowMs })
    return false
  }

  bucket.count += 1
  if (bucket.count > max) {
    console.warn("[rate-limit] limit exceeded", { key, count: bucket.count })
    return true
  }

  return false
}
