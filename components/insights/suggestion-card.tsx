"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Suggestion } from "@/lib/hooks/use-spell-grammar"
import { cn } from "@/lib/utils"

interface SuggestionCardProps {
  suggestion: Suggestion
  onApply: (replacement: string) => void
  onDismiss: () => void
  onAddToDictionary?: (word: string) => void
}

export function SuggestionCard({
  suggestion,
  onApply,
  onDismiss,
  onAddToDictionary
}: SuggestionCardProps) {
  const { type, message, replacements, offset, length, id } = suggestion
  const highlightedText = "..." // Placeholder

  return (
    <Card className="rounded-2xl">
      <CardHeader className="p-4">
        <p>
          <span
            className={cn("font-semibold", {
              "text-red-500": type === "spell",
              "text-blue-500": type === "grammar",
              "text-purple-500": type === "style"
            })}
          >
            {/* We need the original text to display this */}
          </span>
        </p>
        <p className="text-muted-foreground text-sm">{message}</p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 p-4 pt-0">
        {replacements.slice(0, 3).map(rep => (
          <Button
            key={rep}
            size="sm"
            variant="outline"
            onClick={() => onApply(rep)}
          >
            {rep}
          </Button>
        ))}
      </CardContent>
      <CardFooter className="flex justify-end gap-2 p-4 pt-0">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Ignore
        </Button>
        {type === "spell" && onAddToDictionary && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddToDictionary(highlightedText)}
          >
            Add to Dictionary
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
