"use server"

import { db } from "@/db/db"
import {
  userDictionaryTable,
  InsertUserDictionaryWord,
  SelectUserDictionaryWord
} from "@/db/schema/user-dictionary-schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"

/**
 * addWordToDictionaryAction – inserts a new word into the current user's
 * dictionary for the specified language.
 */
export async function addWordToDictionaryAction(
  data: InsertUserDictionaryWord
): Promise<ActionState<SelectUserDictionaryWord>> {
  try {
    // Normalise word to lowercase to ensure case-insensitive matches.
    const lower = data.word.toLowerCase()

    // Attempt insert, but skip if exists.
    // First quick check to avoid unnecessary error throw.
    const exists = await db.query.userDictionary.findFirst({
      where: and(
        eq(userDictionaryTable.userId, data.userId),
        eq(userDictionaryTable.languageCode, data.languageCode ?? "en"),
        eq(userDictionaryTable.word, lower)
      )
    })

    if (exists) {
      return {
        isSuccess: true,
        message: "Word already in dictionary",
        data: exists
      }
    }

    const [row] = await db
      .insert(userDictionaryTable)
      .values({ ...data, word: lower })
      .returning()

    return {
      isSuccess: true,
      message: "Word added to dictionary",
      data: row
    }
  } catch (error) {
    console.error("[addWordToDictionaryAction] Failed", error)
    return { isSuccess: false, message: "Failed to add word to dictionary" }
  }
}

/**
 * getUserDictionaryAction – fetch all words for given user & language.
 */
export async function getUserDictionaryAction(
  userId: string,
  languageCode: string = "en"
): Promise<ActionState<SelectUserDictionaryWord[]>> {
  try {
    const rows = await db.query.userDictionary.findMany({
      where: and(
        eq(userDictionaryTable.userId, userId),
        eq(userDictionaryTable.languageCode, languageCode)
      )
    })
    return {
      isSuccess: true,
      message: "Dictionary fetched",
      data: rows
    }
  } catch (error) {
    console.error("[getUserDictionaryAction] Failed", error)
    return { isSuccess: false, message: "Failed to fetch dictionary" }
  }
}

/**
 * deleteWordFromDictionaryAction – removes a word for given user & language.
 */
export async function deleteWordFromDictionaryAction(
  userId: string,
  word: string,
  languageCode: string = "en"
): Promise<ActionState<boolean>> {
  try {
    const lower = word.toLowerCase()
    await db
      .delete(userDictionaryTable)
      .where(
        and(
          eq(userDictionaryTable.userId, userId),
          eq(userDictionaryTable.languageCode, languageCode),
          eq(userDictionaryTable.word, lower)
        )
      )

    return { isSuccess: true, message: "Word removed", data: true }
  } catch (error) {
    console.error("[deleteWordFromDictionaryAction] Failed", error)
    return { isSuccess: false, message: "Failed to delete word" }
  }
}
