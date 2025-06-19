import { auth } from "@clerk/nextjs/server"
import {
  updateDocumentAction,
  deleteDocumentAction
} from "@/actions/db/documents-actions"
import { getDocumentByIdAction } from "@/actions/db/documents-actions"
import { NextResponse } from "next/server"
import { sanitizeHtml } from "@/lib/sanitize-html"

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
    let { title, content, updatedAt: clientUpdatedAt, maxMode } = body

    // Sanitise incoming HTML to enforce allow-list on the server as well.
    if (typeof content === "string") {
      // eslint-disable-next-line no-console
      console.log(
        "[API/documents] Sanitising incoming HTML of length",
        content.length
      )
      content = sanitizeHtml(content)
    }

    const { documentId } = await params

    // ------------------------------------------
    // Optimistic-concurrency guard – reject when
    // the client's copy is stale.
    // ------------------------------------------
    const current = await getDocumentByIdAction(userId, documentId)

    if (!current.isSuccess || !current.data) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      )
    }

    const serverUpdatedAt = new Date(current.data.updatedAt).toISOString()

    if (clientUpdatedAt && clientUpdatedAt !== serverUpdatedAt) {
      return NextResponse.json(
        {
          message:
            "Document modified by another tab or autosave. Returning latest timestamp.",
          updatedAt: serverUpdatedAt
        },
        { status: 409 }
      )
    }

    const res = await updateDocumentAction(userId, documentId, {
      title,
      content,
      ...(typeof maxMode === "boolean" ? { maxMode } : {})
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params

    const res = await deleteDocumentAction(userId, documentId)

    if (!res.isSuccess) {
      return NextResponse.json({ message: res.message }, { status: 400 })
    }

    return NextResponse.json({ message: res.message }, { status: 200 })
  } catch (error) {
    console.error("Failed to delete document via API:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
