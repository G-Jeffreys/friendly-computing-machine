"use client"

import { memo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Info } from "lucide-react"

interface DefinitionEntry {
  term: string
  definition: string
  etymology: string
  example: string
}

interface DefinitionSidebarProps {
  definition: DefinitionEntry | null
  isDefining: boolean
  definedTerm: string
}

/**
 * DefinitionSidebar – displays contextual definitions, etymology, and examples
 * for selected academic terms in the editor.
 */
const DefinitionSidebar = memo(function DefinitionSidebar({
  definition,
  isDefining,
  definedTerm
}: DefinitionSidebarProps) {
  return (
    <aside className="w-72 max-h-screen overflow-auto border-l bg-background p-4">
      {/* Placeholder/Instructions */}
      {!definition && !isDefining && !definedTerm && (
        <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center text-muted-foreground">
          <Info className="h-8 w-8" />
          <div>
            <h3 className="font-semibold">Definition Expander</h3>
            <p className="text-sm">
              Select any academic term or phrase in your text to see its definition,
              etymology, and example usage.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isDefining && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-5/6" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {/* Definition Content */}
      {definition && (
        <ScrollArea className="pr-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">{definition.term}</h3>
              <p className="text-sm text-muted-foreground">{definition.definition}</p>
            </div>

            <div>
              <h4 className="font-medium">Etymology</h4>
              <p className="text-sm text-muted-foreground">{definition.etymology}</p>
            </div>

            <div>
              <h4 className="font-medium">Example Usage</h4>
              <p className="text-sm italic text-muted-foreground">
                {definition.example}
              </p>
            </div>
          </div>
        </ScrollArea>
      )}
    </aside>
  )
})

export default DefinitionSidebar 