/*
<ai_context>
Contains the utility functions for the app.
</ai_context>
*/

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Simple debounce helper.
 * Returns a debounced version of the supplied function that delays invoking until
 * `delay` milliseconds have elapsed since the last call.
 * Includes verbose console logs for debugging as per repository rules.
 */
export function debounce<F extends (...args: any[]) => any>(
  fn: F,
  delay = 300
): (...args: Parameters<F>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return function debounced(
    this: ThisParameterType<F>,
    ...args: Parameters<F>
  ) {
    if (timer) {
      console.debug("[debounce] clearing previous timer")
      clearTimeout(timer)
    }
    console.debug("[debounce] setting new timer", { delay, args })
    timer = setTimeout(() => {
      console.debug("[debounce] executing function")
      fn.apply(this, args)
    }, delay)
  }
}
