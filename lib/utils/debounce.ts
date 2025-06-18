export function debounce<T extends (...args: any[]) => void>(
  /**
   * The function you want to debounce – it will only be invoked after the user
   * stops calling the returned wrapper for `delay` milliseconds.
   */
  fn: T,
  /** Delay in milliseconds. */
  delay: number
): (...args: Parameters<T>) => void {
  // Timer id that tracks the scheduled execution. Using let instead of const so
  // we can re-assign (clear + schedule) on every invocation.
  let timer: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    // Lots of logging – per user guidelines – to follow what's happening.
    // eslint-disable-next-line no-console
    console.log("[debounce] called with", { args, delay })

    // If there's already a pending execution, cancel it.
    if (timer) {
      // eslint-disable-next-line no-console
      console.log("[debounce] clearing previous timer")
      clearTimeout(timer)
    }

    // Schedule a new execution.
    timer = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log("[debounce] invoking debounced function after", delay, "ms")
      fn(...args)
    }, delay)
  }
}
