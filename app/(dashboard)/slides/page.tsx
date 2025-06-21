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

type DocumentWithSlides = {
  id: string
  title: string
  slideDecks: {
    id: string
    createdAt: string | Date
    outline: { text: string }[]
  }[]
}

export default function SlidesPage() {
  const { user } = useUser()
  const [documents, setDocuments] = useState<DocumentWithSlides[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDocuments = async () => {
      if (!user?.id) return

      try {
        // Fetch all documents for the user
        const docs = await fetch("/api/documents").then(res => res.json())
        
        // For each document, fetch its slide decks
        const docsWithSlides = await Promise.all(
          docs.map(async (doc: any) => {
            const res = await fetch(`/api/documents/${doc.id}/slide-deck`)
            const { data: slideDecks } = await res.json()
            return {
              ...doc,
              slideDecks: slideDecks || []
            }
          })
        )

        setDocuments(docsWithSlides)
      } catch (error) {
        console.error("[SlidesPage] Failed to load documents:", error)
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
      }
    } catch (error) {
      console.error("[SlidesPage] Failed to delete slide deck:", error)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-3xl font-bold">Slide Decks</h1>

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
    </div>
  )
} 