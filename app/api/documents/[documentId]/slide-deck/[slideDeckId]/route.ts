import { db } from "@/db/db"
import { slideDecksTable } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string; slideDeckId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { documentId, slideDeckId } = await params

    // Delete the slide deck
    const [deleted] = await db
      .delete(slideDecksTable)
      .where(
        and(
          eq(slideDecksTable.id, slideDeckId),
          eq(slideDecksTable.documentId, documentId),
          eq(slideDecksTable.userId, userId)
        )
      )
      .returning()

    if (!deleted) {
      return new NextResponse("Not found", { status: 404 })
    }

    return NextResponse.json({ isSuccess: true })
  } catch (error) {
    console.error("[slide-deck-delete]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 