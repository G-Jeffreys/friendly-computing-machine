import { SlideRenderer } from "@/components/SlideRenderer"
import { db } from "@/db/db"
import { slideDecksTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"

export default async function SlidePage({ params }: { params: { slideId: string } }) {
  const [deck] = await db
    .select()
    .from(slideDecksTable)
    .where(eq(slideDecksTable.id, params.slideId))
    .limit(1)

  if (!deck) {
    return notFound()
  }

  return (
    <div className="mx-auto mt-12 max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">{deck.title}</h1>
      <SlideRenderer markdown={deck.content} />
    </div>
  )
} 