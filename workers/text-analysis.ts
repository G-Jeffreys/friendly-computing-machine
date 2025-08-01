/*
  Web Worker: performs heavy text analysis off the main thread.
*/
import writeGood from "write-good"
import { callLLM } from "@/lib/ai/llm"

interface WorkerRequest {
  id: string
  text: string
  userDictionary?: string[] // Add user dictionary support
}

interface WorkerResponse {
  id: string
  result: AnalysisResult
}

export interface Suggestion {
  id: string
  offset: number
  length: number
  message: string
  replacements: string[]
  type: "spell" | "grammar" | "style"
}

export interface AnalysisResult {
  suggestions: Suggestion[]
  score: number
  words: number
  sentences: number
  avgWordLength: number
  readingTimeMinutes: number
}

function fleschReadingEase(text: string) {
  const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1
  const words = text.trim().split(/\s+/).length || 1
  const syllables = (text.match(/[aeiouy]+/gi) || []).length || 1
  const ASL = words / sentences
  const ASW = syllables / words
  return 206.835 - 1.015 * ASL - 84.6 * ASW
}

async function runLanguageTool(text: string, userDictionary: Set<string> = new Set()): Promise<Suggestion[]> {
  if (!text.trim()) return []

  try {
    // Create cache key that includes user dictionary words to ensure proper caching
    const dictionaryKey = Array.from(userDictionary).sort().join(',')
    const cacheKey = `lt-${text}-dict-${dictionaryKey}`
    
    // Delegate to the generic LLM helper which internally knows how to call LanguageTool.
    const data = await callLLM<any>({
      provider: "languageTool",
      params: { text, language: "en-US" },
      cacheKey
    })

    const suggestions: Suggestion[] = data.matches.map((m: any) => ({
      id: `${m.rule.id}-${m.offset}`,
      offset: m.offset,
      length: m.length,
      message: m.message,
      replacements: m.replacements.map((r: any) => r.value),
      type: m.rule.issueType === "misspelling" ? "spell" : "grammar"
    }))

    // Filter out spell suggestions for words in user dictionary
    const filtered = suggestions.filter(sg => {
      if (sg.type !== "spell") return true
      const word = text
        .substring(sg.offset, sg.offset + sg.length)
        .toLowerCase()
      return !userDictionary.has(word)
    })

    return filtered
  } catch (e) {
    console.error("LanguageTool via callLLM failed", e)
    return []
  }
}

function runWriteGood(text: string): Suggestion[] {
  // @ts-ignore - writeGood lacks proper TS typings
  const results: any[] = writeGood(text)
  return results.map(r => ({
    id: `wg-${r.index}`,
    offset: r.index,
    length: r.offset,
    message: r.reason,
    replacements: [],
    type: "style" as const
  }))
}

async function analyse(text: string, userDictionary: string[] = []): Promise<AnalysisResult> {
  // Convert array to Set for faster lookups
  const dictionarySet = new Set(userDictionary.map(word => word.toLowerCase()))
  
  const [lgSuggestions, styleSuggestions] = await Promise.all([
    runLanguageTool(text, dictionarySet),
    Promise.resolve(runWriteGood(text))
  ])

  const combined = [...lgSuggestions, ...styleSuggestions]
  const dedupMap = new Map(combined.map(s => [s.id, s]))
  const score = fleschReadingEase(text)
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const sentences = text.split(/[.!?]+/).filter(Boolean).length || 0
  const totalLetters = (text.match(/[A-Za-z]/g) || []).length
  const avgWordLength = words ? totalLetters / words : 0
  const readingTimeMinutes = words / 200 // 200 WPM typical average

  return {
    suggestions: Array.from(dedupMap.values()),
    score,
    words,
    sentences,
    avgWordLength,
    readingTimeMinutes
  }
}

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const { id, text, userDictionary = [] } = event.data
  const result = await analyse(text, userDictionary)
  const response: WorkerResponse = { id, result }
  // @ts-ignore
  self.postMessage(response)
})
