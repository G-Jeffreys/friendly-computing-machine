import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { getDocumentByIdAction } from "@/actions/db/documents-actions"
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

    const { documentId } = await params

    // Fetch latest content from DB to avoid harmonizing stale copy.
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

    const res = await toneHarmonizerAction(text)
    return NextResponse.json(res, { status: res.isSuccess ? 200 : 500 })
  } catch (e) {
    console.error("[API] tone harmonizer", e)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
