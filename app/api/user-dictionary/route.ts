import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  addWordToDictionaryAction,
  getUserDictionaryAction,
  deleteWordFromDictionaryAction
} from "@/actions/db/user-dictionary-actions"
// TODO: Refine language detection or allow client to send language explicitly

/**
 * POST /api/user-dictionary
 * Body: { word: string, languageCode?: string }
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    let { word, languageCode } = body ?? {}

    if (typeof word !== "string" || !word.trim()) {
      return NextResponse.json({ message: "Invalid 'word'" }, { status: 400 })
    }

    if (!languageCode) {
      // Best-effort guess when omitted
      languageCode = "en"
    }

    const res = await addWordToDictionaryAction({
      userId,
      word,
      languageCode
    })

    return NextResponse.json(
      { message: res.message, data: res.data },
      { status: res.isSuccess ? 200 : 400 }
    )
  } catch (error) {
    console.error("[API/user-dictionary] POST failed", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

/**
 * GET /api/user-dictionary?lang=en
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const languageCode = searchParams.get("lang") ?? "en"

    const res = await getUserDictionaryAction(userId, languageCode)

    return NextResponse.json(
      { message: res.message, data: res.data },
      { status: res.isSuccess ? 200 : 400 }
    )
  } catch (error) {
    console.error("[API/user-dictionary] GET failed", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/user-dictionary - body { word: string, languageCode?: string }
 */
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    const body = await request.json()
    const { word, languageCode = "en" } = body ?? {}
    if (typeof word !== "string" || !word.trim()) {
      return NextResponse.json({ message: "Invalid 'word'" }, { status: 400 })
    }
    const res = await deleteWordFromDictionaryAction(userId, word, languageCode)
    return NextResponse.json(
      { message: res.message },
      { status: res.isSuccess ? 200 : 400 }
    )
  } catch (error) {
    console.error("[API/user-dictionary] DELETE failed", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
