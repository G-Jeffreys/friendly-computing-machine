"use client"

import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import clsx from "clsx"

interface OverlayModalProps {
  /** Controls visibility */
  open: boolean
  /** Optional: extra Tailwind classes */
  className?: string
}

export default function OverlayModal({ open, className }: OverlayModalProps) {
  if (!open) return null

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4",
        className
      )}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-background w-full max-w-sm rounded-lg p-8 text-center shadow-lg">
        <h2 className="mb-6 text-xl font-semibold">
          Create a free account to continue editing
        </h2>

        <div className="flex flex-col gap-3">
          <SignInButton mode="modal">
            <Button className="w-full">Sign in</Button>
          </SignInButton>

          <SignUpButton mode="modal">
            <Button variant="secondary" className="w-full">
              Sign up
            </Button>
          </SignUpButton>
        </div>
      </div>
    </div>
  )
}
