import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { definitionExpanderAction } from "@/actions/ai/definition-expander-action"

/**
 * POST /api/definitions
 * Body: { term: string, context: string }
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const term = typeof body.term === "string" ? body.term.trim() : ""
    const context = typeof body.context === "string" ? body.context.trim() : ""

    if (!term) {
      return NextResponse.json({ message: "Invalid term" }, { status: 400 })
    }

    const res = await definitionExpanderAction(term, context)

    return NextResponse.json(
      { message: res.message, data: res.data },
      { status: res.isSuccess ? 200 : 500 }
    )
  } catch (error) {
    console.error("[API/definitions]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
