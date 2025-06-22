"use server"

import { callLLM } from "@/lib/ai/llm-server"
import { ActionState } from "@/types"

export interface DefinitionEntry {
  term: string
  definition: string
  etymology: string
  example: string
}

/**
 * definitionExpanderAction – returns a plain-language definition for the given term.
 */
export async function definitionExpanderAction(
  term: string,
  context: string
): Promise<ActionState<DefinitionEntry>> {
  try {
    const prompt = `For the academic term "${term}", provide a concise definition suitable for a university student. Additionally, include its etymology and one example sentence showing its correct usage in an academic context. Here is the full text for context: ${context}. Format the output as a JSON object with three keys: "definition", "etymology", and "example".`

    const raw = await callLLM<string>({
      prompt,
      model: undefined // let llm-server decide
    })

    // Helper to find and parse JSON from a potentially messy string
    const extractJson = (str: string) => {
      const match = str.match(/\{[\s\S]*\}/)
      if (!match) return null
      try {
        return JSON.parse(match[0])
      } catch (e) {
        return null
      }
    }

    const parsed = extractJson(raw)

    if (!parsed) {
      return { isSuccess: false, message: "Failed to parse AI response." }
    }

    return {
      isSuccess: true,
      message: "Definition generated",
      data: {
        term,
        definition: parsed.definition,
        etymology: parsed.etymology,
        example: parsed.example
      }
    }
  } catch (error) {
    console.error("[definitionExpanderAction]", error)
    return { isSuccess: false, message: "LLM error" }
  }
} 