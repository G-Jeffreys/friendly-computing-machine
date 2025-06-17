import { useCallback } from "react"

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
      const res = await fetch("https://api.languagetool.org/v2/check", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          text,
          language: "en-US"
        })
      })

      const data = await res.json()

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
