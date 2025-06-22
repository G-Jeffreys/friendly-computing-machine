import { SlideRenderer } from "@/components/SlideRenderer"
import { db } from "@/db/db"
import { slideDecksTable, documentsTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function SlidePage({
  params
}: {
  params: Promise<{ slideId: string }>
}) {
  const { slideId } = await params

  // Join with documents table to get document title
  const [deck] = await db
    .select({
      id: slideDecksTable.id,
      content: slideDecksTable.content,
      minutes: slideDecksTable.minutes,
      documentTitle: documentsTable.title
    })
    .from(slideDecksTable)
    .leftJoin(documentsTable, eq(slideDecksTable.documentId, documentsTable.id))
    .where(eq(slideDecksTable.id, slideId))
    .limit(1)

  if (!deck) {
    return notFound()
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Back button */}
      <Link
        href="/slides"
        className="absolute left-4 top-4 z-50 flex items-center gap-2 rounded-full bg-black/10 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Slides
      </Link>

      {/* Title */}
      <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2">
        <h1 className="text-center text-xl font-bold text-gray-700 dark:text-gray-200">
          {deck.documentTitle}
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            {deck.minutes} minute presentation
          </span>
        </h1>
      </div>

      {/* Slides */}
      <SlideRenderer markdown={deck.content} />
    </div>
  )
} 