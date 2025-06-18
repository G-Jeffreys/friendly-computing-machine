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

  // ---------------------------------------------------------------------------
  // Define strict allow-lists that match the limited feature-set of our editor.
  // ---------------------------------------------------------------------------
  const ALLOWED_TAGS = [
    "p",
    "br",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "pre",
    "code",
    "ol",
    "ul",
    "li",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "del",
    "strike",
    "a",
    "span"
  ] as const

  const ALLOWED_ATTR = [
    "class",
    "href",
    "rel",
    "target",
    /^data-tiptap-.*/ // allow TipTap data attributes
  ] as const

  const clean = (purifier as any).sanitize(unsafeHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR
  }) as string
  // eslint-disable-next-line no-console
  console.log("[sanitize-html] sanitised html length", clean.length)
  return clean
}
