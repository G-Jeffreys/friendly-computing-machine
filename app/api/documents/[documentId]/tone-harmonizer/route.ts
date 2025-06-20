import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { toneHarmonizerAction } from "@/actions/ai/tone-harmonizer-action"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const text = typeof body.text === "string" ? body.text : ""

    if (!text.trim()) {
      return NextResponse.json(
        { message: "No text provided for harmonization." },
        { status: 400 }
      )
    }

    const res = await toneHarmonizerAction(text)
    return NextResponse.json(res, { status: res.isSuccess ? 200 : 500 })
  } catch (e) {
    console.error("[API] tone harmonizer", e)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
