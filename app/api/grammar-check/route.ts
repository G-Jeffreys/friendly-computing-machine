import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { grammarCheckAction } from "@/actions/ai/grammar-check-action"
import { getUserDictionaryAction } from "@/actions/db/user-dictionary-actions"

// ------------------ Simple per-user in-memory rate limiter ------------------
// NOTE: This is reset whenever the serverless instance is recycled. For a more
// durable solution we could store counters in Redis.
const WINDOW_MS = 60_000 // 1-minute window
const MAX_REQS = 10 // Allow up to 10 grammar calls per user per window
const userCounters = new Map<string, { count: number; expires: number }>()

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // --------------- Rate-limit check ---------------
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
    console.log("[API/grammar-check] rate", {
      userId,
      count: counter.count,
      limit: MAX_REQS
    })

    if (counter.count > MAX_REQS) {
      return NextResponse.json(
        { message: "Rate limit exceeded – slow down and try again." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const text = typeof body.text === "string" ? body.text : ""
    if (!text.trim()) {
      return NextResponse.json({ message: "Invalid text" }, { status: 400 })
    }

    // Allow client to specify language (defaults to "en") so we fetch the proper dictionary.
    const languageCode: string =
      typeof body.languageCode === "string" && body.languageCode.trim() !== ""
        ? body.languageCode
        : "en"

    console.log("[API/grammar-check] received text length", text.length)
    console.log("[API/grammar-check] languageCode", languageCode)
    const res = await grammarCheckAction(text)
    console.log(
      "[API/grammar-check] suggestions before dictionary filter",
      res.data?.length ?? 0
    )

    // ---------------- Dictionary filtering ----------------
    if (res.isSuccess && Array.isArray(res.data)) {
      try {
        const dictRes = await getUserDictionaryAction(userId, languageCode)
        console.log(
          "[API/grammar-check] user dictionary words",
          dictRes.data?.length ?? 0
        )
        if (dictRes.isSuccess && Array.isArray(dictRes.data)) {
          const userWords = new Set<string>(
            dictRes.data.map(row => row.word.toLowerCase())
          )

          // Remove spell-type suggestions that are in the dictionary.
          res.data = res.data.filter(sg => {
            // Extract the substring to compare against dictionary.
            const rawSub = text.substring(sg.offset, sg.offset + sg.length)
            const word = rawSub.replace(/^[^\w]+|[^\w]+$/g, "").toLowerCase()
            const shouldKeep = !userWords.has(word)
            if (!shouldKeep) {
              console.debug(
                "[API/grammar-check] removed suggestion for dictionary word",
                word,
                sg.id
              )
            }
            return shouldKeep
          })
          console.log(
            "[API/grammar-check] suggestions after filter",
            res.data.length
          )
        }
      } catch (dictError) {
        // Non-fatal – log but continue with unfiltered suggestions.
        console.error(
          "[API/grammar-check] dictionary filtering failed",
          dictError
        )
      }
    }

    return NextResponse.json(res, { status: res.isSuccess ? 200 : 500 })
  } catch (error) {
    console.error("[API/grammar-check]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
