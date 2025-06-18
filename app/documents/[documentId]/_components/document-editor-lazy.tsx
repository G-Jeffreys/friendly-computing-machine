"use client"

import dynamic from "next/dynamic"
import type { SelectDocument } from "@/db/schema/documents-schema"

// Dynamically import the heavy `DocumentEditor` component on the client only.
// This keeps the large bundle out of the server-rendered HTML while still
// letting the surrounding page remain a Server Component.
const DocumentEditor = dynamic(() => import("./document-editor"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground flex h-64 items-center justify-center">
      Loading editor…
    </div>
  )
})

interface DocumentEditorLazyProps {
  initialDocument: SelectDocument
}

export default function DocumentEditorLazy({
  initialDocument
}: DocumentEditorLazyProps) {
  // NOTE: we can't simply re-export the dynamic import because we need to pass
  // props through, so we wrap it in a thin component.
  return <DocumentEditor initialDocument={initialDocument} />
}
