/*
  Grammar Correction Prompt
  This prompt is consumed by the `callLLM` helper to perform grammar correction on arbitrary text.
  Per repository rules, every prompt MUST explicitly instruct the model NEVER to use hyphens.
*/

export const GRAMMAR_CORRECT_PROMPT = (rawText: string): string => {
  return `You are an AI assistant tasked with correcting grammar, spelling, and style issues in the user's text.

Strict requirements:
1. Never use hyphens in your response under any circumstances.
2. Preserve the original meaning and tone of the text.
3. Return ONLY the corrected text – no additional commentary.

User text (triple-backtick fenced):
\`\`\`
${rawText}
\`\`\`

Respond with the improved text now.`
} 