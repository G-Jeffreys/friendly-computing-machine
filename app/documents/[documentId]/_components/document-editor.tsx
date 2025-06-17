"use client"

import { SelectDocument } from "@/db/schema/documents-schema"
import { useState, useTransition, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Suggestion } from "@/lib/hooks/use-spell-grammar"
import { useAnalyser } from "@/lib/hooks/use-analyser"

interface DocumentEditorProps {
  initialDocument: SelectDocument
}

export default function DocumentEditor({
  initialDocument
}: DocumentEditorProps) {
  const [title, setTitle] = useState(initialDocument.title)
  const [content, setContent] = useState(initialDocument.content)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [readability, setReadability] = useState<number | null>(null)
  const [stats, setStats] = useState<{
    words: number
    sentences: number
    avgWordLength: number
    readingTimeMinutes: number
  } | null>(null)
  const [highlightedHtml, setHighlightedHtml] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const { analyse } = useAnalyser()
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const DEBOUNCE_MS = 750
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const highlightRef = useRef<HTMLDivElement | null>(null)

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;")

  /**
   * Generate HTML string for highlighted text.
   *
   * - Deduplicates overlapping/duplicate suggestions so each character is highlighted at most once.
   * - Applies precedence: spell (red) > grammar (blue) > style (purple).
   *
   * This prevents the same word/phrase from being rendered multiple times when it belongs to
   * multiple categories.
   */
  const generateHighlighted = useCallback((text: string, sgs: Suggestion[]) => {
    if (!sgs.length) return escapeHtml(text)

    // Priority values – higher means higher precedence.
    const priority: Record<Suggestion["type"], number> = {
      spell: 3,
      grammar: 2,
      style: 1
    }

    // Arrays to hold the winning suggestion type + its priority for every character.
    const labels: Array<Suggestion["type"] | null> = Array(text.length).fill(
      null
    )
    const prios: number[] = Array(text.length).fill(0)

    // Mark characters according to highest-priority suggestion touching them.
    for (const sg of sgs) {
      const p = priority[sg.type]
      const start = Math.max(0, sg.offset)
      const end = Math.min(text.length, sg.offset + sg.length)
      for (let i = start; i < end; i++) {
        if (p > prios[i]) {
          prios[i] = p
          labels[i] = sg.type
        }
      }
    }

    // Helper to map type -> css classes.
    const colorClass = (t: Suggestion["type"]) =>
      t === "spell"
        ? "text-red-600 underline decoration-red-600"
        : t === "grammar"
          ? "text-blue-600 underline decoration-blue-600"
          : "text-purple-600 underline decoration-purple-600"

    // Build final HTML by grouping consecutive characters with the same label.
    let html = ""
    let currentLabel: Suggestion["type"] | null = null
    let buffer = ""

    const flush = () => {
      if (!buffer) return
      if (currentLabel) {
        html += `<span class="${colorClass(currentLabel)}">${escapeHtml(
          buffer
        )}</span>`
      } else {
        html += escapeHtml(buffer)
      }
      buffer = ""
    }

    for (let i = 0; i < text.length; i++) {
      const label = labels[i]
      if (label !== currentLabel) {
        flush()
        currentLabel = label
      }
      buffer += text[i]
    }

    flush()
    return html
  }, [])

  // Handle typing – update UI immediately and debounce expensive analysis
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value

    // 1. Immediate optimistic UI update so characters appear in real-time.
    setContent(newText)
    // Render without highlights first for snappy feedback. Detailed highlighting
    // will be applied once the (debounced) analysis completes.
    setHighlightedHtml(escapeHtml(newText))

    // 2. Debounce heavy analysis work.
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current)
    }
    analysisTimeoutRef.current = setTimeout(() => {
      runChecks(newText)
    }, DEBOUNCE_MS)
  }

  const runChecks = async (text: string) => {
    const res = await analyse(text)
    const map = new Map(res.suggestions.map(s => [s.id, s]))
    setSuggestions(Array.from(map.values()))
    setReadability(res.score)
    setStats({
      words: res.words,
      sentences: res.sentences,
      avgWordLength: res.avgWordLength,
      readingTimeMinutes: res.readingTimeMinutes
    })
    setHighlightedHtml(generateHighlighted(text, Array.from(map.values())))
  }

  const applySuggestion = (sg: Suggestion, replacement: string) => {
    const before = content.slice(0, sg.offset)
    const after = content.slice(sg.offset + sg.length)
    const newContent = `${before}${replacement}${after}`

    const diff = replacement.length - sg.length

    // 1) Optimistic UI update – remove resolved suggestion, shift later offsets
    startTransition(() => {
      const updatedSuggestions = suggestions
        .filter(s => s.id !== sg.id)
        .map(s =>
          s.offset > sg.offset ? { ...s, offset: s.offset + diff } : s
        )

      setContent(newContent)
      setSuggestions(updatedSuggestions)
      setHighlightedHtml(generateHighlighted(newContent, updatedSuggestions))
    })

    // 2) Background re-analysis to get fresh results
    setTimeout(() => runChecks(newContent), 0)
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/documents/${initialDocument.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content })
        })
        if (!res.ok) {
          throw new Error("Failed to save")
        }
        toast({ title: "Document saved" })
      } catch (error) {
        console.error(error)
        toast({ title: "Save failed", variant: "destructive" })
      }
    })
  }

  // Run checks once after component mounts to analyze saved document
  useEffect(() => {
    runChecks(initialDocument.content)
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep highlight layer in sync with textarea scroll
  useEffect(() => {
    const ta = textareaRef.current
    const hl = highlightRef.current
    if (!ta || !hl) return

    const handleScroll = () => {
      hl.scrollTop = ta.scrollTop
      hl.scrollLeft = ta.scrollLeft
    }

    ta.addEventListener("scroll", handleScroll)
    return () => {
      ta.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/documents"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to Documents
        </Link>
      </div>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full border-b text-2xl font-semibold focus:outline-none"
      />

      <div className="flex gap-6">
        {/* Editor with highlight overlay */}
        <div className="relative max-h-[60vh] min-h-[50vh] flex-1">
          {/* highlight layer */}
          <div
            ref={highlightRef}
            className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-4 text-base"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />

          {/* textarea layer */}
          <textarea
            value={content}
            onChange={handleContentChange}
            ref={textareaRef}
            className="absolute inset-0 size-full resize-none rounded border bg-transparent p-4 text-transparent caret-black outline-none selection:bg-blue-200"
            style={{ WebkitTextFillColor: "transparent" }}
          />
        </div>

        {/* Suggestions */}
        <aside className="max-h-[60vh] w-60 space-y-3 overflow-auto rounded border p-3">
          <h2 className="mb-2 font-semibold">Suggestions</h2>
          {suggestions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No issues found</p>
          ) : (
            suggestions.map(sg => (
              <div key={sg.id} className="rounded border p-2 text-sm">
                <p>
                  <span
                    className={
                      sg.type === "spell"
                        ? "text-red-600"
                        : sg.type === "grammar"
                          ? "text-blue-600"
                          : "text-purple-600"
                    }
                  >
                    {content.substring(sg.offset, sg.offset + sg.length)}
                  </span>
                  : {sg.message}
                </p>
                {sg.replacements.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {sg.replacements.slice(0, 3).map(rep => (
                      <Button
                        key={rep}
                        size="sm"
                        variant="secondary"
                        onClick={() => applySuggestion(sg, rep)}
                      >
                        {rep}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          <div className="text-muted-foreground mt-4 space-y-1 text-xs">
            <div>
              Readability score:{" "}
              {readability !== null ? readability.toFixed(1) : "-"}
            </div>
            {stats && (
              <>
                <div>Words: {stats.words}</div>
                <div>Sentences: {stats.sentences}</div>
                <div>Avg. word length: {stats.avgWordLength.toFixed(2)}</div>
                <div>
                  Estimated reading time: {stats.readingTimeMinutes.toFixed(1)}{" "}
                  min
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <Button onClick={handleSave} disabled={isPending} className="mt-4">
        {isPending ? "Saving..." : "Save"}
      </Button>
    </div>
  )
}
