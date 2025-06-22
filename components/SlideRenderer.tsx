"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"

interface SlideRendererProps {
  markdown: string
}

/**
 * SlideRenderer – groups bullet points into slides of 3-5 items each.
 * Each group is rendered inside its own square-like container with enhanced spacing.
 */
export const SlideRenderer: React.FC<SlideRendererProps> = ({ markdown }) => {
  // Split into bullet points and group into slides of 3-5 items
  const slides = React.useMemo(() => {
    const items = markdown
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.replace(/^[-•\s]+/, "").trim()) // Remove bullet points and whitespace

    const slides: string[] = []
    let currentSlide: string[] = []

    items.forEach((item, index) => {
      currentSlide.push(`- ${item}`) // Add bullet point back

      // Create a new slide when we have 3-5 items and there are more items,
      // or when we're at the end
      if (
        (currentSlide.length >= 3 && items.length > index + 1) ||
        currentSlide.length === 5 ||
        index === items.length - 1
      ) {
        slides.push(currentSlide.join("\n\n")) // Add extra newline for more spacing
        currentSlide = []
      }
    })

    return slides
  }, [markdown])

  // Calculate progress percentage
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const progress = ((currentSlide + 1) / slides.length) * 100

  // Animation variants for slide transitions
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  }

  // Handle navigation
  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1)
    }
  }

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space") {
        handleNext()
      } else if (e.key === "ArrowLeft") {
        handlePrev()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentSlide, slides.length])

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-8 p-4">
      {/* Progress bar */}
      <div className="fixed inset-x-0 top-0 z-50 p-4">
        <Progress value={progress} className="h-2" />
        <div className="text-muted-foreground mt-2 text-center text-sm">
          Slide {currentSlide + 1} of {slides.length}
        </div>
      </div>

      {/* Slide content */}
      <div className="relative aspect-square w-full max-w-4xl overflow-hidden">
        <motion.div
          key={currentSlide}
          custom={currentSlide}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-full rounded-xl border bg-gradient-to-b from-white to-gray-50 p-12 shadow-lg dark:from-slate-900 dark:to-slate-800">
            <div className="prose prose-lg dark:prose-invert mx-auto flex h-full flex-col justify-center space-y-8">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {slides[currentSlide]}
              </ReactMarkdown>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation buttons */}
      <div className="fixed inset-x-0 bottom-8 z-50 flex justify-center gap-4">
        <button
          onClick={handlePrev}
          disabled={currentSlide === 0}
          className="rounded-full bg-black/10 px-6 py-2 text-sm font-medium text-gray-700 transition hover:bg-black/20 disabled:opacity-50 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={currentSlide === slides.length - 1}
          className="rounded-full bg-black/10 px-6 py-2 text-sm font-medium text-gray-700 transition hover:bg-black/20 disabled:opacity-50 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
        >
          Next
        </button>
      </div>
    </div>
  )
}
