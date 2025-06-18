"use client"

import { Button } from "@/components/ui/button"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import Link from "next/link"

export default function SignInCTA() {
  return (
    <div className="flex flex-col items-center space-y-4">
      <p className="text-lg font-medium">
        Please sign in to view your documents.
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/demo">
          <Button variant="ghost">Try Demo</Button>
        </Link>

        <SignInButton mode="modal">
          <Button variant="outline">Sign In</Button>
        </SignInButton>

        <SignUpButton mode="modal">
          <Button>Sign Up</Button>
        </SignUpButton>
      </div>
    </div>
  )
}
