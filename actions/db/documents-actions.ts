"use server"

import { db } from "@/db/db"
import {
  documentsTable,
  InsertDocument,
  SelectDocument
} from "@/db/schema/documents-schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"

// Create
export async function createDocumentAction(
  data: InsertDocument
): Promise<ActionState<SelectDocument>> {
  try {
    const [doc] = await db.insert(documentsTable).values(data).returning()
    return {
      isSuccess: true,
      message: "Document created successfully",
      data: doc
    }
  } catch (error) {
    console.error("Error creating document:", error)
    return { isSuccess: false, message: "Failed to create document" }
  }
}

// Read multiple
export async function getDocumentsAction(
  userId: string
): Promise<ActionState<SelectDocument[]>> {
  try {
    const docs = await db.query.documents.findMany({
      where: eq(documentsTable.userId, userId)
    })
    return {
      isSuccess: true,
      message: "Documents retrieved successfully",
      data: docs
    }
  } catch (error) {
    console.error("Error getting documents:", error)
    return { isSuccess: false, message: "Failed to get documents" }
  }
}

// Read single
export async function getDocumentByIdAction(
  userId: string,
  id: string
): Promise<ActionState<SelectDocument>> {
  try {
    const doc = await db.query.documents.findFirst({
      where: and(eq(documentsTable.userId, userId), eq(documentsTable.id, id))
    })
    if (!doc) {
      return { isSuccess: false, message: "Document not found" }
    }
    return {
      isSuccess: true,
      message: "Document retrieved successfully",
      data: doc
    }
  } catch (error) {
    console.error("Error getting document:", error)
    return { isSuccess: false, message: "Failed to get document" }
  }
}

// Update
export async function updateDocumentAction(
  userId: string,
  id: string,
  data: Partial<InsertDocument>
): Promise<ActionState<SelectDocument>> {
  try {
    const [doc] = await db
      .update(documentsTable)
      .set(data)
      .where(and(eq(documentsTable.userId, userId), eq(documentsTable.id, id)))
      .returning()
    if (!doc) {
      return { isSuccess: false, message: "Document not found to update" }
    }
    return {
      isSuccess: true,
      message: "Document updated successfully",
      data: doc
    }
  } catch (error) {
    console.error("Error updating document:", error)
    return { isSuccess: false, message: "Failed to update document" }
  }
}

// Delete
export async function deleteDocumentAction(
  userId: string,
  id: string
): Promise<ActionState<void>> {
  try {
    await db
      .delete(documentsTable)
      .where(and(eq(documentsTable.userId, userId), eq(documentsTable.id, id)))
    return {
      isSuccess: true,
      message: "Document deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting document:", error)
    return { isSuccess: false, message: "Failed to delete document" }
  }
} 