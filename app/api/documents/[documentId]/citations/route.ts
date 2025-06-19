import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { getDocumentByIdAction } from "@/actions/db/documents-actions"
import { citationHunterAction } from "@/actions/ai/citation-hunter-action"

// Simple per-user rate limiter (in-memory)
const WINDOW_MS = 60_000 // 1 minute window
const MAX_REQS = 5 // max citation requests per user per window
const userCounters = new Map<string, { count: number; expires: number }>()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params

    // Rate limit check
    const now = Date.now()
    const counter = userCounters.get(userId) || {
      count: 0,
      expires: now + WINDOW_MS
    }
    if (now > counter.expires) {
      counter.count = 0
      counter.expires = now + WINDOW_MS
    }
    counter.count += 1
    userCounters.set(userId, counter)
    console.log("[API/citations] rate", {
      userId,
      count: counter.count,
      limit: MAX_REQS
    })

    if (counter.count > MAX_REQS) {
      return NextResponse.json(
        { message: "Rate limit exceeded – please wait and try again." },
        { status: 429 }
      )
    }

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
