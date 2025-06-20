"use client"

import { memo, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Suggestion } from "@/lib/hooks/use-spell-grammar"
import type { CitationEntry } from "@/actions/ai/citation-hunter-action"

interface Stats {
  words: number
  sentences: number
  avgWordLength: number
  readingTimeMinutes: number
}

interface SuggestionSidebarProps {
  suggestions: Suggestion[]
  plainText: string
  readability: number | null
  stats: Stats | null
  onApplySuggestion: (sg: Suggestion, replacement: string) => void
  /** Optional handler for "Add to Dictionary" (only for spell suggestions) */
  onAddToDictionary?: (word: string) => void
  /* ---------------- Tone ---------------- */
  toneSuggestions?: { original: string; revised: string }[]
  onAcceptToneSuggestion?: (orig: string, revised: string) => void

  /* ---------------- Citations ----------- */
  citations?: CitationEntry[]
  findingCitations?: boolean

  /* ---------------- Slide Deck ---------- */
  slideDeck?: { text: string }[]
  onCreateSlideDeck?: (minutes: number) => void
  creatingSlideDeck?: boolean

  /* ---------------- Generate callbacks ---------------- */
  onGenerateTone?: () => void
  generatingTone?: boolean
  onGenerateCitations?: () => void
  generatingCitations?: boolean
}

/**
 * SuggestionSidebar – lists spell / grammar / style suggestions returned from
 * the language-analysis hook and lets the user apply quick-fix replacements.
 */
function SuggestionSidebar({
  suggestions,
  plainText,
  readability,
  stats,
  onApplySuggestion,
  onAddToDictionary,
  toneSuggestions = [],
  onAcceptToneSuggestion,
  citations = [],
  findingCitations = false,
  slideDeck = [],
  onCreateSlideDeck,
  creatingSlideDeck = false,
  onGenerateTone,
  generatingTone = false,
  onGenerateCitations,
  generatingCitations = false
}: SuggestionSidebarProps) {
  console.log(
    "[SuggestionSidebar] render – total suggestions:",
    suggestions.length
  )

  // Split suggestions by type for dedicated accordions
  const spell = useMemo(() => suggestions.filter(s => s.type === "spell"), [suggestions])
  const grammar = useMemo(() => suggestions.filter(s => s.type === "grammar"), [suggestions])
  const style = useMemo(() => suggestions.filter(s => s.type === "style"), [suggestions])

  /* ---------------- Slide deck form state ---------------- */
  const [minutes, setMinutes] = useState<number>(10)

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
      <Accordion type="multiple" className="space-y-2" defaultValue={["spell", "readability"]}>
        {/* Spelling */}
        <AccordionItem value="spell">
          <AccordionTrigger>Spelling Suggestions ({spell.length})</AccordionTrigger>
          <AccordionContent>{renderSuggestionList(spell)}</AccordionContent>
        </AccordionItem>

        {/* Grammar */}
        <AccordionItem value="grammar">
          <AccordionTrigger>Grammar Suggestions ({grammar.length})</AccordionTrigger>
          <AccordionContent>{renderSuggestionList(grammar)}</AccordionContent>
        </AccordionItem>

        {/* Style */}
        <AccordionItem value="style">
          <AccordionTrigger>Style Suggestions ({style.length})</AccordionTrigger>
          <AccordionContent>{renderSuggestionList(style)}</AccordionContent>
        </AccordionItem>

        {/* Tone – only when available */}
        <AccordionItem value="tone">
          <AccordionTrigger>Tone Suggestions {toneSuggestions.length > 0 ? `(${toneSuggestions.length})` : ""}</AccordionTrigger>
          <AccordionContent>
            {toneSuggestions.length === 0 ? (
              <Button size="sm" onClick={onGenerateTone} disabled={generatingTone}>
                {generatingTone ? "Generating…" : "Generate"}
              </Button>
            ) : (
              <>
                <Button size="sm" onClick={onGenerateTone} className="mb-2" disabled={generatingTone}>
                  Refresh
                </Button>
                {toneSuggestions.map((t, i) => (
                  <div key={i} className="mb-2 rounded border p-2 text-sm">
                    <p className="text-muted-foreground mb-1 text-xs">Original:</p>
                    <p className="mb-1">{t.original}</p>
                    <p className="text-muted-foreground mb-1 text-xs">Revised:</p>
                    <p className="font-semibold">{t.revised}</p>
                    {onAcceptToneSuggestion && (
                      <Button size="sm" className="mt-1" onClick={() => onAcceptToneSuggestion(t.original, t.revised)}>
                        Accept
                      </Button>
                    )}
                  </div>
                ))}
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Citations – only when available */}
        <AccordionItem value="citations">
          <AccordionTrigger>Citation Suggestions</AccordionTrigger>
          <AccordionContent>
            {generatingCitations || findingCitations ? (
              <p className="text-sm text-muted-foreground">Searching…</p>
            ) : citations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No citations found</p>
            ) : (
              <ul className="space-y-4 text-sm">
                {citations.map((c, i) => (
                  <li key={i} className="border-b pb-2">
                    <p className="font-bold">{c.title}</p>
                    <p className="text-muted-foreground">{c.authors}</p>
                    <p className="text-xs italic text-muted-foreground">{c.journal}</p>
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                        Source
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {citations.length === 0 && (
              <Button size="sm" onClick={onGenerateCitations} disabled={generatingCitations || findingCitations} className="mt-2">
                {generatingCitations || findingCitations ? "Generating…" : "Generate"}
              </Button>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Slide Deck */}
        <AccordionItem value="slides">
          <AccordionTrigger>Slide Deck</AccordionTrigger>
          <AccordionContent>
            <div className="mb-2 flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={120}
                value={minutes}
                onChange={e => setMinutes(parseInt(e.target.value, 10) || 10)}
                className="w-20"
              />
              <Button
                size="sm"
                onClick={() => onCreateSlideDeck?.(minutes)}
                disabled={creatingSlideDeck}
              >
                {creatingSlideDeck ? "Generating…" : "Generate"}
              </Button>
            </div>
            {slideDeck.length > 0 ? (
              <ScrollArea className="h-48">
                <ul className="list-disc pl-4 text-sm">
                  {slideDeck.map((s, i) => (
                    <li key={i}>{s.text}</li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-sm">No slide deck yet</p>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Readability */}
        <AccordionItem value="readability">
          <AccordionTrigger>Readability & Stats</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm">Readability score: {readability !== null ? readability.toFixed(1) : "-"}</p>
            {stats && (
              <ul className="mt-2 space-y-1 text-sm">
                <li>Words: {stats.words}</li>
                <li>Sentences: {stats.sentences}</li>
                <li>Average word length: {stats.avgWordLength.toFixed(2)}</li>
                <li>Reading time: {stats.readingTimeMinutes.toFixed(1)} min</li>
              </ul>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  )
}

export default memo(SuggestionSidebar)
