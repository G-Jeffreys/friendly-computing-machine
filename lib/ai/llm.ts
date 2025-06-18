"use client"

/*
  LLM abstraction layer providing a single `callLLM` helper.
  - Wraps multiple providers (OpenAI, LanguageTool, etc.)
  - Adds simple in-memory caching keyed by `cacheKey`.
  - Logs verbosely for observability.
  NOTE: All strings such as base URLs or model names MUST come from env vars to satisfy repository rules.
*/

// Type describing the options accepted by the helper
export interface CallLLMOptions {
  /**
   * Prompt for the model (where applicable).
   * Optional when `provider === "languageTool"` because that API uses `params.text` instead.
   */
  prompt?: string
  /** Name of the provider. Example: "openai", "languageTool" */
  provider?: string
  /** Arbitrary additional params forwarded to the provider implementation. */
  params?: Record<string, any>
  /** Optional cache key. If omitted, one is constructed from provider+prompt+params. */
  cacheKey?: string
  /** Model identifier (e.g. "gpt-4o"). MUST come from env. */
  model?: string
  /** Sampling temperature (OpenAI) */
  temperature?: number
  /** Max tokens (OpenAI) */
  maxTokens?: number
}

// In-memory cache (best-effort, per serverless instance or browser tab)
const memoryCache = new Map<string, any>()

// Helper to build a deterministic cache key
function buildKey(opts: CallLLMOptions): string {
  return (
    opts.cacheKey ??
    `${opts.provider ?? "openai"}:${opts.prompt ?? ""}:${JSON.stringify(
      opts.params ?? {}
    )}`
  )
}

export async function callLLM<T = any>(opts: CallLLMOptions): Promise<T> {
  const key = buildKey(opts)

  // Check cache first
  if (memoryCache.has(key)) {
    console.debug("[callLLM] cache hit", key)
    return memoryCache.get(key)
  }

  const provider = opts.provider ?? "openai"
  console.debug("[callLLM] provider", provider, "key", key)

  let data: any

  switch (provider) {
    case "languageTool": {
      // Public grammar/spell-check API, does not require secret key
      const baseUrl =
        (typeof window === "undefined"
          ? process.env.LANGUAGE_TOOL_API_URL
          : process.env.NEXT_PUBLIC_LANGUAGE_TOOL_API_URL) ??
        "https://api.languagetool.org/v2/check" // fallback

      const { text = "", language = "en-US" } = opts.params || {}

      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ language, text })
      })

      data = await res.json()
      break
    }

    case "openai":
    default: {
      const baseUrl =
        process.env.AI_API_BASE_URL ??
        "https://api.openai.com/v1/chat/completions"
      const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY

      if (!apiKey) {
        throw new Error("[callLLM] Missing AI_API_KEY / OPENAI_API_KEY env var")
      }

      const model = opts.model ?? process.env.AI_MODEL ?? "gpt-3.5-turbo"
      const temperature = opts.temperature ?? 0.2
      const maxTokens = opts.maxTokens ?? 1024

      const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: opts.prompt }],
          temperature,
          max_tokens: maxTokens
        })
      })

      const json = await res.json()
      data = json.choices?.[0]?.message?.content ?? ""
      break
    }
  }

  // Store in cache
  memoryCache.set(key, data)

  return data as T
}
