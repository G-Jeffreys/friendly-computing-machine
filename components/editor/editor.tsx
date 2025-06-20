"use client"

import { EditorContent } from "@tiptap/react"
import type { Editor as TipTapEditor } from "@tiptap/core"
import { cn } from "@/lib/utils"

interface DocumentEditorProps {
  editor: TipTapEditor | null
}

export function DocumentEditor({ editor }: DocumentEditorProps) {
  return (
    <div
      className={cn(
        "prose prose-indigo mx-auto h-full max-w-4xl rounded-2xl bg-white p-8 shadow-md"
      )}
    >
      <EditorContent editor={editor} />
    </div>
  )
} 