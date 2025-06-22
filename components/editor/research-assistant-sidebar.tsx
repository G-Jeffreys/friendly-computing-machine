"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Lightbulb, Book, Film, Wand2 } from "lucide-react"
import type { ResearchReport } from "@/actions/ai/research-assistant-action"
import type { Editor as TipTapEditor } from "@tiptap/core"

interface ResearchAssistantSidebarProps {
  editor: TipTapEditor | null
  documentText: string
  onRunAnalysis: () => Promise<ResearchReport | null>
}

/**
 * A unified sidebar that provides comprehensive research and writing
 * suggestions by orchestrating multiple AI services.
 */
export default function ResearchAssistantSidebar({
  editor,
  documentText,
  onRunAnalysis
}: ResearchAssistantSidebarProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<ResearchReport | null>(null)
  const { toast } = useToast()

  const handleAnalysis = async () => {
    setIsLoading(true)
    setReport(null)
    try {
      const result = await onRunAnalysis()
      setReport(result)
    } catch (e) {
      console.error("Failed to run analysis", e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleHighlight = (text: string) => {
    if (!editor || !text) return
    const { state, view } = editor
    const { doc } = state
    let from = -1
    let to = -1

    doc.descendants((node, pos) => {
      if (from > -1) return false // Already found
      if (node.isText) {
        const index = node.text?.indexOf(text) ?? -1
        if (index > -1) {
          from = pos + index
          to = from + text.length
        }
      }
      return true
    })

    if (from > -1 && to > -1) {
      editor.commands.setTextSelection({ from, to })
      editor.commands.focus()
    }
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied to clipboard" })
  }

  const handleInsertCitation = (text: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(text).run()
  }

  return (
    <div className="border-l bg-slate-50 p-4 pt-10 lg:w-96">
      <div className="sticky top-0 bg-slate-50 pt-4">
        <h2 className="text-lg font-semibold">Research Assistant</h2>
        <p className="text-muted-foreground text-sm">
          Generate a comprehensive report with suggestions for improving your
          paper.
        </p>

        <div className="mt-4">
          <Button
            onClick={handleAnalysis}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Analyzing..." : "Generate Report"}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="mt-10 flex flex-col items-center justify-center text-center">
          <Wand2 className="text-muted-foreground size-12 animate-pulse" />
          <p className="text-muted-foreground mt-4 text-sm">
            Analyzing your document...
          </p>
        </div>
      )}

      {report && (
        <ScrollArea className="mt-4 h-[calc(100vh-200px)]">
          <div className="space-y-6">
            {/* Tone Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wand2 className="size-5" />
                  Tone Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.toneSuggestions.length > 0 ? (
                  <ul className="space-y-4">
                    {report.toneSuggestions.map((s, i) => (
                      <li
                        key={i}
                        className="cursor-pointer rounded-md border p-2 text-sm transition-colors hover:bg-slate-100"
                        onClick={() => handleHighlight(s.original)}
                      >
                        <p>
                          <span className="font-semibold">Original:</span>{" "}
                          {s.original}
                        </p>
                        <p>
                          <span className="font-semibold text-green-600">
                            Revised:
                          </span>{" "}
                          {s.revised}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No tone suggestions.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Citations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Book className="size-5" />
                  Citation Hunter
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.citations.length > 0 ? (
                  <ul className="space-y-4">
                    {report.citations.map((c, i) => (
                      <li key={i} className="text-sm">
                        <p className="font-bold">{c.title}</p>
                        <p className="text-muted-foreground">{c.authors}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() =>
                            handleInsertCitation(
                              `${c.authors} (${c.journal}). ${c.title}.`
                            )
                          }
                        >
                          Insert Citation
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No citations found.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Slide Deck */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Film className="size-5" />
                  Slide Deck Outline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.slideDeck.length > 0 ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mb-4 w-full"
                      onClick={() =>
                        handleCopyToClipboard(
                          report.slideDeck.map(s => `- ${s.text}`).join("\n")
                        )
                      }
                    >
                      Copy as Markdown
                    </Button>
                    <ul className="space-y-2">
                      {report.slideDeck.map((s, i) => (
                        <li key={i} className="text-sm">
                          {s.text}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No slide deck generated.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      )}

      {!report && !isLoading && (
        <div className="mt-10 flex flex-col items-center justify-center text-center">
          <Lightbulb className="text-muted-foreground size-12" />
          <p className="text-muted-foreground mt-4 text-sm">
            Click "Generate Report" to get started.
          </p>
        </div>
      )}
    </div>
  )
}
