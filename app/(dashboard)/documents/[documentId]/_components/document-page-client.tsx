"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { DocNav } from "@/components/doc-nav"
import { InsightsPanel } from "@/components/insights/panel"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@/components/ui/resizable"
import EditorOrchestratorLazy from "./editor-orchestrator-lazy"
import type { SelectDocument } from "@/db/schema/documents-schema"
import type { Suggestion } from "@/lib/hooks/use-spell-grammar"
import type { ResearchReport } from "@/actions/ai/research-assistant-action"

interface DocumentPageClientProps {
  initialDocument: SelectDocument
}

export default function DocumentPageClient({
  initialDocument
}: DocumentPageClientProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [report, setReport] = useState<ResearchReport | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  return (
    <AppShell>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel
          defaultSize={15}
          minSize={5}
          maxSize={25}
          className="min-w-[64px]"
        >
          <DocNav />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={55} minSize={30}>
          <div className="flex h-full items-center justify-center p-6">
            <main className="flex-1 overflow-y-auto">
              <EditorOrchestratorLazy
                initialDocument={initialDocument}
                setSuggestions={setSuggestions}
                setReport={setReport}
                setIsAnalyzing={setIsAnalyzing}
              />
            </main>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <InsightsPanel
            suggestions={suggestions}
            report={report}
            isAnalyzing={isAnalyzing}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </AppShell>
  )
} 