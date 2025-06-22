"use client"

import { useState } from "react"
import OverlayModal from "@/components/ui/overlay-modal"

export default function DemoSidebar() {
  const [open, setOpen] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(true)
  }

  const items = [
    { id: 1, title: "Sample Doc 1" },
    { id: 2, title: "Sample Doc 2" },
    { id: 3, title: "Sample Doc 3" }
  ]

  return (
    <>
      <aside className="bg-sidebar hidden w-[240px] shrink-0 overflow-y-auto border-r px-4 py-6 md:block">
        <h2 className="mb-4 text-lg font-semibold">Documents</h2>

        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id}>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a
                href="#"
                onClick={handleClick}
                className="hover:bg-accent block truncate rounded px-2 py-1 text-sm"
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      {/* Reuse overlay modal for sign-up prompt */}
      <OverlayModal open={open} />
    </>
  )
}
