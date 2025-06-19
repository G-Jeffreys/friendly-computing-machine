"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Header from "@/components/header"
import Link from "next/link"

interface DictWord {
  id: string
  word: string
  languageCode: string
  createdAt: string
}

export default function DictionaryPage() {
  const [words, setWords] = useState<DictWord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWords = async () => {
    try {
      const res = await fetch("/api/user-dictionary?lang=en")
      const json = await res.json()
      if (json.data) setWords(json.data)
      else toast.error(json.message || "Failed to load dictionary")
    } catch (e) {
      console.error("[DictionaryPage] fetch error", e)
      toast.error("Server error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWords()
  }, [])

  const handleDelete = async (word: string) => {
    if (!confirm(`Remove "${word}" from dictionary?`)) return
    try {
      const res = await fetch("/api/user-dictionary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word })
      })
      const json = await res.json()
      if (res.ok) {
        toast.success(json.message)
        setWords(prev => prev.filter(w => w.word !== word))
      } else {
        toast.error(json.message || "Failed to delete")
      }
    } catch (e) {
      console.error("[DictionaryPage] delete error", e)
      toast.error("Server error")
    }
  }

  return (
    <>
      <Header />
      <div className="mx-auto max-w-lg p-6">
        <Link
          href="/documents"
          className="mb-4 inline-block text-blue-600 hover:underline"
        >
          ← Back to Documents
        </Link>
        <h1 className="mb-4 text-2xl font-semibold">My Dictionary</h1>
        {loading ? (
          <p>Loading…</p>
        ) : words.length === 0 ? (
          <p className="text-muted-foreground">No words added yet.</p>
        ) : (
          <ul className="space-y-2">
            {words.map(w => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded border p-2"
              >
                <span>{w.word}</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(w.word)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
