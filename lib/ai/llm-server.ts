/*
  Server-side variant of the `callLLM` helper – identical behaviour minus the
  client-only analytics and without the `"use client"` directive so that it can
  be imported from server actions and API routes.
*/

import { auth } from "@clerk/nextjs/server"

export interface CallLLMOptions {
  prompt?: string
  provider?: string
  params?: Record<string, any>
  cacheKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

const memoryCache = new Map<string, any>()

function key(opts: CallLLMOptions) {
  return (
    opts.cacheKey ??
    `${opts.provider ?? "openai"}:${opts.prompt ?? ""}:${JSON.stringify(
      opts.params ?? {}
    )}`
  )
}

// ----------------------- Prompt scrub helper -----------------------
function scrubPrompt(input?: string): string | undefined {
  if (!input) return input
  // Remove common prompt-injection attempts such as "IGNORE ALL PREVIOUS..."
  const patterns = [/ignore\s+all\s+previous/gi, /forget\s+everything/gi]
  let out = input
  patterns.forEach(rx => {
    out = out.replace(rx, "")
  })
  return out.trim()
}

// ----------------------- Token estimate helper ---------------------
function estimateTokens(text: string | undefined): number {
  if (!text) return 0
  const words = text.split(/\s+/).length
  return Math.round(words / 0.75)
}

// ----------------------- Usage meter helper ------------------------
async function recordUsage(tokensIn: number, tokensOut: number): Promise<void> {
  try {
    const url = process.env.USAGE_METER_URL
    const apiKey = process.env.USAGE_METER_API_KEY
    if (!url || !apiKey) return

    const { userId } = await auth()
    if (!userId) return // anonymous in demo mode – skip

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ userId, tokensIn, tokensOut })
    })

    if (!res.ok) {
      const msg = await res.text()
      console.warn("[llm-server] usage-meter rejected", msg)
      if (res.status === 429) {
        throw new Error("Daily token limit exceeded")
      }
    }
  } catch (err) {
    console.error("[llm-server] usage-meter error", err)
  }
}

export async function callLLM<T = any>(opts: CallLLMOptions): Promise<T> {
  const scrubbedPrompt = scrubPrompt(opts.prompt)
  const k = key({ ...opts, prompt: scrubbedPrompt })
  const tokensInEstimate = estimateTokens(scrubbedPrompt)

  if (memoryCache.has(k)) return memoryCache.get(k)

  let data: any
  const provider = opts.provider ?? "openai"

  // Preflight usage-meter check
  await recordUsage(tokensInEstimate, 0)

  switch (provider) {
    case "languageTool": {
      const baseUrl =
        process.env.LANGUAGE_TOOL_API_URL ??
        "https://api.languagetool.org/v2/check"
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
      if (!apiKey) throw new Error("AI_API_KEY missing")
      const preferred = opts.model ?? process.env.AI_MODEL_LARGE ?? "gpt-4o"
      const fallback =
        process.env.AI_MODEL_FALLBACK_LARGE ?? "gpt-3.5-turbo-16k"
      const temperature = opts.temperature ?? 0.2
      const maxTokens = opts.maxTokens ?? 1024
      const payload = (m: string) => ({
        model: m,
        messages: [{ role: "user", content: opts.prompt }],
        temperature,
        max_tokens: maxTokens
      })
      const doFetch = async (m: string) => {
        const r = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload(m))
        })
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }
      try {
        const j = await doFetch(preferred)
        data = j.choices?.[0]?.message?.content ?? ""
      } catch {
        const j = await doFetch(fallback)
        data = j.choices?.[0]?.message?.content ?? ""
      }
      break
    }
  }

  const tokensOutEstimate = estimateTokens(
    typeof data === "string" ? data : JSON.stringify(data)
  )

  await recordUsage(tokensInEstimate, tokensOutEstimate)

  memoryCache.set(k, data)
  return data as T
}
