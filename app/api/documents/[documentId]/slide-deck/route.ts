import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { and, eq, desc } from "drizzle-orm"
import { getDocumentByIdAction } from "@/actions/db/documents-actions"
import { slideDeckerAction } from "@/actions/ai/slide-decker-action"
import { db } from "@/db/db"
import { slideDecksTable } from "@/db/schema"
import { getSlideDecksForDocumentAction } from "@/actions/db/slide-deck-actions"

// Simple in-memory per-user rate limiter (mirrors citations route)
const WINDOW_MS = 60_000 // 1 minute window
const MAX_REQS = 3 // max slide deck requests per user per window
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

    // Parse body – default 30 minutes if none provided.
    const body = await request.json().catch(() => ({}))
    const minutes =
      typeof body.minutes === "number" && body.minutes > 0 ? body.minutes : 30

    // Rate-limit enforcement
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
    console.log("[API/slide-deck] rate", {
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

    // Fetch document & strip HTML to plain text
    const docRes = await getDocumentByIdAction(userId, documentId)
    if (!docRes.isSuccess || !docRes.data) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      )
    }

    const plain =
      typeof docRes.data.content === "string"
        ? docRes.data.content.replace(/<[^>]+>/g, " ")
        : ""

    // Empty content guard
    if (!plain.trim()) {
      return NextResponse.json(
        { message: "Document is empty" },
        { status: 400 }
      )
    }

    // Delegate to server action
    const res = await slideDeckerAction(plain, minutes)

    // Persist outline when successful to avoid re-paying tokens later.
    if (res.isSuccess && res.data) {
      try {
        // Convert bullet array to markdown string for persistent storage
        const markdown = res.data.map(p => `- ${p.text}`).join("\n")

        await db.insert(slideDecksTable).values({
          userId,
          documentId,
          title: docRes.data.title,
          content: markdown
        })
        console.log("[API/slide-deck] outline persisted", {
          userId,
          documentId,
          count: res.data.length
        })
      } catch (err) {
        console.error("[API/slide-deck] DB insert error", err)
      }
    }

    return NextResponse.json(res, { status: res.isSuccess ? 200 : 500 })
  } catch (e) {
    console.error("[API/slide-deck] error", e)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// -------------------- GET – history --------------------
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params

    const decks = await getSlideDecksForDocumentAction(userId, documentId)

    // Convert markdown back to outline array for existing frontend components
    const formatted = decks.map(d => ({
      id: d.id,
      createdAt: d.createdAt,
      outline: d.content
        .split(/\n+/)
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => ({ text: l.replace(/^[-•\s]+/, "").trim() }))
    }))

    return NextResponse.json(
      { isSuccess: true, data: formatted },
      { status: 200 }
    )
  } catch (error) {
    console.error("[API/slide-deck] GET error", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
