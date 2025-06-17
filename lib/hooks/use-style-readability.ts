import { useCallback } from "react"
import { Suggestion } from "@/lib/hooks/use-spell-grammar"

// Simple Flesch Reading Ease score
function fleschReadingEase(text: string) {
  // Rough syllable estimation: count vowels groups
  const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1
  const words = text.trim().split(/\s+/).length || 1
  const syllables = (text.match(/[aeiouy]+/gi) || []).length || 1
  const ASL = words / sentences // average sentence length
  const ASW = syllables / words // average syllables per word
  return 206.835 - 1.015 * ASL - 84.6 * ASW
}

export function useStyleReadability() {
  const analyze = useCallback(
    async (
      text: string
    ): Promise<{
      suggestions: Suggestion[]
      score: number
      words: number
      sentences: number
      avgWordLength: number
      readingTimeMinutes: number
    }> => {
      if (!text.trim())
        return {
          suggestions: [],
          score: 0,
          words: 0,
          sentences: 0,
          avgWordLength: 0,
          readingTimeMinutes: 0
        }

      const score = fleschReadingEase(text)

      // dynamically import write-good only when needed
      const writeGood = (await import("write-good")).default as any
      const wgResults: any[] = writeGood(text, {})

      const suggestions: Suggestion[] = wgResults.map(r => ({
        id: `wg-${r.index}`,
        offset: r.index,
        length: r.offset,
        message: r.reason,
        replacements: [],
        type: "style" as const
      }))

      const words = text.trim() ? text.trim().split(/\s+/).length : 0
      const sentences = text.split(/[.!?]+/).filter(Boolean).length || 0
      const totalLetters = (text.match(/[A-Za-z]/g) || []).length
      const avgWordLength = words ? totalLetters / words : 0
      const readingTimeMinutes = words / 200

      return {
        suggestions,
        score,
        words,
        sentences,
        avgWordLength,
        readingTimeMinutes
      }
    },
    []
  )

  return { analyze }
}
