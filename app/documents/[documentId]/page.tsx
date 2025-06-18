"use server"

import { getDocumentByIdAction } from "@/actions/db/documents-actions"
import dynamic from "next/dynamic"
import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

// Dynamically import the heavy editor to cut initial JS bundle size.
// Setting `ssr: false` ensures the component is only rendered client-side.
const DocumentEditor = dynamic(() => import("./_components/document-editor"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground flex h-96 items-center justify-center">
      Loading editor...
    </div>
  )
})

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
