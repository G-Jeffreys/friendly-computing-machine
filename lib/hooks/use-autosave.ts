"use client"

// New autosave hook – saves the current document every N milliseconds (default 30 000).
// The hook is completely disabled when `demoMode` is true. It also skips the save
// when neither `title` nor `content` changed since the previous successful save.
//
// The implementation follows the premortem recommendations:
// 1. Debounce / concurrency – only one autosave request can run at a time.
// 2. Optimistic-concurrency control – it includes the last known `updatedAt` in the
//    PATCH request; the server will return HTTP 409 if the value is stale.
// 3. Verbose logging – lots of console logs so we can trace behaviour end-to-end.

import { useEffect, useRef, useState } from "react"

interface UseAutosaveParams {
  title: string
  content: string
  documentId: string
  /** Disable autosave completely (used for demo / anonymous sessions). */
  demoMode: boolean
  /** ISO string of the document row's current updatedAt value. */
  updatedAt: string
  /** Interval in milliseconds – default 30 000 (30 s). */
  intervalMs?: number
}

interface UseAutosaveResult {
  /** Seconds elapsed since the last successful autosave (counts up to interval). */
  secondsSinceLastSave: number
  /** If true a save request is currently in-flight. */
  isSaving: boolean
  /** Last error message (if any) returned by the server. */
  error: string | null
  /** Manually mark the document as saved – used after an explicit user-triggered save. */
  markSaved: (serverUpdatedAt: string) => void
}

export function useAutosave({
  title,
  content,
  documentId,
  demoMode,
  updatedAt,
  intervalMs = 30_000
}: UseAutosaveParams): UseAutosaveResult {
  /* ---------------------------------------------------------------------- */
  /* Refs – always point to the latest mutable values without re-rendering. */
  /* ---------------------------------------------------------------------- */

  const lastSavedTitleRef = useRef(title)
  const lastSavedContentRef = useRef(content)
  const updatedAtRef = useRef<string>(updatedAt)
  const isSavingRef = useRef(false)
  const errorRef = useRef<string | null>(null)
  const secondsSinceSaveRef = useRef(0)
  const isDirtyRef = useRef(false)

  /* ---------------------------------------------------------------------- */
  /* State exposed to the component.                                        */
  /* ---------------------------------------------------------------------- */

  const [secondsSinceLastSave, setSecondsSinceLastSave] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ---------------------------------------------------------------------- */
  /* Track changes – whenever title/content change mark the doc as dirty.   */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (
      title !== lastSavedTitleRef.current ||
      content !== lastSavedContentRef.current
    ) {
      isDirtyRef.current = true
    }
    // keep live refs in sync so the interval callback reads the latest values.
    lastSavedTitleRef.current = title
    lastSavedContentRef.current = content
  }, [title, content])

  /* ---------------------------------------------------------------------- */
  /* Secondary 1-second tick – updates the counter we display in the UI.    */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const tick = setInterval(() => {
      secondsSinceSaveRef.current += 1
      setSecondsSinceLastSave(secondsSinceSaveRef.current)
    }, 1_000)

    return () => clearInterval(tick)
  }, [])

  /* ---------------------------------------------------------------------- */
  /* Main autosave interval – fires every `intervalMs`.                      */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (demoMode) {
      console.log("[Autosave] demoMode = true – autosave disabled")
      return
    }

    const iv = setInterval(() => {
      // Skip when already saving or nothing changed.
      if (isSavingRef.current) return
      if (!isDirtyRef.current) return

      console.log("[Autosave] initiating save – dirty =", isDirtyRef.current)
      void save()
    }, intervalMs)

    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, intervalMs, documentId])

  /* ---------------------------------------------------------------------- */
  /* Save routine. Wrapped in a stable ref so the interval can call it.     */
  /* ---------------------------------------------------------------------- */

  const save = async () => {
    isSavingRef.current = true
    setIsSaving(true)
    setError(null)

    console.log("[Autosave] PATCH /api/documents/" + documentId)

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lastSavedTitleRef.current,
          content: lastSavedContentRef.current,
          updatedAt: updatedAtRef.current // optimistic-concurrency token
        })
      })

      if (res.status === 409) {
        const conflict = await res.json()
        console.warn(
          "[Autosave] Conflict – updating timestamp",
          conflict.updatedAt
        )
        if (typeof conflict.updatedAt === "string") {
          updatedAtRef.current = conflict.updatedAt
          isDirtyRef.current = false
          secondsSinceSaveRef.current = 0
          setSecondsSinceLastSave(0)
        }
        return
      }

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(`HTTP ${res.status}: ${msg}`)
      }

      const data: { updatedAt: string } = await res.json()

      updatedAtRef.current = data.updatedAt
      isDirtyRef.current = false
      secondsSinceSaveRef.current = 0
      setSecondsSinceLastSave(0)
    } catch (err: any) {
      console.error("[Autosave] error", err)
      const msg = err instanceof Error ? err.message : String(err)
      errorRef.current = msg
      setError(msg)
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Public API                                                             */
  /* ---------------------------------------------------------------------- */

  const markSaved = (serverUpdatedAt: string) => {
    updatedAtRef.current = serverUpdatedAt
    secondsSinceSaveRef.current = 0
    setSecondsSinceLastSave(0)
    isDirtyRef.current = false
  }

  return {
    secondsSinceLastSave,
    isSaving,
    error,
    markSaved
  }
}
