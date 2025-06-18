"use server"

import { getDocumentByIdAction } from "@/actions/db/documents-actions"
import DocumentEditorLazy from "./_components/document-editor-lazy"
import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import DocumentSkeleton from "./_components/document-skeleton"

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

  // Performance logging – measure the DB fetch time explicitly.
  const timerLabel = `[DocumentPage] fetchDocument ${documentId}`
  console.time(timerLabel)
  const res = await getDocumentByIdAction(userId, documentId)
  console.timeEnd(timerLabel)

  if (!res.isSuccess) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <Suspense fallback={<DocumentSkeleton />}>
        <DocumentEditorLazy initialDocument={res.data} />
      </Suspense>
    </div>
  )
}
