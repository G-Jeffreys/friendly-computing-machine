"use server"

import { Redis } from "@upstash/redis"
import { callLLM } from "@/lib/ai/llm-server"
import { ActionState } from "@/types"
// @ts-ignore - JSON module default import provides object map
import SJR_DATA from "@/lib/data/sjr_2024.json"

const SJR_LOOKUP: Record<string, number> = SJR_DATA as Record<string, number>

export interface CitationEntry {
  title: string
  authors: string
  journal: string
  url: string
  /** 2024 SJR score for the journal this work is published in. */
  sjr: number
}

// ---------------- NEW TYPES ----------------
export interface CitationHunterPayload {
  /** The final keyword list used for the OpenAlex query. */
  keywords: string[]
  /** The resulting citation entries. */
  citations: CitationEntry[]
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
): Promise<ActionState<CitationHunterPayload>> {
  try {
    // ----------------- Step 1: extract keywords via LLM -----------------
    // Number of keywords to extract for citation search
    const TOP_K = 3

    // Prompt the LLM to return the desired number of keywords
    const prompt =
      `Extract the top ${TOP_K} academic keywords or topics relevant to this paper for citation purposes. Return them as a comma-separated list only.`

    const rawKeywords = await callLLM<string>({
      prompt: `${prompt}\n\n"""${text}\n"""`
    })
    console.log("[citationHunterAction] raw keywords", rawKeywords)

    const keywords = rawKeywords
      .split(/[,\n]/)
      .map(k => k.trim())
      .filter(Boolean)
      .slice(0, TOP_K)

    // ----------------- Step 2: Build AND query -----------------

    /**
     * Helper that queries OpenAlex using the provided keywords. Returns a
     * deduplicated & sorted list of CitationEntry objects.
     */
    const queryOpenAlex = async (kwList: string[]): Promise<CitationEntry[]> => {
      if (kwList.length === 0) return []

      // Use a joined cache key so we can reuse for identical queries
      const cacheKey = `citation:${kwList.join("|")}`
      const cachedRaw = await redis?.get<string>(cacheKey)
      if (cachedRaw) {
        try {
          const cached: CitationEntry[] = JSON.parse(cachedRaw)
          console.log("[citationHunterAction] cache hit", kwList)
          return cached
        } catch {
          /* ignore parse error */
        }
      }

      // Build OpenAlex filter using OR between keywords to broaden results.
      // OpenAlex treats commas as AND; using a pipe "|" inside a single filter value
      // performs a logical OR between the terms. This improves recall when the
      // combined AND query is too restrictive (e.g., when works don't contain
      // every keyword in the title).
      const filter = `title.search:${kwList
        .map(kw => encodeURIComponent(kw))
        .join("|")}`
      const url = `https://api.openalex.org/works?filter=${filter}&per_page=50` // grab a generous slice to sort client-side
      console.log("[citationHunterAction] OpenAlex", url)

      const res = await fetch(url)
      if (!res.ok) {
        console.warn("[citationHunterAction] OpenAlex response not ok", res.status)
        return []
      }
      const json = await res.json()
      if (!Array.isArray(json.results)) return []

      console.log(
        "[citationHunterAction] OpenAlex returned",
        json.results.length,
        "records for",
        kwList
      )

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
          "",
        sjr: 0
      }))

      // ----------------- NEW: Assign SJR via local lookup -----------------
      console.log(
        `[citationHunterAction] Using precompiled SJR lookup with ${Object.keys(
          SJR_LOOKUP
        ).length} journals`
      )

      const normaliseIssn = (raw: string): string => raw.replace(/[-\s]/g, "").toLowerCase()

      list.forEach((entry, idx) => {
        const work = json.results[idx]
        // Prefer ISSN_L, fallback to first ISSN in array
        const rawIssn: string | undefined =
          work.host_venue?.issn_l ??
          (Array.isArray(work.host_venue?.issn) && work.host_venue.issn.length > 0
            ? work.host_venue.issn[0]
            : undefined) ??
          work.primary_location?.source?.issn_l ??
          (Array.isArray(work.primary_location?.source?.issn) &&
          work.primary_location.source.issn.length > 0
            ? work.primary_location.source.issn[0]
            : undefined)

        if (!rawIssn) return
        const norm = normaliseIssn(rawIssn)
        entry.sjr = SJR_LOOKUP[norm] ?? 0
        console.log(
          `[citationHunterAction] ISSN ${rawIssn} (norm ${norm}) -> SJR ${entry.sjr}`
        )
      })

      // ----------------- Sort & cache -----------------
      const top: CitationEntry[] = list
        .sort((a: CitationEntry, b: CitationEntry) => b.sjr - a.sjr)
        .slice(0, 5)

      if (top.length > 0) {
        // cache for 1 day
        await redis?.set(cacheKey, JSON.stringify(top), { ex: 86400 })
      }
      return top
    }

    // Query OpenAlex once with the extracted keywords
    const citations = await queryOpenAlex(keywords)

    const finalKeywords = keywords

    return {
      isSuccess: true,
      message: "Citations fetched",
      data: {
        keywords: finalKeywords,
        citations
      }
    }
  } catch (error) {
    console.error("[citationHunterAction]", error)
    return { isSuccess: false, message: "Citation hunter error" }
  }
}
