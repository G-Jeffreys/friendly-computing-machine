// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: usage-meter
// POST body: { userId: string, tokensIn: number, tokensOut: number }
// Enforces daily token limit and upserts into usage_daily table.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

serve(async (req: Request) => {
  try {
    const { userId, tokensIn = 0, tokensOut = 0 } = await req.json()

    if (!userId) {
      return new Response("Missing userId", { status: 400 })
    }

    const DAILY_LIMIT = Deno.env.get("AI_TOKENS_DAILY_LIMIT")
      ? Number(Deno.env.get("AI_TOKENS_DAILY_LIMIT"))
      : 50000

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const today = new Date().toISOString().substring(0, 10)

    // Upsert row for today
    const { data, error } = await supabase
      .from("usage_daily")
      .upsert(
        {
          user_id: userId,
          date: today,
          tokens_in: tokensIn,
          tokens_out: tokensOut
        },
        { onConflict: "user_id,date", ignoreDuplicates: false }
      )
      .select()

    if (error) throw error

    // Calculate new totals
    const row = data?.[0]
    const total = (row?.tokens_in ?? 0) + (row?.tokens_out ?? 0)

    if (total > DAILY_LIMIT) {
      return new Response("Daily limit exceeded", { status: 429 })
    }

    return new Response(JSON.stringify({ remaining: DAILY_LIMIT - total }), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (err) {
    console.error("[usage-meter]", err)
    return new Response("Server error", { status: 500 })
  }
})

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
