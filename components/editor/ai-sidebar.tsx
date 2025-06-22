import { memo, useMemo, useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import WritingSuggestionSidebar from "./suggestion-sidebar"
import type { Suggestion } from "@/lib/hooks/use-spell-grammar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import type { CitationEntry } from "@/actions/ai/citation-hunter-action"
import type { Editor as TipTapEditor } from "@tiptap/core"

interface Stats {
  words: number
  sentences: number
  avgWordLength: number
  readingTimeMinutes: number
}

interface DefinitionEntry {
  term: string
  definition: string
}

interface SlideDeckHistoryEntry {
  id: string
  outline: { text: string }[]
  createdAt: string
}

interface AiSidebarProps {
  /** Which tab is currently active. */
  activeTab: string
  onTabChange: (tab: string) => void

  /* ---------------- Suggestions --------------- */
  suggestions: Suggestion[]
  plainText: string
  readability: number | null
  stats: Stats | null
  onApplySuggestion: (sg: Suggestion, replacement: string) => void
  onAddToDictionary?: (word: string) => void

  /* ---------------- Definitions --------------- */
  definitions?: DefinitionEntry[]

  /* ---------------- Citations ----------------- */
  citations?: CitationEntry[]

  /* ---------------- Tone ---------------------- */
  toneSuggestions?: { original: string; revised: string }[]
  onAcceptToneSuggestion?: (orig: string, revised: string) => void

  /* ---------------- Slides -------------------- */
  slidesMarkdown?: string

  onInsertCitation: (citation: CitationEntry) => void
  findingCitations: boolean
  slideDeck: { text: string }[]
  slideDeckHistory: SlideDeckHistoryEntry[]
  onCreateSlideDeck: () => void
  creatingSlideDeck: boolean
}

function AiSidebar({
  activeTab,
  onTabChange,
  suggestions,
  plainText,
  readability,
  stats,
  onApplySuggestion,
  onAddToDictionary,
  definitions = [],
  citations = [],
  toneSuggestions = [],
  slidesMarkdown,
  onAcceptToneSuggestion,
  onInsertCitation,
  findingCitations,
  slideDeck,
  slideDeckHistory,
  onCreateSlideDeck,
  creatingSlideDeck
}: AiSidebarProps) {
  const [slideDecks, setSlideDecks] = useState<SlideDeckHistoryEntry[]>([])
  const [selectedDeck, setSelectedDeck] =
    useState<SlideDeckHistoryEntry | null>(null)

  useEffect(() => {
    // This is a placeholder. In a real app, you'd fetch this from the document.
    if (activeTab === "slides") {
      setSlideDecks(slideDeckHistory)
    }
  }, [activeTab, slideDeckHistory])

  const hasDefinitions = definitions.length > 0
  const hasCitations = citations.length > 0
  const hasTone = toneSuggestions.length > 0
  const hasSlides = Boolean(slidesMarkdown)

  const definitionContent = useMemo(() => {
    if (!hasDefinitions) {
      return <p className="text-muted-foreground text-sm">No definitions yet</p>
    }
    return (
      <ul className="space-y-2 text-sm">
        {definitions.map(def => (
          <li key={def.term}>
            <strong>{def.term}</strong>
            <p>{def.definition}</p>
          </li>
        ))}
      </ul>
    )
  }, [definitions, hasDefinitions])

  const citationContent = useMemo(() => {
    if (!hasCitations) {
      return <p className="text-muted-foreground text-sm">No citations yet</p>
    }
    return (
      <div className="p-4">
        <h3 className="mb-2 font-semibold">Suggested Citations</h3>
        {findingCitations ? (
          <p className="text-muted-foreground text-sm">Searching...</p>
        ) : citations.length > 0 ? (
          <ul className="space-y-4">
            {citations.map((c, i) => (
              <li key={i} className="text-sm">
                <p className="font-bold">{c.title}</p>
                <p className="text-muted-foreground">{c.authors}</p>
                <p className="text-muted-foreground text-xs italic">
                  {c.journal}
                </p>
                <p className="text-muted-foreground text-xs">
                  SJR (2024): {c.sjr.toFixed(3)}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onInsertCitation(c)}
                  >
                    Insert
                  </Button>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost">
                        Source
                      </Button>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            No citations found. Try running the citation hunter from the editor
            toolbar.
          </p>
        )}
      </div>
    )
  }, [citations, findingCitations, onInsertCitation])

  const toneContent = useMemo(() => {
    if (!hasTone) {
      return (
        <p className="text-muted-foreground text-sm">No tone suggestions yet</p>
      )
    }
    return (
      <ul className="space-y-2 text-sm">
        {toneSuggestions.map((t, i) => (
          <li key={i} className="rounded border p-2">
            <p className="text-muted-foreground mb-1 text-xs">Original:</p>
            <p className="mb-1">{t.original}</p>
            <p className="text-muted-foreground mb-1 text-xs">Revised:</p>
            <p className="font-semibold">{t.revised}</p>
          </li>
        ))}
      </ul>
    )
  }, [toneSuggestions, hasTone])

  const slidesContent = useMemo(() => {
    if (!hasSlides) {
      return (
        <p className="text-muted-foreground text-sm">No slides generated yet</p>
      )
    }
    return (
      <pre className="prose max-h-[50vh] overflow-auto whitespace-pre-wrap p-2 text-sm">
        {slidesMarkdown}
      </pre>
    )
  }, [slidesMarkdown, hasSlides])

  const slideContent = useMemo(() => {
    const points = selectedDeck ? selectedDeck.outline : slideDeck
    return (
      <div className="p-4">
        <h3 className="mb-2 font-semibold">Slide Deck</h3>
        <div className="mb-4">
          <Button onClick={onCreateSlideDeck}>
            {creatingSlideDeck ? "Generating..." : "Generate"}
          </Button>
        </div>
        {slideDecks.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="mb-2 text-sm font-semibold">History</h4>
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {slideDecks.map(deck => (
                  <button
                    key={deck.id}
                    onClick={() => setSelectedDeck(deck)}
                    className={cn(
                      "w-full rounded-md border p-2 text-left text-xs",
                      selectedDeck?.id === deck.id && "bg-muted"
                    )}
                  >
                    <p>
                      {new Date(deck.createdAt).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short"
                      })}
                    </p>
                    <p className="text-muted-foreground truncate">
                      {deck.outline.length} points
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        {points.length > 0 && (
          <>
            <p className="text-muted-foreground mb-2 text-xs">
              Length: {points.length} minutes
            </p>
            <ScrollArea className="mt-2 h-72">
              <ul className="space-y-2 text-sm">
                {points.map((p, i) => (
                  <li key={i} className="leading-tight">
                    {p.text}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </>
        )}
      </div>
    )
  }, [
    selectedDeck,
    slideDeck,
    onCreateSlideDeck,
    creatingSlideDeck,
    slideDecks
  ])

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-72">
      <TabsList className="sticky top-0 z-10 mb-2">
        <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        <TabsTrigger value="definitions">Definitions</TabsTrigger>
        <TabsTrigger value="citations">Citations</TabsTrigger>
        <TabsTrigger value="tone">Tone</TabsTrigger>
        <TabsTrigger value="slides">Slides</TabsTrigger>
      </TabsList>

      {/* Suggestions */}
      <TabsContent value="suggestions">
        <WritingSuggestionSidebar
          suggestions={suggestions}
          plainText={plainText}
          onApplySuggestion={onApplySuggestion}
          onAddToDictionary={onAddToDictionary}
          toneSuggestions={toneSuggestions}
          onAcceptToneSuggestion={onAcceptToneSuggestion}
        />
      </TabsContent>

      {/* Definitions */}
      <TabsContent value="definitions">{definitionContent}</TabsContent>

      {/* Citations */}
      <TabsContent value="citations">{citationContent}</TabsContent>

      {/* Tone */}
      <TabsContent value="tone">{toneContent}</TabsContent>

      {/* Slides */}
      <TabsContent value="slides">{slideContent}</TabsContent>
    </Tabs>
  )
}

export default memo(AiSidebar)
