"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface SlideRendererProps {
  markdown: string
}

/**
 * SlideRenderer – splits a markdown string into slides using level-1 headings
 * ("# Heading") as delimiters. Each resulting chunk is rendered inside its own
 * card-like container.
 */
export const SlideRenderer: React.FC<SlideRendererProps> = ({ markdown }) => {
  // Split on level-1 headings while keeping the marker.
  const slides = React.useMemo(() => {
    return markdown
      .split(/^#\s+/gm)
      .filter(Boolean)
      .map(s => "# " + s.trim())
  }, [markdown])

  return (
    <div className="flex flex-col gap-8 p-4">
      {slides.map((slide, i) => (
        <div
          key={i}
          className="rounded-xl border bg-white p-6 shadow dark:bg-slate-900"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{slide}</ReactMarkdown>
        </div>
      ))}
    </div>
  )
} 