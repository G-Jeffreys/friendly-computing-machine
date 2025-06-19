"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
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
import type { Editor as TipTapEditor } from "@tiptap/core"

interface EditorToolbarProps {
  /** The active TipTap editor instance. */
  editor: TipTapEditor | null
  /** When true LLM-enhanced "Max Mode" is enabled for this document */
  maxMode?: boolean
  /** Callback to toggle Max Mode */
  onToggleMaxMode?: () => void
  /** Callback to run Tone Harmonizer */
  onToneHarmonize?: () => void
}

/**
 * EditorToolbar – isolated toolbar containing formatting controls for the
 * TipTap rich-text editor. Extracted from the original monolithic
 * `DocumentEditor` so it can be reused, tested, and reasoned about
 * independently. All controls proxy their actions through the provided
 * `editor` instance.
 */
function EditorToolbar({
  editor,
  maxMode = false,
  onToggleMaxMode,
  onToneHarmonize
}: EditorToolbarProps) {
  console.log(
    "[EditorToolbar] render – editor instance present:",
    Boolean(editor)
  )

  // Early-return while the dynamic editor bundle is loading on the client.
  if (!editor) return null

  // Shared props for each button to avoid repetition.
  const commonBtnProps = { size: "icon" as const }

  return (
    <div className="bg-background sticky top-0 z-10 flex gap-1 border-b p-2">
      <Button
        {...commonBtnProps}
        variant={editor.isActive("bold") ? "default" : "secondary"}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon className="size-4" />
      </Button>
      <Button
        {...commonBtnProps}
        variant={editor.isActive("italic") ? "default" : "secondary"}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon className="size-4" />
      </Button>
      <Button
        {...commonBtnProps}
        variant={editor.isActive("underline") ? "default" : "secondary"}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-4" />
      </Button>
      <Button
        {...commonBtnProps}
        variant={editor.isActive("strike") ? "default" : "secondary"}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <StrikeIcon className="size-4" />
      </Button>
      <Button
        {...commonBtnProps}
        variant={editor.isActive("bulletList") ? "default" : "secondary"}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon className="size-4" />
      </Button>
      <Button
        {...commonBtnProps}
        variant={editor.isActive("orderedList") ? "default" : "secondary"}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrderedIcon className="size-4" />
      </Button>
      <Button
        {...commonBtnProps}
        variant="secondary"
        onClick={() => {
          const url = prompt("Enter URL")
          if (url) {
            editor
              .chain()
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
        {...commonBtnProps}
        variant="secondary"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <UndoIcon className="size-4" />
      </Button>
      <Button
        {...commonBtnProps}
        variant="secondary"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <RedoIcon className="size-4" />
      </Button>
      <div className="bg-border mx-2 h-6 w-px" />
      {typeof onToneHarmonize === "function" && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onToneHarmonize}
          title="Run Tone Harmonizer"
        >
          Tone
        </Button>
      )}
    </div>
  )
}

// `memo` prevents re-renders when unrelated parent state changes.
export default memo(EditorToolbar)
