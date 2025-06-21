import { auth } from "@clerk/nextjs/server"
import { db } from "@/db/db"
import { documentsTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const documents = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.userId, userId))
      .orderBy(documentsTable.updatedAt)

    return NextResponse.json(documents)
  } catch (error) {
    console.error("[documents-list]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 