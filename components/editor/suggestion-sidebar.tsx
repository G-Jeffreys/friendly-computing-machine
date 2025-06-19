"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import type { Suggestion } from "@/lib/hooks/use-spell-grammar"

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
  onAddToDictionary
}: SuggestionSidebarProps) {
  console.log(
    "[SuggestionSidebar] render – total suggestions:",
    suggestions.length
  )

  return (
    <aside
      className="max-h-[60vh] w-60 space-y-3 overflow-auto rounded border p-3"
      aria-label="Suggestions"
    >
      <h2 className="mb-2 font-semibold">Suggestions</h2>

      {suggestions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No issues found</p>
      ) : (
        suggestions.map(sg => (
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
                {plainText.substring(sg.offset, sg.offset + sg.length)}
              </span>
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
        ))
      )}

      <div className="text-muted-foreground mt-4 space-y-1 text-xs">
        <div>
          Readability score:{" "}
          {readability !== null ? readability.toFixed(1) : "-"}
        </div>
        {stats && (
          <>
            <div>Words: {stats.words}</div>
            <div>Sentences: {stats.sentences}</div>
            <div>Avg. word length: {stats.avgWordLength.toFixed(2)}</div>
            <div>
              Estimated reading time: {stats.readingTimeMinutes.toFixed(1)} min
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

export default memo(SuggestionSidebar)
