"use server"

import { getDocumentsAction } from "@/actions/db/documents-actions"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import SignInCTA from "@/app/documents/_components/sign-in-cta"

export default async function DocumentsPage() {
  const { userId } = await auth()
  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <SignInCTA />
      </div>
    )
  }

  const res = await getDocumentsAction(userId)

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Documents</h1>
        <Link href="/documents/new">
          <Button>Create New</Button>
        </Link>
      </div>

      <ul className="space-y-2">
        {res.isSuccess && res.data.length > 0 ? (
          res.data.map(doc => (
            <li key={doc.id} className="hover:bg-muted rounded border p-3">
              <Link href={`/documents/${doc.id}`}>{doc.title}</Link>
            </li>
          ))
        ) : (
          <p>No documents yet. Click "Create New" to start.</p>
        )}
      </ul>
    </div>
  )
}
