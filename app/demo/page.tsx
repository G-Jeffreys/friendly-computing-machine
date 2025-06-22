"use server"

import DocumentEditorLazy from "@/app/(dashboard)/documents/[documentId]/_components/document-editor-lazy"
import type { SelectDocument } from "@/db/schema/documents-schema"

export default async function DemoPage() {
  // Minimal stub document – never persisted. All edits are in-memory.
  const initialDocument: SelectDocument = {
    id: "00000000-0000-0000-0000-000000000000",
    userId: "demo",
    title: "Demo Document",
    content: "",
    maxMode: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return (
    <div className="flex h-full">
      {/* Pass demoMode so editor enforces word/time limits */}
      <DocumentEditorLazy initialDocument={initialDocument} demoMode />
    </div>
  )
}
