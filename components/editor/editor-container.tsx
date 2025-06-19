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

// Extracted UI components
import EditorToolbar from "./editor-toolbar"
import SuggestionSidebar from "./suggestion-sidebar"

interface EditorContainerProps {
  initialDocument: SelectDocument
  /** When true the component runs in anonymous demo mode and enforces word/time limits. */
  demoMode?: boolean
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
  const [title, setTitle] = useState(initialDocument.title)
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

  /* ---------------------------- Autosave logic ---------------------------- */
  const { secondsSinceLastSave, markSaved } = useAutosave({
    title,
    content,
    maxMode,
    documentId: initialDocument.id,
    demoMode,
    updatedAt: updatedAtToken
  })

  /* ------------------ Suggestion highlight Decoration plugin -------------- */
  const suggestionsRef = useRef<Suggestion[]>([])
  const decorationKey = useMemo(
    () => new PluginKey("spellGrammarHighlight"),
    []
  )

  const buildCharPositions = (doc: any) => {
    const arr: number[] = []
    doc.descendants((node: any, pos: number) => {
      if (node.isText) {
        for (let i = 0; i < node.text.length; i++) {
          arr.push(pos + i)
        }
      }
    })
    return arr
  }

  const createSuggestionPlugin = useCallback(() => {
    const buildDecorations = (doc: any) => {
      const decos: any[] = []
      const charPositions = buildCharPositions(doc)
      const colorClass = (t: Suggestion["type"]) =>
        t === "spell"
          ? "text-red-600 underline decoration-red-600"
          : t === "grammar"
            ? "text-blue-600 underline decoration-blue-600"
            : "text-purple-600 underline decoration-purple-600"

      suggestionsRef.current.forEach(sg => {
        const startIndex = sg.offset
        const endIndex = sg.offset + sg.length - 1
        const from = charPositions[startIndex]
        const to = charPositions[endIndex] + 1 // inclusive
        if (from && to) {
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
          if (tr.docChanged || tr.getMeta(decorationKey)) {
            return buildDecorations(tr.doc)
          }
          return old
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
    content: initialHtml,
    onUpdate: ({ editor }: { editor: TipTapEditor }) => {
      const html = editor.getHTML()
      const text = editor.getText()

      // ProseMirror stores paragraphs as nodes without the newline character
      const cleanedText = text.replace(/\n/g, "")

      setPlainText(text)
      setContent(html)

      /* -------- Demo mode word / time limiter -------- */
      if (demoMode) {
        const wordCount = cleanedText.trim().split(/\s+/).filter(Boolean).length

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
      debouncedRunChecks(cleanedText)
    }
  })

  /* ------------------- Debounced analysis helper ------------------ */
  const debouncedRunChecks = useRef(
    debounce((txt: string) => {
      // eslint-disable-next-line no-console
      console.log("[EditorContainer] debouncedRunChecks executing")
      runChecks(txt)
    }, 750)
  ).current

  /* ------------------------------ Analysis ------------------------------ */
  const runChecks = async (input: string) => {
    const res = await analyse(input)

    // Filter spell suggestions using dictionary.
    const filteredSuggestions = res.suggestions.filter(sg => {
      if (sg.type !== "spell") return true
      const word = input
        .substring(sg.offset, sg.offset + sg.length)
        .toLowerCase()
      return !dictionaryRef.current.has(word)
    })

    const map = new Map(filteredSuggestions.map(s => [s.id, s]))
    const unique = Array.from(map.values())
    setSuggestions(unique)
    suggestionsRef.current = unique

    // rebuild decorations
    if (editor) {
      const tr = editor.state.tr
      tr.setMeta(decorationKey, true)
      editor.view.dispatch(tr)
    }

    setReadability(res.score)
    setStats({
      words: res.words,
      sentences: res.sentences,
      avgWordLength: res.avgWordLength,
      readingTimeMinutes: res.readingTimeMinutes
    })
  }

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
        const cleanNow = (editor?.getText() || "").replace(/\n/g, "")
        runChecks(cleanNow)
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
    const charPositions = buildCharPositions(editor.state.doc)
    const from = charPositions[sg.offset]
    const to = charPositions[sg.offset + sg.length - 1] + 1
    if (!from || !to) return

    editor.chain().focus().insertContentAt({ from, to }, replacement).run()
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

      // Re-run checks so the newly added word disappears from suggestions.
      runChecks(plainText.replace(/\n/g, ""))
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
      runChecks(initialText.replace(/\n/g, ""))
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

  /* ------------------------------ Render ------------------------------ */
  return (
    <div className="space-y-4">
      {!demoMode && (
        <div>
          <Link
            href="/documents"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back to Documents
          </Link>
        </div>
      )}

      {/* Title input */}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full border-b text-2xl font-semibold focus:outline-none"
      />

      <div className="flex gap-6">
        {/* Rich text editor */}
        <div className="relative flex-1">
          {/* Toolbar */}
          <EditorToolbar
            editor={editor}
            maxMode={maxMode}
            onToggleMaxMode={() => setMaxMode(prev => !prev)}
          />

          {/* Editable content */}
          <EditorContent
            editor={editor}
            className="prose dark:prose-invert max-h-[60vh] min-h-[50vh] overflow-auto p-4 focus:outline-none"
          />
        </div>

        {/* Suggestions */}
        <SuggestionSidebar
          suggestions={suggestions}
          plainText={plainText}
          readability={readability}
          stats={stats}
          onApplySuggestion={applySuggestion}
          onAddToDictionary={handleAddToDictionary}
        />
      </div>

      {/* Save / Delete + Autosave timer */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isPending}
            variant="destructive"
          >
            {isPending ? "Please wait..." : "Delete"}
          </Button>
        </div>

        {!demoMode && (
          <p className="text-muted-foreground text-sm sm:ml-4">
            {secondsSinceLastSave} seconds since last autosave
          </p>
        )}
      </div>

      {/* Demo overlay */}
      {demoMode && <OverlayModal open={demoBlocked} />}
    </div>
  )
}
