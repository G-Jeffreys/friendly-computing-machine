import { auth } from "@clerk/nextjs/server"
import { updateDocumentAction } from "@/actions/db/documents-actions"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, content } = body

    const { documentId } = await params

    const res = await updateDocumentAction(userId, documentId, {
      title,
      content
    })

    if (!res.isSuccess) {
      return NextResponse.json({ message: res.message }, { status: 400 })
    }

    return NextResponse.json(res.data, { status: 200 })
  } catch (error) {
    console.error("Failed to update document via API:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
