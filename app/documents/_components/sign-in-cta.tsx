"use client"

import { Button } from "@/components/ui/button"
import { SignInButton, SignUpButton } from "@clerk/nextjs"

export default function SignInCTA() {
  return (
    <div className="flex flex-col items-center space-y-4">
      <p className="text-lg font-medium">
        Please sign in to view your documents.
      </p>

      <div className="flex space-x-4">
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
