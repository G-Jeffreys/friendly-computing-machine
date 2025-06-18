"use client"

import { SelectDocument } from "@/db/schema/documents-schema"
import {
  useState,
  useTransition,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Suggestion } from "@/lib/hooks/use-spell-grammar"
import { useAnalyser } from "@/lib/hooks/use-analyser"
import { useRouter } from "next/navigation"
import { debounce } from "@/lib/utils/debounce"
import { DEMO_WORD_LIMIT, DEMO_TIME_LIMIT_MS } from "@/lib/demo-constants"
import OverlayModal from "@/components/ui/overlay-modal"
import { useAutosave } from "@/lib/hooks/use-autosave"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import UnderlineExt from "@tiptap/extension-underline"
import LinkExt from "@tiptap/extension-link"
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikeIcon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Link as LinkIcon
} from "lucide-react"
import { Editor as TipTapEditor, Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

interface DocumentEditorProps {
  initialDocument: SelectDocument
  /** When true the component runs in anonymous demo mode and enforces word/time limits. */
  demoMode?: boolean
}

export default function DocumentEditor({
  initialDocument,
  demoMode = false
}: DocumentEditorProps) {
  const [title, setTitle] = useState(initialDocument.title)
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

  /* ---------------------------------------------------------------------- */
  /* Demo-mode state: enforce 100-word / 10-second blocker for anon users   */
  /* ---------------------------------------------------------------------- */
  const [demoBlocked, setDemoBlocked] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Keep track of the latest updatedAt value returned by the server so both
  // manual saves and autosave share a single optimistic-concurrency token.
  const [updatedAtToken, setUpdatedAtToken] = useState(
    typeof initialDocument.updatedAt === "string"
      ? initialDocument.updatedAt
      : new Date(initialDocument.updatedAt).toISOString()
  )

  // Convert legacy plain-text documents to simple <p> blocks so TipTap can load them.
  const initialHtml = initialDocument.content.includes("<")
    ? initialDocument.content
    : `<p>${initialDocument.content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`

  // content = HTML string managed by TipTap
  const [content, setContent] = useState(initialHtml)
  const [plainText, setPlainText] = useState<string>("")

  /* ---------------------------------------------------------------------- */
  /* Autosave hook – saves every 30 s when content/title change             */
  /* ---------------------------------------------------------------------- */
  const { secondsSinceLastSave, markSaved } = useAutosave({
    title,
    content,
    documentId: initialDocument.id,
    demoMode,
    updatedAt: updatedAtToken
  })

  // --------------------------------------------------------------------
  // Inline suggestion highlight – TipTap Decoration plugin
  // --------------------------------------------------------------------

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
        const to = charPositions[endIndex] + 1 // make inclusive
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

  // Instantiate TipTap editor. We memoise it so it isn't recreated on every render.
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

      // ProseMirror represents each paragraph as a separate node without
      // storing the newline character itself. By **removing** (not replacing)
      // newline characters before sending text to LanguageTool we ensure the
      // offsets it returns line up 1-to-1 with the character positions that
      // `buildCharPositions` derives from the TipTap document.
      const cleanedText = text.replace(/\n/g, "")

      // keep plain text state (original, still with newlines) for UI snippets
      setPlainText(text)

      // 1. Keep React state in sync so autosave uses latest HTML.
      setContent(html)

      // 2. Demo limiter – replicate logic we used with textarea.
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

      // 3. Trigger analysis (debounced).
      debouncedRunChecks(cleanedText)
    }
  })

  // Debounced wrapper around the expensive analysis routine. Created once per
  // component instance so the underlying timer survives re-renders.
  const debouncedRunChecks = useRef(
    debounce((txt: string) => {
      // eslint-disable-next-line no-console
      console.log("[DocumentEditor] debouncedRunChecks executing")
      runChecks(txt)
    }, 750)
  ).current

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;")

  const runChecks = async (input: string) => {
    const res = await analyse(input)
    const map = new Map(res.suggestions.map(s => [s.id, s]))
    const unique = Array.from(map.values())
    setSuggestions(unique)
    suggestionsRef.current = unique

    // trigger decoration rebuild
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
            updatedAt: updatedAtToken
          })
        })
        if (res.status === 409) {
          const conflict = await res.json()
          if (typeof conflict.updatedAt === "string") {
            setUpdatedAtToken(conflict.updatedAt)
            markSaved(conflict.updatedAt)
          }
          console.warn("[DocumentEditor] save conflict – ignoring pop-up")
        } else if (!res.ok) {
          throw new Error("Failed to save")
        } else {
          const data = await res.json()
          markSaved(data.updatedAt)
          setUpdatedAtToken(data.updatedAt)
          toast({ title: "Document saved" })
          // Refresh layouts (sidebar) so any title change is reflected instantly.
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
        // Force a revalidation of server components on the client to make
        // sure the sidebar and list reflect the removed document.
        router.refresh()
      } catch (error) {
        console.error(error)
        toast({ title: "Delete failed", variant: "destructive" })
      }
    })
  }

  // Run checks once after component mounts to analyze saved document
  useEffect(() => {
    if (editor) {
      const initialText = editor.getText()
      setPlainText(initialText)
      runChecks(initialText.replace(/\n/g, ""))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  /* -------------------------- Keyboard Short-cuts -------------------------- */
  // Ctrl/Cmd + S → save;  Ctrl/Cmd + Enter → run analysis immediately
  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPod|iPad/i.test(navigator.platform)
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey

      if (!ctrlOrCmd) return

      // Prevent the browser's default Save-page dialog.
      if (e.key === "s" || e.key === "S") {
        e.preventDefault()
        handleSave()
      }

      if (e.key === "Enter") {
        e.preventDefault()
        // Run checks immediately on current plain text.
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

  // -------------------------- Apply Suggestion --------------------------
  const applySuggestion = (sg: Suggestion, replacement: string) => {
    if (!editor) return
    const charPositions = buildCharPositions(editor.state.doc)
    const from = charPositions[sg.offset]
    const to = charPositions[sg.offset + sg.length - 1] + 1
    if (!from || !to) return

    editor.chain().focus().insertContentAt({ from, to }, replacement).run()
  }

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
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full border-b text-2xl font-semibold focus:outline-none"
      />

      <div className="flex gap-6">
        {/* Editor with highlight overlay */}
        <div className="relative flex-1">
          {/* Toolbar – fixed inside the editor container */}
          <div className="bg-background sticky top-0 z-10 flex gap-1 border-b p-2">
            <Button
              size="icon"
              variant={editor?.isActive("bold") ? "default" : "secondary"}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <BoldIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={editor?.isActive("italic") ? "default" : "secondary"}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <ItalicIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={editor?.isActive("underline") ? "default" : "secondary"}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={editor?.isActive("strike") ? "default" : "secondary"}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
              <StrikeIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={editor?.isActive("bulletList") ? "default" : "secondary"}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <ListIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={
                editor?.isActive("orderedList") ? "default" : "secondary"
              }
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrderedIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => {
                const url = prompt("Enter URL")
                if (url) {
                  editor
                    ?.chain()
                    .focus()
                    .extendMarkRange("link")
                    .setLink({ href: url })
                    .run()
                }
              }}
            >
              <LinkIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <UndoIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <RedoIcon className="size-4" />
            </Button>
          </div>

          {/* TipTap editor content */}
          <EditorContent
            editor={editor}
            className="prose dark:prose-invert max-h-[60vh] min-h-[50vh] overflow-auto p-4 focus:outline-none"
          />
        </div>

        {/* Suggestions */}
        <aside
          className="max-h-[60vh] w-60 space-y-3 overflow-auto rounded border p-3"
          aria-label="Suggestions"
        >
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
                    {plainText.substring(sg.offset, sg.offset + sg.length)}
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

        {/* Autosave status */}
        {!demoMode && (
          <p className="text-muted-foreground text-sm sm:ml-4">
            {secondsSinceLastSave} seconds since last autosave
          </p>
        )}
      </div>

      {/* Demo overlay – blocks interaction after word/time limit */}
      {demoMode && <OverlayModal open={demoBlocked} />}
    </div>
  )
}
