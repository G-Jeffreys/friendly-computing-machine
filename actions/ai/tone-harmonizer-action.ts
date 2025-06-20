"use server"

import { callLLM } from "@/lib/ai/llm-server"
import { ActionState } from "@/types"

export interface ToneSuggestion {
  original: string
  revised: string
}

/**
 * toneHarmonizerAction – sends full document text to the LLM and returns
 * sentence-level revisions in the requested format.
 */
export async function toneHarmonizerAction(
  text: string
): Promise<ActionState<ToneSuggestion[]>> {
  try {
    const prompt = `Standardize the tone of the following academic paper to be formal and scholarly. Suggest changes, do not make them automatically. Return a list of suggestions in this format: original sentence → revised sentence.\n\nPaper:\n"""${text}\n"""`

    const raw = await callLLM<string>({
      prompt,
      model: undefined // let llm.ts pick the tiered model
    })

    // Expect each suggestion on its own line with an arrow delimiter
    const suggestions: ToneSuggestion[] = raw
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [orig, revised] = line.split("→").map(s => s.trim())
        return { original: orig, revised: revised || "" }
      })
      .filter(t => t.original && t.revised)

    return { isSuccess: true, message: "Tone suggestions", data: suggestions }
  } catch (error) {
    console.error("[toneHarmonizerAction]", error)
    return { isSuccess: false, message: "LLM error" }
  }
}
