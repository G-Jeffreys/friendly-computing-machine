import { memo, useMemo } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import SuggestionSidebar from "./suggestion-sidebar"
import type { Suggestion } from "@/lib/hooks/use-spell-grammar"

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

interface CitationEntry {
  title: string
  authors: string
  journal: string
  url: string
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
  toneSuggestions?: string[]

  /* ---------------- Slides -------------------- */
  slidesMarkdown?: string
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
  slidesMarkdown
}: AiSidebarProps) {
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
      <ul className="space-y-2 text-sm">
        {citations.map(c => (
          <li key={c.url} className="leading-tight">
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {c.title}
            </a>
            <div className="text-muted-foreground text-xs">
              {c.authors} — {c.journal}
            </div>
          </li>
        ))}
      </ul>
    )
  }, [citations, hasCitations])

  const toneContent = useMemo(() => {
    if (!hasTone) {
      return (
        <p className="text-muted-foreground text-sm">No tone suggestions yet</p>
      )
    }
    return (
      <ul className="space-y-2 text-sm">
        {toneSuggestions.map((t, i) => (
          <li key={i}>{t}</li>
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
        <SuggestionSidebar
          suggestions={suggestions}
          plainText={plainText}
          readability={readability}
          stats={stats}
          onApplySuggestion={onApplySuggestion}
          onAddToDictionary={onAddToDictionary}
        />
      </TabsContent>

      {/* Definitions */}
      <TabsContent value="definitions">{definitionContent}</TabsContent>

      {/* Citations */}
      <TabsContent value="citations">{citationContent}</TabsContent>

      {/* Tone */}
      <TabsContent value="tone">{toneContent}</TabsContent>

      {/* Slides */}
      <TabsContent value="slides">{slidesContent}</TabsContent>
    </Tabs>
  )
}

export default memo(AiSidebar)
