import { db } from "@/db/db"
import { slideDecksTable } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { and, eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
  request: NextRequest,
  context: { params: { documentId: string; slideDeckId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { documentId, slideDeckId } = context.params

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