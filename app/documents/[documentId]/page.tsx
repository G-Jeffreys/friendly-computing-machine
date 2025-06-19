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

  // Performance logging – measure DB fetch duration without console.time label conflicts.
  const t0 = performance.now()
  const res = await getDocumentByIdAction(userId, documentId)
  const durationMs = Math.round(performance.now() - t0)
  console.log(`[DocumentPage] fetchDocument ${documentId} took ${durationMs}ms`)

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
