import { relations } from "drizzle-orm/relations"
import { documents, slideDecks } from "./schema"

export const slideDecksRelations = relations(slideDecks, ({ one }) => ({
  document: one(documents, {
    fields: [slideDecks.documentId],
    references: [documents.id]
  })
}))

export const documentsRelations = relations(documents, ({ many }) => ({
  slideDecks: many(slideDecks)
}))
