"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"

type DocumentWithSlides = {
  id: string
  title: string
  slideDecks: {
    id: string
    createdAt: string | Date
    outline: { text: string }[]
  }[]
}

// Loading skeleton component for better UX
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

export default function SlidesPage() {
  const { user } = useUser()
  const [documents, setDocuments] = useState<DocumentWithSlides[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDocuments = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        setError(null)
        
        // Fetch all documents with their slide decks in a single request
        const response = await fetch("/api/documents?include=slideDecks")
        if (!response.ok) {
          throw new Error('Failed to fetch documents')
        }
        
        const data = await response.json()
        setDocuments(data)
      } catch (error) {
        console.error("[SlidesPage] Failed to load documents:", error)
        setError("Failed to load documents. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    loadDocuments()
  }, [user?.id])

  const handleDeleteSlideDeck = async (documentId: string, slideDeckId: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/slide-deck/${slideDeckId}`, {
        method: "DELETE"
      })

      if (res.ok) {
        // Update local state
        setDocuments(docs =>
          docs.map(doc => {
            if (doc.id === documentId) {
              return {
                ...doc,
                slideDecks: doc.slideDecks.filter(deck => deck.id !== slideDeckId)
              }
            }
            return doc
          })
        )
      } else {
        throw new Error('Failed to delete slide deck')
      }
    } catch (error) {
      console.error("[SlidesPage] Failed to delete slide deck:", error)
      setError("Failed to delete slide deck. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <LoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-3xl font-bold">Slide Decks</h1>

      {documents.length === 0 ? (
        <p className="text-muted-foreground">No documents with slide decks yet.</p>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {documents.map(doc => (
            <AccordionItem key={doc.id} value={doc.id}>
              <AccordionTrigger className="text-xl">
                {doc.title}
                <span className="ml-2 text-sm text-muted-foreground">
                  ({doc.slideDecks.length} deck{doc.slideDecks.length !== 1 ? "s" : ""})
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-4">
                  {doc.slideDecks.length === 0 ? (
                    <p className="text-muted-foreground">No slide decks yet.</p>
                  ) : (
                    doc.slideDecks.map(deck => (
                      <div
                        key={deck.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <h3 className="font-medium">
                            {`Slides (${new Date(deck.createdAt).toLocaleDateString()})`}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {deck.outline.length} slides
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/slides/${deck.id}`}>
                            <Button variant="outline">View</Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Slide Deck</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this slide deck? This action
                                  cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteSlideDeck(doc.id, deck.id)
                                  }
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
} 