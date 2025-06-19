import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core"

/**
 * user_dictionary – per-user custom dictionary for ignored spelling words.
 * A simple lookup table referenced during spell-check to avoid flagging
 * user-added words as mistakes.
 */
export const userDictionaryTable = pgTable(
  "user_dictionary",
  {
    /** Primary key */
    id: uuid("id").defaultRandom().primaryKey(),
    /** Supabase `auth.users.id` FK (string UUID) */
    userId: text("user_id").notNull(),
    /** The word added to the dictionary (stored in lowercase) */
    word: text("word").notNull(),
    /** ISO-639-1 language code, e.g. "en" – allows per-language dictionaries. */
    languageCode: text("language_code").notNull().default("en"),
    /** Timestamp */
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  table => {
    return {
      uniqUserLangWord: unique().on(
        table.userId,
        table.languageCode,
        table.word
      )
    }
  }
)

export type InsertUserDictionaryWord = typeof userDictionaryTable.$inferInsert
export type SelectUserDictionaryWord = typeof userDictionaryTable.$inferSelect
