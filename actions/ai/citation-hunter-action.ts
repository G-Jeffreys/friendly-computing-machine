"use server"

import { Redis } from "@upstash/redis"
import { callLLM } from "@/lib/ai/llm-server"
import { ActionState } from "@/types"

export interface CitationEntry {
  title: string
  authors: string
  journal: string
  url: string
}

interface KeywordResult {
  keywords: string[]
}

// Initialize Upstash Redis only if the required environment variables exist.
let redis: Redis | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = Redis.fromEnv()
  } catch (e) {
    // If Redis fails to initialize (e.g. malformed URL), continue without caching.
    console.warn("[citationHunterAction] Redis unavailable – caching disabled.", e)
  }
} else {
  console.warn(
    "[citationHunterAction] UPSTASH_REDIS_* env vars not found – caching disabled."
  )
}

/**
 * citationHunterAction – extracts keywords via LLM then queries OpenAlex API
 * to return real peer-reviewed works.
 */
export async function citationHunterAction(
  text: string
): Promise<ActionState<CitationEntry[]>> {
  try {
    // ----------------- Step 1: extract keywords via LLM -----------------
    const prompt =
      "Extract the top 5 academic keywords or topics relevant to this paper for citation purposes. Return them as a comma-separated list only."

    const rawKeywords = await callLLM<string>({
      prompt: `${prompt}\n\n"""${text}\n"""`
    })
    console.log("[citationHunterAction] raw keywords", rawKeywords)

    const keywords = rawKeywords
      .split(/[,\n]/)
      .map(k => k.trim())
      .filter(Boolean)
      .slice(0, 5)

    // ----------------- Step 2: query OpenAlex for each keyword -----------------
    const citations: CitationEntry[] = []

    for (const kw of keywords) {
      // Check cache first
      const cached = await redis?.get<CitationEntry[]>(`citation:${kw}`)
      if (cached) {
        console.log("[citationHunterAction] cache hit", kw)
        citations.push(...cached)
        continue
      }

      const url = `https://api.openalex.org/works?filter=title.search:${encodeURIComponent(
        kw
      )}&per_page=3`
      console.log("[citationHunterAction] OpenAlex", url)
      const res = await fetch(url)
      if (!res.ok) continue
      const json = await res.json()
      if (!Array.isArray(json.results)) continue

      const list: CitationEntry[] = json.results.map((work: any) => ({
        title: work.display_name,
        authors:
          work.authorships
            ?.map((a: any) => a.author?.display_name)
            .filter(Boolean)
            .join(", ") ?? "",
        journal: work.primary_location?.source?.display_name ?? "",
        url:
          work.primary_location?.source?.homepage_url ??
          work.primary_location?.landing_page_url ??
          work.doi_url ??
          ""
      }))

      // Cache for 1 day
      if (list.length > 0) {
        await redis?.set(`citation:${kw}`, JSON.stringify(list), { ex: 86400 })
      }
      citations.push(...list)
    }

    return {
      isSuccess: true,
      message: "Citations fetched",
      data: citations
    }
  } catch (error) {
    console.error("[citationHunterAction]", error)
    return { isSuccess: false, message: "Citation hunter error" }
  }
}
