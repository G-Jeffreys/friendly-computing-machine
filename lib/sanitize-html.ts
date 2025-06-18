/*
<ai_context>
Utility helper for sanitising HTML strings using DOMPurify. Importing
DOMPurify in a server environment can crash because it expects a `window`
object. Therefore we dynamically require it only when running in the
browser. On the server we simply return the original string – the server
components are trusted to pass in safe HTML.
</ai_context>
*/

// eslint-disable-next-line no-console
console.log("[sanitize-html] module initialised")

// We store a singleton DOMPurify instance here so we don't recreate it on
// every invocation on the client.
let purifier: any = null

/**
 * Sanitize a raw HTML string. In the browser we use DOMPurify. On the server we
 * return the string untouched to avoid the cost/complexity of JSDOM.
 *
 * @param unsafeHtml Raw HTML string that might contain unsafe markup.
 * @returns A safe HTML string, ready for `dangerouslySetInnerHTML`.
 */
export function sanitizeHtml(unsafeHtml: string): string {
  if (typeof window === "undefined") {
    // eslint-disable-next-line no-console
    console.log("[sanitize-html] running on server – returning input verbatim")
    return unsafeHtml
  }

  if (!purifier) {
    // Dynamically `require` to avoid pulling DOMPurify into the server bundle.
    const createDOMPurify = require("dompurify") as any
    purifier = createDOMPurify(window)
  }

  const clean = (purifier as any).sanitize(unsafeHtml, {
    USE_PROFILES: { html: true }
  }) as string
  // eslint-disable-next-line no-console
  console.log("[sanitize-html] sanitised html length", clean.length)
  return clean
}
