import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getDocumentByIdAction } from "@/actions/db/documents-actions"
import { citationHunterAction } from "@/actions/ai/citation-hunter-action"

// Create a new ratelimiter, that allows 5 requests per 1 minute
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  prefix: "@upstash/ratelimit"
})

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
    const { success } = await ratelimit.limit(userId)
    if (!success) {
      return NextResponse.json(
        { message: "Rate limit exceeded – please wait and try again." },
        { status: 429 }
      )
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
