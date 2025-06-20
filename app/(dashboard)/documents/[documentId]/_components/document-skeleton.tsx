"use client"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * DocumentSkeleton – lightweight placeholder shown while the heavy
 * `DocumentEditor` bundle is lazy-loaded on the client.
 * Very important for perceived performance during the initial load.
 */
export default function DocumentSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading document editor">
      {/* Title placeholder */}
      <Skeleton className="h-8 w-1/2" />

      {/* Toolbar skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="size-8" />
        ))}
      </div>

      {/* Editor area (text blocks) */}
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )
}
