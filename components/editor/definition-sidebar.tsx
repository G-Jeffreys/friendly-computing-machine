"use client"

import { memo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from "@/components/ui/accordion"
import { Info } from "lucide-react"
import type { CitationEntry } from "@/actions/ai/citation-hunter-action"

interface DefinitionEntry {
  term: string
  definition: string
  etymology: string
  example: string
}

interface Stats {
  words: number
  sentences: number
  avgWordLength: number
  readingTimeMinutes: number
}

interface ResearchSidebarProps {
  /** Definition Expander Props */
  definition: DefinitionEntry | null
  isDefining: boolean
  definedTerm: string

  /** Citation Hunter Props */
  citations?: CitationEntry[]
  findingCitations?: boolean
  citationKeywords?: string[]
  onGenerateCitations?: () => void
  generatingCitations?: boolean
  onInsertCitation?: (citation: CitationEntry) => void

  /** Slide Deck Props */
  slideDeck?: { text: string }[]
  slideDeckHistory?: {
    id: string
    createdAt: string
    outline: { text: string }[]
  }[]
  onCreateSlideDeck?: () => void
  creatingSlideDeck?: boolean

  /** Readability Analysis Props */
  readability?: number | null
  stats?: Stats | null
}

/**
 * ResearchSidebar – displays contextual research tools including definitions,
 * citations, slide generation, and readability analysis on the left side of the editor.
 */
const ResearchSidebar = memo(function ResearchSidebar({
  definition,
  isDefining,
  definedTerm,
  citations = [],
  findingCitations = false,
  citationKeywords = [],
  onGenerateCitations,
  generatingCitations = false,
  onInsertCitation,
  slideDeck = [],
  slideDeckHistory = [],
  onCreateSlideDeck,
  creatingSlideDeck = false,
  readability = null,
  stats = null
}: ResearchSidebarProps) {
  console.log(
    "[ResearchSidebar] render - definitions:",
    !!definition,
    "citations:",
    citations.length,
    "slides:",
    slideDeck.length
  )

  const citationSection =
    findingCitations || generatingCitations ? (
      <p className="text-muted-foreground text-sm">Searching…</p>
    ) : citations.length === 0 ? (
      <div>
        <p className="text-muted-foreground mb-2 text-sm">No citations found</p>
        {onGenerateCitations && (
          <Button
            size="sm"
            onClick={onGenerateCitations}
            disabled={generatingCitations || findingCitations}
          >
            {generatingCitations || findingCitations
              ? "Generating…"
              : "Generate Citations"}
          </Button>
        )}
      </div>
    ) : (
      <>
        {citationKeywords.length > 0 && (
          <p className="text-muted-foreground mb-2 text-xs">
            Keywords: {citationKeywords.join(", ")}
          </p>
        )}
        <ScrollArea className="h-64">
          <ul className="space-y-4 text-sm">
            {citations.map((c, i) => (
              <li key={i} className="border-b pb-2">
                <p className="font-bold">{c.title}</p>
                <p className="text-muted-foreground">{c.authors}</p>
                <p className="text-muted-foreground text-xs italic">
                  {c.journal}
                </p>
                <p className="text-muted-foreground text-xs">
                  SJR (2024): {c.sjr.toFixed(3)}
                </p>
                <div className="mt-2 flex gap-2">
                  {onInsertCitation && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onInsertCitation(c)}
                    >
                      Insert
                    </Button>
                  )}
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline"
                    >
                      Source
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </>
    )

  return (
    <aside className="bg-background max-h-screen w-72 overflow-auto border-r p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Research Tools</h2>
        <p className="text-muted-foreground text-sm">
          AI-powered research and content assistance
        </p>
      </div>

      <Accordion
        type="multiple"
        className="space-y-2"
        defaultValue={["definitions", "readability"]}
      >
        {/* Definition Expander */}
        <AccordionItem value="definitions">
          <AccordionTrigger className="text-sm font-medium">
            Definition Expander
          </AccordionTrigger>
          <AccordionContent>
            {/* Placeholder/Instructions */}
            {!definition && !isDefining && !definedTerm && (
              <div className="text-muted-foreground flex flex-col items-center justify-center space-y-4 p-4 text-center">
                <Info className="size-6" />
                <div>
                  <p className="text-sm">
                    Select any academic term or phrase in your text to see its
                    definition, etymology, and example usage.
                  </p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isDefining && (
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-5/6" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}

            {/* Definition Content */}
            {definition && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">{definition.term}</h4>
                  <p className="text-muted-foreground text-sm">
                    {definition.definition}
                  </p>
                </div>

                <div>
                  <h5 className="text-sm font-medium">Etymology</h5>
                  <p className="text-muted-foreground text-sm">
                    {definition.etymology}
                  </p>
                </div>

                <div>
                  <h5 className="text-sm font-medium">Example Usage</h5>
                  <p className="text-muted-foreground text-sm italic">
                    {definition.example}
                  </p>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Citation Hunter */}
        <AccordionItem value="citations">
          <AccordionTrigger className="text-sm font-medium">
            Citation Hunter {citations.length > 0 && `(${citations.length})`}
          </AccordionTrigger>
          <AccordionContent>{citationSection}</AccordionContent>
        </AccordionItem>

        {/* Slide Deck */}
        <AccordionItem value="slides">
          <AccordionTrigger className="text-sm font-medium">
            Slide Deck Generator
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="space-y-2">
                {onCreateSlideDeck && (
                  <Button
                    size="sm"
                    onClick={onCreateSlideDeck}
                    disabled={creatingSlideDeck}
                    className="w-full"
                  >
                    {creatingSlideDeck ? "Generating…" : "Generate Slide Deck"}
                  </Button>
                )}
                {slideDeck.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Find the most recent slide deck ID from history
                      const latestDeck = slideDeckHistory?.[0]
                      if (latestDeck) {
                        window.open(`/slides/${latestDeck.id}`, "_blank")
                      }
                    }}
                  >
                    View Slides
                  </Button>
                )}
              </div>

              {slideDeck.length > 0 ? (
                <>
                  <p className="text-muted-foreground text-xs">
                    Length: {slideDeck.length} slides
                  </p>
                  <ScrollArea className="h-32">
                    <ul className="list-disc space-y-1 pl-4 text-sm">
                      {slideDeck.map((s, i) => (
                        <li key={i}>{s.text}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No slide deck generated yet
                </p>
              )}

              {/* Slide Deck History */}
              {slideDeckHistory && slideDeckHistory.length > 0 && (
                <div className="border-t pt-4">
                  <h5 className="mb-2 text-sm font-semibold">History</h5>
                  <ScrollArea className="h-24">
                    <div className="space-y-2">
                      {slideDeckHistory.map(deck => (
                        <button
                          key={deck.id}
                          onClick={() =>
                            window.open(`/slides/${deck.id}`, "_blank")
                          }
                          className="hover:bg-muted w-full rounded-md border p-2 text-left text-xs"
                        >
                          <p className="text-xs">
                            {new Date(deck.createdAt).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short"
                            })}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {deck.outline.length} slides
                          </p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Readability Analysis */}
        <AccordionItem value="readability">
          <AccordionTrigger className="text-sm font-medium">
            Readability Analysis
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">
                  Readability Score:{" "}
                  {readability !== null ? readability.toFixed(1) : "—"}
                </p>
                {readability !== null && (
                  <p className="text-muted-foreground text-xs">
                    {readability > 60
                      ? "Easy to read"
                      : readability > 30
                        ? "Moderate"
                        : "Complex"}
                  </p>
                )}
              </div>

              {stats && (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Words:</span>
                    <span className="font-medium">
                      {stats.words.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sentences:</span>
                    <span className="font-medium">
                      {stats.sentences.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Avg. word length:
                    </span>
                    <span className="font-medium">
                      {stats.avgWordLength.toFixed(1)} chars
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reading time:</span>
                    <span className="font-medium">
                      {stats.readingTimeMinutes.toFixed(1)} min
                    </span>
                  </div>
                </div>
              )}

              {!stats && (
                <p className="text-muted-foreground text-sm">
                  Start writing to see document statistics
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  )
})

// Update export name to match new functionality
export default ResearchSidebar
