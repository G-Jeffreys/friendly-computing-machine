"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { Suggestion } from "@/lib/hooks/use-spell-grammar"
import type { ResearchReport } from "@/actions/ai/research-assistant-action"
import { Loader2 } from "lucide-react"

interface InsightsPanelProps {
  suggestions: Suggestion[]
  report: ResearchReport | null
  isAnalyzing: boolean
}

export function InsightsPanel({
  suggestions,
  report,
  isAnalyzing
}: InsightsPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 p-4">
        <h2 className="text-xl font-semibold">Insights</h2>
        <p className="text-muted-foreground text-sm">
          AI-powered suggestions and analysis.
        </p>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-4">
          <Accordion type="multiple" defaultValue={["suggestions", "analysis"]}>
            <AccordionItem value="suggestions">
              <AccordionTrigger>Suggestions</AccordionTrigger>
              <AccordionContent>
                {/* Content for suggestions */}
                <p>Suggestions will appear here.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="analysis">
              <AccordionTrigger>Analysis</AccordionTrigger>
              <AccordionContent>
                {isAnalyzing ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <p>Analysis results will appear here.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
      <div className="shrink-0 border-t p-4">
        <Button className="w-full">Run Analysis</Button>
      </div>
    </div>
  )
}
