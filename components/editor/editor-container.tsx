"use client"

import {
  useState,
  useTransition,
  useEffect,
  useRef,
  useCallback,
  useMemo
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
import OverlayModal from "@/components/ui/overlay-modal"
import { useToast } from "@/hooks/use-toast"
import { useAnalyser } from "@/lib/hooks/use-analyser"
import { debounce } from "@/lib/utils/debounce"
import { useAutosave } from "@/lib/hooks/use-autosave"
import { DEMO_WORD_LIMIT, DEMO_TIME_LIMIT_MS } from "@/lib/demo-constants"
import type { CitationEntry } from "@/actions/ai/citation-hunter-action"

// Extracted UI components
import EditorToolbar from "./editor-toolbar"
import WritingSuggestionSidebar from "./suggestion-sidebar"
import ResearchSidebar from "./definition-sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import posthog from "posthog-js"
import DemoSignInPrompt from "./demo-sign-in-prompt"

interface EditorContainerProps {
  initialDocument: SelectDocument
  /** When true the component runs in anonymous demo mode and enforces word/time limits. */
  demoMode?: boolean
}

// ----------------------------------------------
// Types for new Definition Expander feature
// ----------------------------------------------
interface DefinitionEntry {
  term: string
  definition: string
  etymology: string
  example: string
}

/**
 * EditorContainer – the main rich-text editor experience. This component was
 * previously the monolithic `DocumentEditor`. It now orchestrates smaller
 * presentational components such as `EditorToolbar` and `SuggestionSidebar`.
 */
export default function EditorContainer({
  initialDocument,
  demoMode = false
}: EditorContainerProps) {
  /* ------------------------------ State hooks ------------------------------ */
  const editorViewRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [title, setTitle] = useState(initialDocument.title)
  const [isNewDocument, setIsNewDocument] = useState(false)
  const [maxMode, setMaxMode] = useState<boolean>(
    // Fallback to false when property missing for legacy docs
    // @ts-ignore – initialDocument may not yet include maxMode in older types
    initialDocument.maxMode ?? false
  )
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [readability, setReadability] = useState<number | null>(null)
  const [stats, setStats] = useState<{
    words: number
    sentences: number
    avgWordLength: number
    readingTimeMinutes: number
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<string>("suggestions")
  const [toneSuggestions, setToneSuggestions] = useState<
    { original: string; revised: string }[]
  >([])
  const [isHarmonizing, setHarmonizing] = useState(false)

  /* ------------------- Definition expander ------------------- */
  const [definition, setDefinition] = useState<DefinitionEntry | null>(null)
  const [definedTerm, setDefinedTerm] = useState<string>("")
  const [isDefining, setIsDefining] = useState(false)
  const definitionPopupRef = useRef<HTMLDivElement>(null)
  const definitionTimerRef = useRef<NodeJS.Timeout | null>(null)

  /* ------------------- Citations ------------------- */
  const [citations, setCitations] = useState<CitationEntry[]>([])
  const [citationKeywords, setCitationKeywords] = useState<string[]>([])
  const [findingCitations, setFindingCitations] = useState(false)

  /* ------------------- Slide Decker ------------------- */
  const [slideDeck, setSlideDeck] = useState<{ text: string }[]>([])
  const [slideDeckHistory, setSlideDeckHistory] = useState<any[]>([])
  const [creatingSlide, setCreatingSlide] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const { analyse } = useAnalyser()

  /* ------------------------------ Demo blocker ----------------------------- */
  const [demoBlocked, setDemoBlocked] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  /* --- optimistic-concurrency token shared between manual & auto-save ----- */
  const [updatedAtToken, setUpdatedAtToken] = useState(
    typeof initialDocument.updatedAt === "string"
      ? initialDocument.updatedAt
      : new Date(initialDocument.updatedAt).toISOString()
  )

  /* ----------------------------- TipTap content ---------------------------- */
  // Convert legacy plain-text documents to simple <p> so TipTap can load them.
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

  // Load slide deck history on mount
  useEffect(() => {
    const loadSlideDeckHistory = async () => {
      try {
        const res = await fetch(
          `/api/documents/${initialDocument.id}/slide-deck`
        )
        const json = await res.json()
        if (json.isSuccess) {
          setSlideDeckHistory(json.data)
          console.log(
            "[EditorContainer] loaded slide deck history",
            json.data.length
          )
        }
      } catch (e) {
        console.error("[EditorContainer] failed to load slide deck history", e)
      }
    }

    loadSlideDeckHistory()
  }, [initialDocument.id])

  const handleSelection = (editor: TipTapEditor) => {
    if (definitionTimerRef.current) {
      clearTimeout(definitionTimerRef.current)
    }

    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to).trim()

    if (text) {
      definitionTimerRef.current = setTimeout(() => {
        handleDefine(text)
      }, 500) // 500ms delay
    } else {
      setDefinition(null)
      setDefinedTerm("")
    }
  }

  /* ---------------------------- Autosave logic ---------------------------- */
  const { secondsSinceLastSave, markSaved } = useAutosave({
    title,
    content,
    maxMode,
    documentId: initialDocument.id,
    demoMode,
    updatedAt: updatedAtToken
  })

  /* ------------------------------ Pagination Logic ----------------------------- */
  const PAGE_HEIGHT_PX = 1050 // Corresponds to the CSS value

  const updatePageCount = useCallback(() => {
    const editorView = editorViewRef.current
    if (editorView) {
      const totalHeight = editorView.scrollHeight
      const count = Math.max(1, Math.ceil(totalHeight / PAGE_HEIGHT_PX))
      setPageCount(count)
    }
  }, [])

  const updateCurrentPage = useCallback(() => {
    const editorView = editorViewRef.current
    if (editorView) {
      const scrollTop = editorView.scrollTop
      const page = Math.max(1, Math.floor(scrollTop / PAGE_HEIGHT_PX) + 1)
      setCurrentPage(page)
    }
  }, [])

  useEffect(() => {
    updatePageCount()
  }, [plainText, updatePageCount])

  /* ------------------ Suggestion highlight Decoration plugin -------------- */
  // Extend Suggestion with live ProseMirror positions so we can keep them
  // mapped accurately through document edits.
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

  /**
   * Builds a flat string for analysis and a parallel array mapping each
   * character of the string back to its ProseMirror document position. This
   * is more reliable than recreating the string separately.
   */
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

  /* ---------------------- Editor refs & analysis utilities ---------------------- */
  // Keep the latest editor instance in a ref so callbacks don't close over a
  // stale value.
  const editorRef = useRef<TipTapEditor | null>(null)

  /**
   * Executes spell-, grammar- and style-checks via the Web-Worker analyser,
   * then updates sidebar state and inline decorations accordingly.
   */
  const runChecks = useCallback(async () => {
    const currentEditor = editorRef.current
    if (!currentEditor) return

    const { analysisText, charPositions } = buildAnalysisTextAndPositions(
      currentEditor.state.doc
    )
    charPositionsRef.current = charPositions

    try {
      // Pass user dictionary words to the analyser
      const userDictionaryWords = Array.from(dictionaryRef.current)
      const result = await analyse(analysisText, userDictionaryWords)

      const newSuggestions = result.suggestions.map(s => ({
        ...s,
        offset: s.offset,
        length: s.length
      }))

      setSuggestions(newSuggestions)
      suggestionsRef.current = newSuggestions.map(s => s as PosSuggestion)

      // Rebuild decorations so highlights stay in sync with the document.
      currentEditor.view.dispatch(
        currentEditor.view.state.tr.setMeta(decorationKey, true)
      )

      setReadability(result.score)
      setStats({
        words: result.words,
        sentences: result.sentences,
        avgWordLength: result.avgWordLength,
        readingTimeMinutes: result.readingTimeMinutes
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[EditorContainer] runChecks", err)
    }
  }, [analyse, decorationKey])

  // Debounced wrapper so we don't hammer the analyser while typing.
  const debouncedRunChecks = useMemo(
    () => debounce(runChecks, 1000),
    [runChecks]
  )

  /* ---------------------- Suggestion highlight decoration ---------------------- */
  const createSuggestionPlugin = useCallback(() => {
    const buildDecorations = (doc: any) => {
      const decos: any[] = []
      const charPositions = charPositionsRef.current
      if (!charPositions) return DecorationSet.empty

      // Add tone harmonizer decorations first (highest priority)
      toneSuggestions.forEach(sg => {
        const index = plainText.indexOf(sg.original)
        if (index !== -1) {
          const startIndex = index
          const endIndex = index + sg.original.length - 1
          if (
            startIndex >= charPositions.length ||
            endIndex >= charPositions.length
          )
            return

          const from = charPositions[startIndex]
          const to = charPositions[endIndex] + 1 // inclusive

          // Intentionally skip adding decorations for tone suggestions to remove green underlining.
        }
      })

      // Add other suggestions after (lower priority)
      const colorClass = (t: Suggestion["type"]) =>
        t === "spell"
          ? "text-red-600 underline decoration-red-600"
          : t === "grammar"
            ? "text-blue-600 underline decoration-blue-600"
            : "text-purple-600 underline decoration-purple-600"

      suggestionsRef.current.forEach(sg => {
        const startIndex = sg.offset
        const endIndex = sg.offset + sg.length - 1
        if (
          startIndex >= charPositions.length ||
          endIndex >= charPositions.length
        )
          return

        const from = charPositions[startIndex]
        const to = charPositions[endIndex] + 1 // inclusive

        // Only add decoration if there isn't already a tone harmonizer decoration at this position
        const hasToneDecoration = decos.some(
          d =>
            (d.from <= from && d.to >= to) || // Tone decoration fully contains this one
            (d.from >= from && d.from <= to) || // Tone decoration starts inside this one
            (d.to >= from && d.to <= to) // Tone decoration ends inside this one
        )

        if (!hasToneDecoration) {
          ;(sg as PosSuggestion).from = from
          ;(sg as PosSuggestion).to = to
          decos.push(
            Decoration.inline(from, to, { class: colorClass(sg.type) })
          )
        }
      })

      return DecorationSet.create(doc, decos)
    }

    return new Plugin({
      key: decorationKey,
      state: {
        init: (_: any, { doc }: any) => buildDecorations(doc),
        apply: (tr: any, old: any) => {
          if (tr.getMeta(decorationKey)) {
            return buildDecorations(tr.doc)
          }

          const mapped = old.map(tr.mapping, tr.doc)

          // Keep stored suggestion positions & offsets in sync.
          const charPositionsCurr = charPositionsRef.current
          if (charPositionsCurr) {
            suggestionsRef.current.forEach(sg => {
              if (sg.from !== undefined) sg.from = tr.mapping.map(sg.from)
              if (sg.to !== undefined) sg.to = tr.mapping.map(sg.to, -1)

              if (sg.from !== undefined) {
                const newOffset = charPositionsCurr.lastIndexOf(sg.from)
                if (newOffset !== -1) sg.offset = newOffset
              }
            })
          }

          return mapped
        }
      },
      props: {
        decorations: state => decorationKey.getState(state)
      }
    })
  }, [])

  const suggestionDecorationExt = useMemo(() => {
    return Extension.create({
      name: "suggestionDecoration",
      addProseMirrorPlugins() {
        return [createSuggestionPlugin()]
      }
    })
  }, [createSuggestionPlugin])

  /* ------------------------- TipTap Editor instance ------------------------ */
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      LinkExt.configure({
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank"
        },
        openOnClick: false
      }),
      suggestionDecorationExt
    ],
    content: content,
    onUpdate: ({ editor }) => {
      if (isNewDocument) {
        setIsNewDocument(false)
      }
      const html = editor.getHTML()
      setContent(html)
      const text = editor.getText()
      setPlainText(text)

      /* -------- Demo mode word / time limiter -------- */
      if (demoMode) {
        const wordCount = html.trim().split(/\s+/).filter(Boolean).length

        if (wordCount > DEMO_WORD_LIMIT) {
          if (!timerRef.current) {
            timerRef.current = setTimeout(
              () => setDemoBlocked(true),
              DEMO_TIME_LIMIT_MS
            )
          }
        } else {
          if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
          }
          if (demoBlocked) setDemoBlocked(false)
        }
      }

      /* -------- Trigger expensive analysis (debounced) -------- */
      debouncedRunChecks()
    },
    onSelectionUpdate: ({ editor }) => {
      handleSelection(editor)
    },
    editorProps: {
      attributes: {
        class: "prose dark:prose-invert focus:outline-none"
      }
    }
  })

  /* ---------- Sync editor ref & run initial analysis ---------- */
  useEffect(() => {
    if (editor) {
      editorRef.current = editor
      runChecks()
    }
  }, [editor, runChecks])

  /* ------------------------------ Handlers ------------------------------ */
  const handleSave = () => {
    if (demoMode) {
      setDemoBlocked(true)
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/documents/${initialDocument.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            maxMode,
            updatedAt: updatedAtToken
          })
        })
        if (res.status === 409) {
          const conflict = await res.json()
          if (typeof conflict.updatedAt === "string") {
            setUpdatedAtToken(conflict.updatedAt)
            markSaved(conflict.updatedAt)
          }
          console.warn("[EditorContainer] save conflict – ignoring pop-up")
        } else if (!res.ok) {
          throw new Error("Failed to save")
        } else {
          const data = await res.json()
          markSaved(data.updatedAt)
          setUpdatedAtToken(data.updatedAt)
          toast({ title: "Document saved" })
          router.refresh()
        }
      } catch (error) {
        console.error(error)
        toast({ title: "Save failed", variant: "destructive" })
      }
    })
  }

  const handleDelete = () => {
    if (demoMode) {
      setDemoBlocked(true)
      return
    }

    if (
      !confirm(
        "Are you sure you want to delete this document? This action cannot be undone."
      )
    ) {
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/documents/${initialDocument.id}`, {
          method: "DELETE"
        })
        if (!res.ok) {
          throw new Error("Failed to delete")
        }
        toast({ title: "Document deleted" })
        router.push("/documents")
        router.refresh()
      } catch (error) {
        console.error(error)
        toast({ title: "Delete failed", variant: "destructive" })
      }
    })
  }

  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPod|iPad/i.test(navigator.platform)
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey

      if (!ctrlOrCmd) return

      if (e.key === "s" || e.key === "S") {
        e.preventDefault()
        handleSave()
      }

      if (e.key === "Enter") {
        e.preventDefault()
        runChecks()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleSave]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
  }, [handleKeydown])

  /* ------------------------ Apply suggestion ------------------------ */
  const applySuggestion = (sg: Suggestion, replacement: string) => {
    if (!editor) return
    // Prefer live `from`/`to` positions if available for accuracy.
    const ps = sg as PosSuggestion
    let from = ps.from
    let to = ps.to

    if (from === undefined || to === undefined) {
      const charPositions = charPositionsRef.current
      if (charPositions) {
        from = charPositions[sg.offset]
        to = charPositions[sg.offset + sg.length - 1] + 1
      }
    }
    if (!from || !to) return

    editor.chain().focus().insertContentAt({ from, to }, replacement).run()

    // Remove the suggestion from state so it disappears instantly and can't
    // be applied twice, then rebuild decorations.
    setSuggestions(prev => prev.filter(s => s.id !== sg.id))
    suggestionsRef.current = suggestionsRef.current.filter(s => s.id !== sg.id)

    const tr = editor.state.tr
    tr.setMeta(decorationKey, true)
    editor.view.dispatch(tr)

    // Re-run checks to remove the used suggestion.
    setTimeout(() => {
      runChecks()
    }, 50)
  }

  /* ------------------- Dictionary integration ------------------- */
  const handleAddToDictionary = async (word: string) => {
    try {
      const res = await fetch("/api/user-dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, languageCode: "en" })
      })
      if (!res.ok) {
        const err = await res.json()
        toast({
          title: err.message || "Failed to add word",
          variant: "destructive"
        })
        return
      }
      toast({ title: `"${word}" added to dictionary` })

      dictionaryRef.current.add(word.toLowerCase())

      // Refresh suggestions
      runChecks()
    } catch (error) {
      console.error("[EditorContainer] handleAddToDictionary", error)
      toast({ title: "Server error", variant: "destructive" })
    }
  }

  /* --------------------------- Side-effects --------------------------- */
  useEffect(() => {
    if (editor) {
      const initialText = editor.getText()
      setPlainText(initialText)
      runChecks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  /* ----------------------- User dictionary ----------------------- */
  const dictionaryRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Fetch once on mount.
    ;(async () => {
      try {
        const res = await fetch("/api/user-dictionary?lang=en")
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.data)) {
            const set = new Set<string>()
            json.data.forEach((row: any) => set.add(row.word.toLowerCase()))
            dictionaryRef.current = set
          }
        }
      } catch (e) {
        console.error("[EditorContainer] Failed to fetch dictionary", e)
      }
    })()
  }, [])

  /* ------------------ Tone Harmonizer ------------------ */
  const [showSignInPrompt, setShowSignInPrompt] = useState(false)
  const [currentFeature, setCurrentFeature] = useState("")

  const promptSignIn = (featureName: string) => {
    setCurrentFeature(featureName)
    setShowSignInPrompt(true)
  }

  const handleToneHarmonize = async () => {
    if (demoMode) {
      promptSignIn("Tone Harmonizer")
      return
    }
    if (!editor) return

    let textToHarmonize = plainText // Fallback to full document
    const { from, to, empty } = editor.state.selection
    if (!empty) {
      textToHarmonize = editor.state.doc.textBetween(from, to)
    }

    if (!textToHarmonize.trim()) {
      toast({
        title: "No text selected",
        description:
          "Please select text to harmonize or leave it blank to analyze the whole document."
      })
      return
    }

    setHarmonizing(true)
    setActiveTab("tone")
    try {
      const res = await fetch(
        `/api/documents/${initialDocument.id}/tone-harmonizer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textToHarmonize })
        }
      )
      const json = await res.json()
      if (json.isSuccess) {
        setToneSuggestions(json.data)
      } else {
        toast({ title: "Error", description: json.message })
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to fetch tone suggestions."
      })
    } finally {
      setHarmonizing(false)
    }
  }

  const applyToneSuggestion = (orig: string, revised: string) => {
    if (!editor) return

    const documentText = editor.getText()

    // Clean the original text by removing the "- " prefix if present
    const cleanOriginal = orig.startsWith("- ") ? orig.substring(2) : orig

    const index = documentText.indexOf(cleanOriginal)
    if (index === -1) {
      console.warn(
        "[applyToneSuggestion] Text not found in document:",
        cleanOriginal
      )
      return
    }

    const charPositions = charPositionsRef.current
    if (!charPositions || index >= charPositions.length) {
      console.warn(
        "[applyToneSuggestion] CharPositions not available or index out of bounds"
      )
      return
    }

    const from = charPositions[index]
    const to = charPositions[index + cleanOriginal.length - 1] + 1

    try {
      editor.chain().focus().insertContentAt({ from, to }, revised).run()
    } catch (error) {
      console.error("[applyToneSuggestion] Error applying change:", error)
    }
  }

  /* -------------------- Definitions -------------------- */
  const [definitions, setDefinitions] = useState<DefinitionEntry[]>([])
  const [defineAnchor, setDefineAnchor] = useState<{
    x: number
    y: number
    text: string
  } | null>(null)

  /* ------------------ Definition handler ------------------ */
  const handleDefine = async (selection: string) => {
    if (demoMode) {
      promptSignIn("Contextual Definer")
      return
    }

    if (!selection) return
    setIsDefining(true)
    setDefinedTerm(selection)

    try {
      const res = await fetch("/api/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: selection, context: plainText })
      })

      if (res.ok) {
        const { data } = await res.json()
        setDefinition(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsDefining(false)
    }
  }

  const onMouseUp = () => {
    // This is now handled by onSelectionUpdate
  }

  /* ---------------- Selection listener ----------------- */
  useEffect(() => {
    const onMouseUp = () => {
      if (!editor) return
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) {
        setDefineAnchor(null)
        return
      }
      const text = sel.toString().trim()
      if (!text) {
        setDefineAnchor(null)
        return
      }
      const range = sel.getRangeAt(0)
      // Ensure selection is within the editor DOM
      if (!editor.view.dom.contains(range.commonAncestorContainer)) {
        setDefineAnchor(null)
        return
      }
      const rect = range.getBoundingClientRect()
      setDefineAnchor({
        x: rect.right + window.scrollX,
        y: rect.bottom + window.scrollY,
        text
      })
    }
    document.addEventListener("mouseup", onMouseUp)
    return () => {
      document.removeEventListener("mouseup", onMouseUp)
    }
  }, [editor])

  /* ------------------ Find citations ------------------ */
  const handleFindCitations = async () => {
    if (demoMode) {
      promptSignIn("Citation Hunter")
      return
    }
    const wordCount = plainText.split(/\s+/).length
    if (demoMode && wordCount > DEMO_WORD_LIMIT) {
      toast({
        title: "Demo limit reached",
        description: `Citations limited to ${DEMO_WORD_LIMIT} words in demo mode.`
      })
      return
    }

    setFindingCitations(true)
    setActiveTab("citations")
    try {
      const res = await fetch(
        `/api/documents/${initialDocument.id}/citations`,
        { method: "POST" }
      )
      const json = await res.json()
      if (json.isSuccess) {
        setCitations(json.data.citations)
        setCitationKeywords(json.data.keywords)
      } else {
        toast({
          title: json.message || "Citation hunter failed",
          variant: "destructive"
        })
      }
    } catch (e) {
      console.error("[EditorContainer] handleFindCitations", e)
      toast({ title: "Server error", variant: "destructive" })
    } finally {
      setFindingCitations(false)
    }
  }

  /* ------------------ Slide Decker ------------------ */
  const [slidePoints, setSlidePoints] = useState<{ text: string }[]>([])
  const [slideModalOpen, setSlideModalOpen] = useState(false)

  const handleCreateSlideDeck = async () => {
    if (demoMode) {
      promptSignIn("Slide Decker")
      return
    }
    if (!editor || creatingSlide) return
    const minutesStr = prompt(
      "Enter the desired length of your presentation in minutes (max 120):",
      "10"
    )
    if (!minutesStr) return // User cancelled

    const minutes = parseInt(minutesStr, 10)
    if (isNaN(minutes) || minutes <= 0) {
      toast({
        title: "Invalid number",
        description: "Please enter a positive number for the minutes."
      })
      return
    }

    setCreatingSlide(true)
    setActiveTab("slides")
    try {
      const res = await fetch(
        `/api/documents/${initialDocument.id}/slide-deck`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutes })
        }
      )
      const json = await res.json()
      if (json.isSuccess) {
        setSlideDeck(json.data)
        // Refresh history
        const histRes = await fetch(
          `/api/documents/${initialDocument.id}/slide-deck`
        )
        const histJson = await histRes.json()
        if (histJson.isSuccess) {
          setSlideDeckHistory(histJson.data)
        }
      } else {
        toast({ title: "Error", description: json.message })
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to create slide deck."
      })
    } finally {
      setCreatingSlide(false)
    }
  }

  const handleInsertCitation = (citation: CitationEntry) => {
    if (!editor) return
    const { title, authors, journal } = citation
    const formatted = `${authors} (${journal}). ${title}.`
    editor.chain().focus().insertContent(formatted).run()
  }

  const handleRunAssistant = async () => {
    if (demoMode) {
      promptSignIn("Research Assistant")
      return
    }
    const res = await fetch(`/api/research-assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: plainText })
    })
    const json = await res.json()
    if (!json.isSuccess) {
      toast({
        title: "Analysis Failed",
        description: json.message,
        variant: "destructive"
      })
    }
    return json.data
  }

  /* ------------------------------ Render ------------------------------ */
  return (
    <div className="flex size-full">
      {/* Research Sidebar (Left) */}
      <div className="bg-background w-72 border-r">
        <ResearchSidebar
          definition={definition}
          isDefining={isDefining}
          definedTerm={definedTerm}
          citations={citations}
          findingCitations={findingCitations}
          citationKeywords={citationKeywords}
          onGenerateCitations={handleFindCitations}
          generatingCitations={findingCitations}
          onInsertCitation={handleInsertCitation}
          slideDeck={slideDeck}
          slideDeckHistory={slideDeckHistory}
          onCreateSlideDeck={handleCreateSlideDeck}
          creatingSlideDeck={creatingSlide}
          readability={readability}
          stats={stats}
        />
      </div>

      {/* Main Editor Area */}
      <div className="flex-1">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between border-b p-2 px-4">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-1/2 bg-transparent text-lg font-semibold outline-none"
              placeholder="Untitled Document"
            />
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-sm">
                {secondsSinceLastSave < 5
                  ? "Saved just now"
                  : `Last saved ${Math.round(secondsSinceLastSave)}s ago`}
              </p>
              <Button onClick={handleSave} size="sm">
                Save
              </Button>
              <Button onClick={handleDelete} size="sm" variant="destructive">
                Delete
              </Button>
            </div>
          </div>
          <EditorToolbar
            editor={editor}
            maxMode={maxMode}
            onToggleMaxMode={setMaxMode}
            onToneHarmonize={handleToneHarmonize}
            onFindCitations={handleFindCitations}
            findingCitations={findingCitations}
            onCreateSlideDeck={handleCreateSlideDeck}
            creatingSlideDeck={creatingSlide}
          />
          <div
            ref={editorViewRef}
            onScroll={updateCurrentPage}
            className={`paginated-editor-area relative h-full flex-1 p-8 ${
              isNewDocument ? "new-document-highlight" : ""
            }`}
          >
            <EditorContent editor={editor} />
          </div>
          <div className="page-counter">
            Page {currentPage} of {pageCount}
          </div>
        </div>
      </div>

      {/* Writing Suggestion Sidebar (Right) */}
      <div className="bg-background w-72 border-l">
        <WritingSuggestionSidebar
          suggestions={suggestions}
          plainText={plainText}
          onApplySuggestion={applySuggestion}
          onAddToDictionary={handleAddToDictionary}
          toneSuggestions={toneSuggestions}
          onAcceptToneSuggestion={applyToneSuggestion}
          onGenerateTone={handleToneHarmonize}
          generatingTone={isHarmonizing}
        />
      </div>

      {/* Demo Word Count Limiter Modal */}
      <Dialog open={demoBlocked} onOpenChange={setDemoBlocked}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Demo Mode</DialogTitle>
            <DialogDescription>
              This is a demo version with a limited number of words.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild>
              <Link href="/sign-up">Sign Up to Remove Limits</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DemoSignInPrompt
        isOpen={showSignInPrompt}
        onClose={() => setShowSignInPrompt(false)}
        featureName={currentFeature}
      />
    </div>
  )
}
