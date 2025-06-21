"use server"

import { callLLM } from "@/lib/ai/llm-server"
import { ActionState } from "@/types"
import path from "path"
import fs from "fs/promises"

export interface ToneSuggestion {
  original: string
  revised: string
}

// I am adding a module-level cache to avoid hitting the filesystem on every
// invocation. The guidelines are unlikely to change at runtime and reading
// once keeps the action fast and cheap.
let cachedGuidelines: string | null = null

/**
 * Reads the docs/academic_style_guidelines.md file exactly once and returns
 * its contents. If the file cannot be found we log the error and fall back to
 * an empty string so that the LLM still receives a valid prompt.
 */
async function getAcademicGuidelines(): Promise<string> {
  if (cachedGuidelines !== null) {
    console.log("[toneHarmonizerAction] Using cached academic guidelines (", cachedGuidelines.length, "chars )")
    return cachedGuidelines
  }
  try {
    const abs = path.join(process.cwd(), "docs", "academic_style_guidelines.md")
    cachedGuidelines = await fs.readFile(abs, "utf8")
    console.log("[toneHarmonizerAction] Loaded academic guidelines from", abs)
  } catch (err) {
    console.error("[toneHarmonizerAction] Failed to load academic guidelines – proceeding without them", err)
    cachedGuidelines = "" // ensure we do not re-attempt on subsequent calls
  }
  return cachedGuidelines
}

/**
 * toneHarmonizerAction – sends full document text to the LLM and returns
 * sentence-level revisions in the requested format.
 */
export async function toneHarmonizerAction(
  text: string
): Promise<ActionState<ToneSuggestion[]>> {
  try {
    // Fetch guidelines (cached after first call)
    const guidelines = await getAcademicGuidelines()

    /*
      ------------------------------ Prompt Construction ------------------------------
      We concatenate three parts:
      1.   Role & task description – remains generic across invocations.
      2.   The full academic style guidelines markdown so the LLM has concrete
           rules to follow (if available).
      3.   The user-supplied paper wrapped in triple quotes.  
           The delimiter ensures the model can unambiguously separate
           instructions from content.
    */
    const prompt = [
      "You are an assistant that revises academic prose.",
      "Follow the style requirements provided below exactly. After reading the guidelines, analyse the paper and suggest tone improvements only.",
      guidelines,
      "Return suggestions as a newline-separated list in the form: original sentence → revised sentence.",
      "\n\nPaper:\n\"\"\"" + text + "\n\"\"\""
    ].join("\n\n")

    console.log("[toneHarmonizerAction] Prompt token estimate:", prompt.length)

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
