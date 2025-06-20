"use client"

import {
  useState,
  useTransition,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Dispatch,
  SetStateAction
} from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import UnderlineExt from "@tiptap/extension-underline"
import LinkExt from "@tiptap/extension-link"
import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

import type { Editor as TipTapEditor } from "@tiptap/core"
import type { SelectDocument } from "@/db/schema/documents-schema"
import { Suggestion } from "@/lib/hooks/use-spell-grammar"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAnalyser } from "@/lib/hooks/use-analyser"
import { useAutosave } from "@/lib/hooks/use-autosave"
import { DEMO_WORD_LIMIT, DEMO_TIME_LIMIT_MS } from "@/lib/demo-constants"
import type { CitationEntry } from "@/actions/ai/citation-hunter-action"
import type { ResearchReport } from "@/actions/ai/research-assistant-action"
import EditorToolbar from "./toolbar"
import { DocumentEditor } from "./editor"
import { InsightsPanel } from "../insights/panel"
import { debounce } from "@/lib/utils/debounce"

interface EditorOrchestratorProps {
  initialDocument: SelectDocument
  demoMode?: boolean
  setSuggestions: Dispatch<SetStateAction<Suggestion[]>>
  setReport: Dispatch<SetStateAction<ResearchReport | null>>
  setIsAnalyzing: Dispatch<SetStateAction<boolean>>
}

interface DefinitionEntry {
  term: string
  definition: string
  etymology: string
  example: string
}

export default function EditorOrchestrator({
  initialDocument,
  demoMode = false,
  setSuggestions,
  setReport,
  setIsAnalyzing
}: EditorOrchestratorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialDocument.title)
  const [isNewDocument, setIsNewDocument] = useState(false)
  const [maxMode, setMaxMode] = useState<boolean>(
    (initialDocument as any).maxMode ?? false
  )

  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const [toneSuggestions, setToneSuggestions] = useState<
    { original: string; revised: string }[]
  >([])
  const [isHarmonizing, setHarmonizing] = useState(false)
  const [definition, setDefinition] = useState<DefinitionEntry | null>(null)
  const [definedTerm, setDefinedTerm] = useState<string>("")
  const [isDefining, setIsDefining] = useState(false)
  const [citations, setCitations] = useState<CitationEntry[]>([])
  const [findingCitations, setFindingCitations] = useState(false)
  const [slideDeck, setSlideDeck] = useState<{ text: string }[]>([])
  const [creatingSlide, setCreatingSlide] = useState(false)
  const { analyse } = useAnalyser()
  const [demoBlocked, setDemoBlocked] = useState(false)
  const [updatedAtToken, setUpdatedAtToken] = useState(
    typeof initialDocument.updatedAt === "string"
      ? initialDocument.updatedAt
      : new Date(initialDocument.updatedAt).toISOString()
  )

  const initialHtml = initialDocument.content.includes("<")
    ? initialDocument.content
    : `<p>${initialDocument.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</p>`

  const [content, setContent] = useState(initialHtml)
  const [plainText, setPlainText] = useState<string>("")

  useEffect(() => {
    if (
      !initialDocument.content ||
      initialDocument.content.replace(/<p><\/p>/g, "").trim() === ""
    ) {
      setIsNewDocument(true)
    }
  }, [initialDocument.content])

  const { secondsSinceLastSave, markSaved } = useAutosave({
    title,
    content,
    maxMode,
    documentId: initialDocument.id,
    demoMode,
    updatedAt: updatedAtToken
  })

  interface PosSuggestion extends Suggestion {
    from?: number
    to?: number
  }

  const suggestionsRef = useRef<PosSuggestion[]>([])
  const charPositionsRef = useRef<number[]>([])
  const decorationKey = useMemo(
    () => new PluginKey("spellGrammarHighlight"),
    []
  )

  const buildAnalysisTextAndPositions = (doc: any) => {
    let text = ""
    const positions: number[] = []
    doc.descendants((node: any, pos: number) => {
      if (node.isText) {
        text += node.text
        for (let i = 0; i < node.text.length; i++) {
          positions.push(pos + i)
        }
      } else if (node.isBlock && node.content.size > 0) {
        if (text.length > 0 && !/\s$/.test(text)) {
          text += " "
          positions.push(positions[positions.length - 1])
        }
      }
    })
    return { analysisText: text, charPositions: positions }
  }

  const runChecks = async () => {
    if (!editor) return
    const { analysisText, charPositions } = buildAnalysisTextAndPositions(
      editor.state.doc
    )
    setPlainText(analysisText)
    charPositionsRef.current = charPositions
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      LinkExt.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true
      }),
      Extension.create({
        name: "analysisPlugin",
        addProseMirrorPlugins() {
          const run = debounce(runChecks, 500)
          return [
            new Plugin({
              key: new PluginKey("analysisTrigger"),
              view() {
                run()
                return {}
              },
              appendTransaction: (transactions, oldState, newState) => {
                if (
                  transactions.some(
                    transaction => transaction.docChanged && !transaction.getMeta("suggestionApplied")
                  )
                ) {
                  run()
                }
                return null
              }
            })
          ]
        }
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
    }
  })

  const handleAnalysis = async () => {
    setIsAnalyzing(true)
    // const report = await runAnalysisAction(); // Example
    // setReport(report);
    setIsAnalyzing(false)
  }

  const applySuggestion = (sg: Suggestion, replacement: string) => {
    // ...
  }

  const addToDictionary = (word: string) => {
    // ...
  }

  const runAnalysis = async (): Promise<ResearchReport | null> => {
    // ...
    return null
  }

  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar
        editor={editor}
        isMaxMode={maxMode}
        onToggleMaxMode={setMaxMode}
        onToneHarmonize={() => {}}
        onFindCitations={handleAnalysis}
        isFindingCitations={false}
        onCreateSlideDeck={() => {}}
        isCreatingSlideDeck={false}
        onSave={() => {}}
        onDelete={() => {}}
        isSaving={secondsSinceLastSave < 1}
      />
      <div className="mt-4 flex-1">
        <DocumentEditor editor={editor} />
      </div>
      {/* The InsightsPanel will be placed in the layout, so we don't render it here */}
    </div>
  )
} 