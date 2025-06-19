"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export default function LegalDisclaimerBanner({
  className
}: {
  className?: string
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem("legal_disclaimer_accepted") === "1"
    if (!accepted) setVisible(true)
  }, [])

  if (!visible) return null

  const accept = () => {
    localStorage.setItem("legal_disclaimer_accepted", "1")
    setVisible(false)
    if (typeof window !== "undefined" && (window as any).posthog?.capture) {
      ;(window as any).posthog.capture("legal.disclaimer.accepted")
    }
  }

  return (
    <div
      className={cn(
        "bg-background fixed bottom-4 right-4 z-50 w-full max-w-md rounded border p-4 shadow-lg",
        className
      )}
    >
      <p className="mb-2 text-sm">
        We transmit your text to third-party LLM providers (OpenAI) to power AI
        features. Please avoid uploading sensitive or personal data.
      </p>
      <button
        onClick={accept}
        className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
      >
        <X className="size-3" />
        Got it
      </button>
    </div>
  )
}
