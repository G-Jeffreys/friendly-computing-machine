import { db } from "@/db/db"
import { slideDecksTable, InsertSlideDeck, SelectSlideDeck } from "@/db/schema/slide-decks-schema"
import { eq, and, desc } from "drizzle-orm"

export async function createSlideDeckAction(data: Omit<InsertSlideDeck, "id" | "createdAt">): Promise<SelectSlideDeck | null> {
  try {
    const [deck] = await db.insert(slideDecksTable).values(data).returning()
    return deck ?? null
  } catch (error) {
    console.error("[slide-deck-actions] create error", error)
    return null
  }
}

export async function getSlideDeckByIdAction(userId: string, id: string): Promise<SelectSlideDeck | null> {
  try {
    const deck = await db.query.slideDecks.findFirst({
      where: and(eq(slideDecksTable.userId, userId), eq(slideDecksTable.id, id))
    })
    return deck ?? null
  } catch (error) {
    console.error("[slide-deck-actions] get by id error", error)
    return null
  }
}

export async function getSlideDecksForDocumentAction(userId: string, documentId: string): Promise<SelectSlideDeck[]> {
  try {
    const decks = await db.query.slideDecks.findMany({
      where: and(eq(slideDecksTable.userId, userId), eq(slideDecksTable.documentId, documentId)),
      orderBy: desc(slideDecksTable.createdAt)
    })
    return decks
  } catch (error) {
    console.error("[slide-deck-actions] history error", error)
    return []
  }
} 