"use client"

/*
<ai_context>
Custom not-found page that acts as a global 404 fallback for the App Router.
</ai_context>
*/

import Link from "next/link"
import { Button } from "@/components/ui/button"

// Log in the browser so we can see that the fallback rendered.
console.info("[404] Rendering global not-found page")

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-5xl font-bold">404 – Page not found</h1>
      <p className="max-w-md text-balance text-lg text-muted-foreground">
        Oops! The page you&rsquo;re looking for doesn&rsquo;t exist. It may have been moved or removed.
      </p>
      <Link href="/">
        <Button className="text-lg">Return home</Button>
      </Link>
    </main>
  )
} 