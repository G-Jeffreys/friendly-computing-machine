"use server"

import { getDocumentByIdAction } from "@/actions/db/documents-actions"
import DocumentEditor from "./_components/document-editor"
import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

export default async function DocumentPage({
  params
}: {
  params: Promise<{ documentId: string }>
}) {
  const { userId } = await auth()
  if (!userId) {
    notFound()
  }

  const { documentId } = await params

  const res = await getDocumentByIdAction(userId, documentId)
  if (!res.isSuccess) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <DocumentEditor initialDocument={res.data} />
    </div>
  )
}
