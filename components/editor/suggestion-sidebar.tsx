"use client"

import { memo, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Suggestion } from "@/lib/hooks/use-spell-grammar"

interface WritingSuggestionSidebarProps {
  suggestions: Suggestion[]
  plainText: string
  onApplySuggestion: (sg: Suggestion, replacement: string) => void
  /** Optional handler for "Add to Dictionary" (only for spell suggestions) */
  onAddToDictionary?: (word: string) => void
  
  /* ---------------- Tone ---------------- */
  toneSuggestions?: { original: string; revised: string }[]
  onAcceptToneSuggestion?: (orig: string, revised: string) => void
  onGenerateTone?: () => void
  generatingTone?: boolean
}

/**
 * WritingSuggestionSidebar – lists spell / grammar / style / tone suggestions 
 * on the right side of the editor for writing improvement.
 */
function WritingSuggestionSidebar({
  suggestions,
  plainText,
  onApplySuggestion,
  onAddToDictionary,
  toneSuggestions = [],
  onAcceptToneSuggestion,
  onGenerateTone,
  generatingTone = false
}: WritingSuggestionSidebarProps) {
  console.log(
    "[WritingSuggestionSidebar] render – total suggestions:",
    suggestions.length
  )

  // Split suggestions by type for dedicated accordions
  const spell = useMemo(() => suggestions.filter(s => s.type === "spell"), [suggestions])
  const grammar = useMemo(() => suggestions.filter(s => s.type === "grammar"), [suggestions])
  const style = useMemo(() => suggestions.filter(s => s.type === "style"), [suggestions])

  const renderSuggestionList = (list: Suggestion[]) =>
    list.length === 0 ? (
      <p className="text-muted-foreground text-sm">No issues found</p>
    ) : (
      <ScrollArea className="h-48">
        <div className="space-y-2">
          {list.map(sg => (
            <div key={sg.id} className="rounded border p-2 text-sm">
              <p>
                <span
                  className={
                    sg.type === "spell"
                      ? "text-red-600"
                      : sg.type === "grammar"
                        ? "text-blue-600"
                        : "text-purple-600"
                  }
                >
                  {plainText.replace(/\n+/g, " ").substring(sg.offset, sg.offset + sg.length)}
                </span>{" "}
                : {sg.message}
              </p>
              {sg.replacements.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {sg.replacements.slice(0, 3).map(rep => (
                    <Button
                      key={rep}
                      size="sm"
                      variant="secondary"
                      onClick={() => onApplySuggestion(sg, rep)}
                    >
                      {rep}
                    </Button>
                  ))}
                </div>
              )}

              {sg.type === "spell" && onAddToDictionary && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 text-xs underline"
                  onClick={() =>
                    onAddToDictionary(
                      plainText.substring(sg.offset, sg.offset + sg.length)
                    )
                  }
                >
                  Add to Dictionary
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    )

  return (
    <aside className="w-72 max-h-screen overflow-auto border-l bg-background p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Writing Assistant</h2>
        <p className="text-sm text-muted-foreground">Grammar, style, and tone suggestions</p>
      </div>

      <Accordion type="multiple" className="space-y-2" defaultValue={["spell", "grammar"]}>
        {/* Spelling */}
        <AccordionItem value="spell">
          <AccordionTrigger className="text-sm font-medium">
            Spelling Suggestions ({spell.length})
          </AccordionTrigger>
          <AccordionContent>{renderSuggestionList(spell)}</AccordionContent>
        </AccordionItem>

        {/* Grammar */}
        <AccordionItem value="grammar">
          <AccordionTrigger className="text-sm font-medium">
            Grammar Suggestions ({grammar.length})
          </AccordionTrigger>
          <AccordionContent>{renderSuggestionList(grammar)}</AccordionContent>
        </AccordionItem>

        {/* Style */}
        <AccordionItem value="style">
          <AccordionTrigger className="text-sm font-medium">
            Style Suggestions ({style.length})
          </AccordionTrigger>
          <AccordionContent>{renderSuggestionList(style)}</AccordionContent>
        </AccordionItem>

        {/* Tone Harmonizer */}
        <AccordionItem value="tone">
          <AccordionTrigger className="text-sm font-medium">
            Tone Suggestions {toneSuggestions.length > 0 ? `(${toneSuggestions.length})` : ""}
          </AccordionTrigger>
          <AccordionContent>
            {toneSuggestions.length === 0 ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Enhance your writing tone and style with AI suggestions
                </p>
                {onGenerateTone && (
                  <Button size="sm" onClick={onGenerateTone} disabled={generatingTone}>
                    {generatingTone ? "Generating…" : "Generate Tone Suggestions"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {onGenerateTone && (
                  <Button size="sm" onClick={onGenerateTone} className="mb-2 w-full" disabled={generatingTone}>
                    {generatingTone ? "Generating…" : "Refresh Suggestions"}
                  </Button>
                )}
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {toneSuggestions.map((t, i) => (
                      <div key={i} className="rounded border p-2 text-sm">
                        <div className="space-y-2">
                          <div>
                            <p className="text-muted-foreground mb-1 text-xs font-medium">Original:</p>
                            <p className="text-sm">{t.original}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1 text-xs font-medium">Improved:</p>
                            <p className="text-sm font-medium text-blue-600">{t.revised}</p>
                          </div>
                          {onAcceptToneSuggestion && (
                            <Button 
                              size="sm" 
                              className="mt-2 w-full" 
                              onClick={() => onAcceptToneSuggestion(t.original, t.revised)}
                            >
                              Apply Change
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  )
}

export default memo(WritingSuggestionSidebar)
