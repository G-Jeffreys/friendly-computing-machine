import { useCallback } from "react"
import { callLLM } from "@/lib/ai/llm"

export interface Suggestion {
  id: string
  offset: number
  length: number
  message: string
  replacements: string[]
  type: "spell" | "grammar" | "style"
}

export function useSpellGrammarCheck() {
  const checkText = useCallback(async (text: string): Promise<Suggestion[]> => {
    if (!text.trim()) return []

    try {
      const data = await callLLM<any>({
        provider: "languageTool",
        params: { text, language: "en-US" },
        cacheKey: `lt-${text}`
      })

      const suggestions: Suggestion[] = data.matches.map((match: any) => ({
        id: `${match.rule.id}-${match.offset}`,
        offset: match.offset,
        length: match.length,
        message: match.message,
        replacements: match.replacements.map((r: any) => r.value),
        type: match.rule.issueType === "misspelling" ? "spell" : "grammar"
      }))

      return suggestions
    } catch (error) {
      console.error("Spell/grammar check failed", error)
      return []
    }
  }, [])

  return { checkText }
}
