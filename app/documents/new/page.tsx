"use server"

import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { createDocumentAction } from "@/actions/db/documents-actions"

export default async function NewDocumentPage() {
  const { userId } = await auth()
  if (!userId) redirect("/")

  const res = await createDocumentAction({
    userId,
    title: "Untitled",
    content: ""
  })
  if (!res.isSuccess) {
    throw new Error(res.message)
  }

  redirect(`/documents/${res.data.id}`)
}
