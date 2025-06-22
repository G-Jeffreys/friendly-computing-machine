import { useCallback, useEffect, useRef } from "react"
import { AnalysisResult } from "@/workers/text-analysis"

export function useAnalyser() {
  const workerRef = useRef<Worker | null>(null)
  const callbacks = useRef(new Map<string, (r: AnalysisResult) => void>())

  useEffect(() => {
    const worker = new Worker(
      new URL("@/workers/text-analysis.ts", import.meta.url),
      {
        type: "module"
      }
    )
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent) => {
      const { id, result } = e.data as { id: string; result: AnalysisResult }
      const cb = callbacks.current.get(id)
      if (cb) {
        cb(result)
        callbacks.current.delete(id)
      }
    }
    return () => {
      worker.terminate()
    }
  }, [])

  const analyse = useCallback((text: string, userDictionary: string[] = []): Promise<AnalysisResult> => {
    if (!workerRef.current) throw new Error("Worker not initialised")
    return new Promise(resolve => {
      const id = crypto.randomUUID()
      callbacks.current.set(id, resolve)
      workerRef.current!.postMessage({ id, text, userDictionary })
    })
  }, [])

  return { analyse }
}
