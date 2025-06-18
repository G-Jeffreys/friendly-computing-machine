/*
  Sanitises HTML output using DOMPurify but only when executed in a browser environment.
  On the server (including Next.js SSR) we simply return the original string under the
  assumption that server components should never render untrusted HTML directly.
*/

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") {
    // Server / edge runtime – returning the same string avoids JSDOM issues.
    return html
  }

  // Dynamic import with loose typing to accommodate both ESM and CJS builds of DOMPurify.
  const DOMPurify: any = require("dompurify")

  return DOMPurify.sanitize
    ? DOMPurify.sanitize(html)
    : (DOMPurify.default?.sanitize(html) ?? html)
}
