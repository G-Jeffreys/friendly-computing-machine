import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getDocumentByIdAction } from "@/actions/db/documents-actions"
import { citationHunterAction } from "@/actions/ai/citation-hunter-action"

// Create a new ratelimiter (5 req / 1 min) only if Upstash Redis is configured.
let ratelimit: Ratelimit | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "@upstash/ratelimit"
    })
  } catch (e) {
    console.warn(
      "[API] citations ratelimit disabled – Redis initialization failed.",
      e
    )
  }
} else {
  console.warn(
    "[API] citations ratelimit disabled – UPSTASH_REDIS_* env vars not found."
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Rate limit by userId
    if (ratelimit) {
      const { success } = await ratelimit.limit(userId)
      if (!success) {
        return NextResponse.json(
          { message: "Rate limit exceeded – please wait and try again." },
          { status: 429 }
        )
      }
    }

    const { documentId } = await params

    const docRes = await getDocumentByIdAction(userId, documentId)
    if (!docRes.isSuccess || !docRes.data) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      )
    }

    const text =
      typeof docRes.data.content === "string"
        ? docRes.data.content.replace(/<[^>]+>/g, " ")
        : ""

    const res = await citationHunterAction(text)
    return NextResponse.json(res, { status: res.isSuccess ? 200 : 500 })
  } catch (e) {
    console.error("[API] citation hunter", e)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
