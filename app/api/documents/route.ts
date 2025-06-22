import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/db/db"
import { documentsTable, slideDecksTable } from "@/db/schema"
import { eq, desc, inArray } from "drizzle-orm"
import { Redis } from "@upstash/redis"

// Initialize Redis client if credentials exist
let redis: Redis | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = Redis.fromEnv()
  } catch (e) {
    console.warn("[API/documents] Redis unavailable – caching disabled.", e)
  }
}

const CACHE_TTL = 60 * 5 // 5 minutes

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if slide decks should be included
    const { searchParams } = new URL(request.url)
    const includeSlideDecks = searchParams.get("include") === "slideDecks"

    // Try cache first if Redis is available
    if (redis) {
      const cacheKey = `docs:${userId}:${includeSlideDecks ? "withDecks" : "basic"}`
      const cached = await redis.get(cacheKey)
      if (cached) {
        console.log("[API/documents] Cache hit for", cacheKey)
        return NextResponse.json(cached)
      }
    }

    // Fetch documents basic list
    const docs = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.userId, userId))
      .orderBy(desc(documentsTable.updatedAt))

    let result = docs as any

    if (includeSlideDecks) {
      const docIds = docs.map(d => d.id)
      const decks = await db
        .select()
        .from(slideDecksTable)
        .where(inArray(slideDecksTable.documentId, docIds))
        .orderBy(desc(slideDecksTable.createdAt))

      result = docs.map(doc => ({
        ...doc,
        slideDecks: decks
          .filter(deck => deck.documentId === doc.id)
          .map(d => ({
            id: d.id,
            createdAt: d.createdAt,
            outline: d.content
              .split(/\n+/)
              .map(l => l.trim())
              .filter(Boolean)
              .map(l => ({ text: l.replace(/^[-•\d+.\s]+/, "").trim() }))
          }))
      }))
    }

    // Cache the result if Redis is available
    if (redis) {
      const cacheKey = `docs:${userId}:${includeSlideDecks ? "withDecks" : "basic"}`
      await redis.set(cacheKey, result, { ex: CACHE_TTL })
      console.log("[API/documents] Cached result for", cacheKey)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API/documents] error:", error)
    return NextResponse.json(
      { message: "Failed to fetch documents" },
      { status: 500 }
    )
  }
} 