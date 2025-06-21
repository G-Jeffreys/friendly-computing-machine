import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core"
import { documentsTable } from "./documents-schema"

/**
 * slide_decks – stores generated slide deck outlines per document so users can
 * revisit them without paying LLM cost again. Each row represents a single
 * generation request.
 */
export const slideDecksTable = pgTable("slide_decks", {
  /** Primary key */
  id: uuid("id").defaultRandom().primaryKey(),
  /** Foreign key to auth.users */
  userId: text("user_id").notNull(),
  /** FK to documents.id with cascade delete */
  documentId: uuid("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  /** Title of the slide deck (copied from document title at generation time) */
  title: text("title").notNull().default("Untitled Deck"),
  /** Markdown content of the slide deck */
  content: text("content").notNull(),
  /** Timestamp */
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertSlideDeck = typeof slideDecksTable.$inferInsert
export type SelectSlideDeck = typeof slideDecksTable.$inferSelect
