"use client"

import dynamic from "next/dynamic"
import type { SelectDocument } from "@/db/schema/documents-schema"
import type { Suggestion } from "@/lib/hooks/use-spell-grammar"
import type { ResearchReport } from "@/actions/ai/research-assistant-action"
import { Dispatch, SetStateAction } from "react"

// Dynamically import the heavy `EditorOrchestrator` component on the client only.
// This keeps the large bundle out of the server-rendered HTML while still
// letting the surrounding page remain a Server Component.
const EditorOrchestrator = dynamic(
  () => import("@/components/editor/editor-orchestrator"),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground flex h-64 items-center justify-center">
        Loading editor…
      </div>
    )
  }
)

interface EditorOrchestratorLazyProps {
  initialDocument: SelectDocument
  /** Set to true when used in the anonymous demo route */
  demoMode?: boolean
  setSuggestions: Dispatch<SetStateAction<Suggestion[]>>
  setReport: Dispatch<SetStateAction<ResearchReport | null>>
  setIsAnalyzing: Dispatch<SetStateAction<boolean>>
}

export default function EditorOrchestratorLazy({
  initialDocument,
  demoMode = false,
  setSuggestions,
  setReport,
  setIsAnalyzing
}: EditorOrchestratorLazyProps) {
  // NOTE: we can't simply re-export the dynamic import because we need to pass
  // props through, so we wrap it in a thin component.
  return (
    <EditorOrchestrator
      initialDocument={initialDocument}
      demoMode={demoMode}
      setSuggestions={setSuggestions}
      setReport={setReport}
      setIsAnalyzing={setIsAnalyzing}
    />
  )
}
