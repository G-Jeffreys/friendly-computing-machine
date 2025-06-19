"use server"

import { callLLM } from "@/lib/ai/llm-server"
import { ActionState } from "@/types"

export interface Suggestion {
  id: string
  offset: number
  length: number
  message: string
  replacements: string[]
  type: "spell" | "grammar" | "style"
}

/**
 * grammarCheckAction – uses an LLM (OpenAI) to perform deep grammar/spell/style
 * analysis when Max-Mode is ON. The model is instructed to return strict JSON
 * so we can parse into the existing `Suggestion` structure for highlighting.
 */
export async function grammarCheckAction(
  text: string
): Promise<ActionState<Suggestion[]>> {
  try {
    const systemInstr = `You are an academic writing assistant. Analyse the user\'s entire paper and find issues of spelling, grammar, or academic style. For **each** issue, produce a JSON object with these fields (and no extras): id (string UUID), offset (number, starting char index), length (number), message (string), replacements (string[]), type (either \"spell\", \"grammar\", or \"style\"). Return a JSON array ONLY.`

    const prompt = `${systemInstr}\n\nTEXT:\n"""${text}\n"""`

    const raw = await callLLM<string>({
      prompt,
      model: undefined, // llm-server chooses tier
      temperature: 0.1,
      maxTokens: 2048
    })

    let arr: Suggestion[] = []
    try {
      arr = JSON.parse(raw)
      // basic validation
      if (!Array.isArray(arr)) throw new Error("Not array")
    } catch (e) {
      console.warn("[grammarCheckAction] LLM output parse failed", e)
      return { isSuccess: false, message: "LLM output invalid" }
    }

    return { isSuccess: true, message: "LLM suggestions", data: arr }
  } catch (error) {
    console.error("[grammarCheckAction]", error)
    return { isSuccess: false, message: "LLM error" }
  }
}
