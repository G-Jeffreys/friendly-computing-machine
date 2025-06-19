"use server"

// New Slide Decker action – converts a paper into timed slide deck bullet points.
// NOTE: Extensive console logs are included per repository guidelines.

import { callLLM } from "@/lib/ai/llm-server"
import { ActionState } from "@/types"

export interface SlidePoint {
  /** The bullet text for a single minute of the talk */
  text: string
}

/**
 * slideDeckerAction – given full document text and desired talk length, returns
 * an array of bullet-point strings (one per minute).
 */
export async function slideDeckerAction(
  text: string,
  minutes: number
): Promise<ActionState<SlidePoint[]>> {
  console.log(
    "[slideDeckerAction] invoked – chars",
    text.length,
    "minutes",
    minutes
  )

  try {
    // Guardrail – cap minutes to prevent runaway token usage.
    const safeMinutes = Math.min(Math.max(minutes, 1), 120)

    const prompt = `Create a slide presentation outline for the following paper, assuming a talk length of ${safeMinutes} minutes. Output 1 bullet point per minute. Each bullet should summarise one key point or idea in a clear academic voice.`

    console.debug("[slideDeckerAction] prompt", prompt.slice(0, 120), "…")

    const raw = await callLLM<string>({
      prompt: `${prompt}\n\n"""${text}\n"""`
      // Let llm-server pick the model tier (gpt-4o with 3.5 fallback)
    })

    console.debug("[slideDeckerAction] raw output", raw.slice(0, 200), "…")

    // Parse bullets – strip leading symbols/indices.
    const points: SlidePoint[] = raw
      .split(/\n+/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.replace(/^[-•\d+.\s]+/, "").trim())
      .filter(Boolean)
      .map(text => ({ text }))
      .slice(0, safeMinutes) // Ensure length matches minutes requested.

    console.log("[slideDeckerAction] parsed points", points.length)

    return { isSuccess: true, message: "Slide deck generated", data: points }
  } catch (error) {
    console.error("[slideDeckerAction] LLM error", error)
    return { isSuccess: false, message: "LLM error" }
  }
}
