import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core"

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
  /** FK to documents.id – kept as uuid string for simplicity */
  documentId: uuid("document_id").notNull(),
  /** Outline JSON array of bullet points */
  outline: jsonb("outline").notNull(),
  /** Timestamp */
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertSlideDeck = typeof slideDecksTable.$inferInsert
export type SelectSlideDeck = typeof slideDecksTable.$inferSelect
