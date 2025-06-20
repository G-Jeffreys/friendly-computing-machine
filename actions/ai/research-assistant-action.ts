"use server"

import {
  toneHarmonizerAction,
  ToneSuggestion
} from "./tone-harmonizer-action"
import {
  citationHunterAction,
  CitationEntry
} from "./citation-hunter-action"
import { slideDeckerAction, SlidePoint } from "./slide-decker-action"
import { ActionState } from "@/types"

export interface ResearchReport {
  toneSuggestions: ToneSuggestion[]
  citations: CitationEntry[]
  slideDeck: SlidePoint[]
}

/**
 * Runs a comprehensive analysis of the document by calling multiple
 * AI actions in parallel.
 */
export async function researchAssistantAction(
  text: string,
  slideDeckMinutes = 10
): Promise<ActionState<ResearchReport>> {
  try {
    const [toneRes, citationRes, slideRes] = await Promise.all([
      toneHarmonizerAction(text),
      citationHunterAction(text),
      slideDeckerAction(text, slideDeckMinutes)
    ])

    const report: ResearchReport = {
      toneSuggestions: toneRes.data || [],
      citations: citationRes.data || [],
      slideDeck: slideRes.data || []
    }

    // Check if at least one of the actions succeeded
    if (toneRes.isSuccess || citationRes.isSuccess || slideRes.isSuccess) {
      return {
        isSuccess: true,
        message: "Analysis complete",
        data: report
      }
    }

    return {
      isSuccess: false,
      message: "Analysis failed. Please try again."
    }
  } catch (error) {
    console.error("[researchAssistantAction]", error)
    return {
      isSuccess: false,
      message: "An unexpected error occurred during analysis."
    }
  }
} 