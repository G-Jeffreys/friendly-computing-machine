import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  foreignKey,
  integer,
  unique,
  pgEnum
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const membership = pgEnum("membership", ["free", "pro"])

export const documents = pgTable("documents", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: text("user_id").notNull(),
  title: text().default("Untitled").notNull(),
  content: text().default("").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  maxMode: boolean("max_mode").default(false).notNull()
})

export const slideDecks = pgTable(
  "slide_decks",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    documentId: uuid("document_id").notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    title: text().default("Untitled Deck").notNull(),
    content: text().notNull(),
    minutes: integer().default(30).notNull()
  },
  table => [
    foreignKey({
      columns: [table.documentId],
      foreignColumns: [documents.id],
      name: "slide_decks_document_id_documents_id_fk"
    }).onDelete("cascade")
  ]
)

export const userDictionary = pgTable(
  "user_dictionary",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    word: text().notNull(),
    languageCode: text("language_code").default("en").notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull()
  },
  table => [
    unique("user_dictionary_user_id_language_code_word_unique").on(
      table.userId,
      table.word,
      table.languageCode
    )
  ]
)

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey().notNull(),
  membership: membership().default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull()
})
