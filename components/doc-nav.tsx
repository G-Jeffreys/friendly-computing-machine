"use client"

import { getDocumentsAction } from "@/actions/db/documents-actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@clerk/nextjs"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { SelectDocument } from "@/db/schema/documents-schema"

export function DocNav() {
  const { userId } = useAuth()
  const [documents, setDocuments] = useState<SelectDocument[]>([])

  useEffect(() => {
    async function fetchDocuments() {
      if (!userId) return
      const res = await getDocumentsAction(userId)
      if (res.isSuccess) {
        setDocuments(res.data)
      }
    }
    fetchDocuments()
  }, [userId])

  if (!userId) return null

  return (
    <div className={cn("h-full overflow-y-auto p-4")}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Documents</h2>
        <Link href="/documents/new">
          <Button variant="ghost" size="icon" aria-label="New document">
            <PlusCircle className="size-5" />
          </Button>
        </Link>
      </div>

      <ul className="space-y-1">
        {documents.map(doc => (
          <li key={doc.id}>
            <Link
              href={`/documents/${doc.id}`}
              className="hover:bg-accent block truncate rounded px-2 py-1 text-sm"
            >
              {doc.title || "Untitled Document"}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
} 