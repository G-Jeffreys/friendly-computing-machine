import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core"

export const documentsTable = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default("Untitled"),
  content: text("content").notNull().default(""),
  /**
   * When true, the document is in "Max Mode" which enables LLM-based
   * analysis instead of lightweight library checks. Defaults to `false` so
   * existing documents remain on the cheaper library-based path until users
   * explicitly opt-in from the UI.
   */
  maxMode: boolean("max_mode").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertDocument = typeof documentsTable.$inferInsert
export type SelectDocument = typeof documentsTable.$inferSelect
