"use client"

import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Undo,
  Redo
} from "lucide-react"
import type { Editor as TipTapEditor } from "@tiptap/core"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { memo } from "react"
import { cn } from "@/lib/utils"

interface EditorToolbarProps {
  editor: TipTapEditor | null
  // Feature toggles
  isMaxMode?: boolean
  onToggleMaxMode?: (value: boolean) => void
  onToneHarmonize?: () => void
  onFindCitations?: () => void
  isFindingCitations?: boolean
  onCreateSlideDeck?: () => void
  isCreatingSlideDeck?: boolean

  // Actions
  onSave?: () => void
  onDelete?: () => void
  isSaving?: boolean
}

function EditorToolbar({
  editor,
  isMaxMode = false,
  onToggleMaxMode,
  onToneHarmonize,
  onFindCitations,
  isFindingCitations = false,
  onCreateSlideDeck,
  isCreatingSlideDeck = false,
  onSave,
  onDelete,
  isSaving = false
}: EditorToolbarProps) {
  if (!editor) return null

  const handleLink = () => {
    const url = window.prompt("Enter URL")
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    }
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center justify-between gap-2 rounded-lg border bg-white p-2 shadow-sm"
      )}
    >
      <div className="flex items-center gap-2">
        {/* Formatting Group */}
        <ToggleGroup type="multiple" aria-label="Text formatting">
          <ToggleGroupItem
            value="bold"
            aria-label="Toggle bold"
            data-state={editor.isActive("bold") ? "on" : "off"}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="italic"
            aria-label="Toggle italic"
            data-state={editor.isActive("italic") ? "on" : "off"}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="underline"
            aria-label="Toggle underline"
            data-state={editor.isActive("underline") ? "on" : "off"}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Separator orientation="vertical" className="h-6" />
        <ToggleGroup type="multiple" aria-label="List formatting">
          <ToggleGroupItem
            value="bulletList"
            aria-label="Toggle bullet list"
            data-state={editor.isActive("bulletList") ? "on" : "off"}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="orderedList"
            aria-label="Toggle ordered list"
            data-state={editor.isActive("orderedList") ? "on" : "off"}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="icon" onClick={handleLink}>
          <Link className="size-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="size-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Feature Toggles Group */}
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
          <Button
            size="sm"
            variant={isMaxMode ? "secondary" : "ghost"}
            className="rounded-full"
            onClick={() => onToggleMaxMode?.(!isMaxMode)}
          >
            Max
          </Button>
          {/* Tone, Cite, Slide buttons removed – now generated via sidebar accordions */}
        </div>
      </div>

      {/* Actions Group */}
      <div className="flex items-center gap-2">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  )
}

export default memo(EditorToolbar) 