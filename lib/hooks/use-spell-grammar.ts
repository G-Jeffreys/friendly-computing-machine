import { useCallback, useEffect, useRef } from "react"
import { callLLM } from "@/lib/ai/llm"
import { toast } from "sonner"

/** Endpoint constants – avoid hard-coding strings inline. */
const ENDPOINT_DICTIONARY = "/api/user-dictionary"

export interface Suggestion {
  id: string
  offset: number
  length: number
  message: string
  replacements: string[]
  type: "spell" | "grammar" | "style"
}

export function useSpellGrammarCheck(languageCode: string = "en") {
  /** In-memory set of user dictionary words to filter spell suggestions. */
  const dictionaryRef = useRef<Set<string>>(new Set())

  /** -------------------------------------------------------
   * Fetch dictionary on mount (client-side). We purposefully do
   * not await this inside other calls to keep the spell-check flow fast.
   * ------------------------------------------------------ */
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${ENDPOINT_DICTIONARY}?lang=${languageCode}`)
        const json = await res.json()
        if (Array.isArray(json.data)) {
          const set = new Set<string>()
          json.data.forEach((row: any) => set.add(row.word.toLowerCase()))
          dictionaryRef.current = set
        }
      } catch (error) {
        console.error("[useSpellGrammarCheck] Failed to load dictionary", error)
      }
    })()
  }, [languageCode])

  /** ---------------------------------------------
   * Core spell/grammar function using LanguageTool.
   * -------------------------------------------- */
  const checkText = useCallback(
    async (text: string): Promise<Suggestion[]> => {
      if (!text.trim()) return []

      try {
        const data = await callLLM<any>({
          provider: "languageTool",
          params: { text, language: `${languageCode}-US` },
          cacheKey: `lt-${languageCode}-${text}`
        })

        const suggestions: Suggestion[] = data.matches.map((match: any) => ({
          id: `${match.rule.id}-${match.offset}`,
          offset: match.offset,
          length: match.length,
          message: match.message,
          replacements: match.replacements.map((r: any) => r.value),
          type: match.rule.issueType === "misspelling" ? "spell" : "grammar"
        }))

        // Filter out spell suggestions already in the user's dictionary.
        const filtered = suggestions.filter(sg => {
          if (sg.type !== "spell") return true
          const word = text
            .substring(sg.offset, sg.offset + sg.length)
            .toLowerCase()
          return !dictionaryRef.current.has(word)
        })

        return filtered
      } catch (error) {
        console.error("Spell/grammar check failed", error)
        return []
      }
    },
    [languageCode]
  )

  /** ------------------------------------------------
   * Callback to add a new word to the dictionary then
   * locally mutate the in-memory Set so subsequent runs
   * skip over it without refetching.
   * ------------------------------------------------ */
  const addToDictionary = useCallback(
    async (word: string): Promise<boolean> => {
      try {
        const res = await fetch(ENDPOINT_DICTIONARY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word, languageCode })
        })
        if (res.ok) {
          dictionaryRef.current.add(word.toLowerCase())
          toast.success(`"${word}" added to dictionary`)
          return true
        }
        const err = await res.json()
        toast.error(err.message || "Failed to add word")
        return false
      } catch (error) {
        console.error("[useSpellGrammarCheck] addToDictionary error", error)
        toast.error("Server error while adding word")
        return false
      }
    },
    [languageCode]
  )

  return { checkText, addToDictionary }
}
