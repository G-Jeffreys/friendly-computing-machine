// No directive: this file is already a Server Component by default.

import { getDocumentsAction } from "@/actions/db/documents-actions"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * DocumentsSidebar — server component
 *
 * Fetches the current user's documents server-side and renders a simple
 * navigation sidebar. Hidden on small screens (shows from the `md` breakpoint
 * upwards) to keep mobile UI uncluttered.  The layout component decides where
 * to place this in the flex row.
 */
export default async function DocumentsSidebar() {
  // Get the current user id.  If the user isn't signed-in we render nothing —
  // the page will already redirect them to sign-in or show its own CTA.
  const { userId } = await auth()
  if (!userId) return null

  const res = await getDocumentsAction(userId)
  if (!res.isSuccess) return null

  return (
    <aside
      className={cn(
        "bg-sidebar hidden w-60 shrink-0 overflow-y-auto border-r px-4 py-6 md:block"
      )}
    >
      <h2 className="mb-4 text-lg font-semibold">Documents</h2>

      <ul className="space-y-2">
        {res.data.map(doc => (
          <li key={doc.id}>
            <Link
              href={`/documents/${doc.id}`}
              className="hover:bg-accent block truncate rounded px-2 py-1 text-sm"
            >
              {doc.title}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export const dynamic = "force-dynamic"
