/*
<ai_context>
This client page provides the signup form from Clerk.
</ai_context>
*/

"use client"

import { SignUp } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "next-themes"
import Link from "next/link"

export default function SignUpPage() {
  const { theme } = useTheme()

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <SignUp
        forceRedirectUrl="/documents"
        appearance={{ baseTheme: theme === "dark" ? dark : undefined }}
      />

      {/* Demo try button */}
      <div className="text-center">
        <Link href="/demo" className="text-blue-600 hover:underline">
          Or try the editor in demo mode
        </Link>
      </div>
    </div>
  )
}
