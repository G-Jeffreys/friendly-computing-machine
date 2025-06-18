# Grammarly Clone UI & Feature Upgrade — PRD

## ✅ Overview

We are implementing:

- A modernized UI with formatting tools
- A 100-word "demo" usage blocker for anonymous users
- Autosave every 30 s
- A more robust editor
- Faster document-load experience

---

## 1. ✨ Modern UI Refresh

**Goal:** Improve the overall look and responsiveness of the app using `shadcn-ui` + Tailwind.

### Tasks

#### 1.1 Refactor Layout and Navigation

- Update `/app/(dashboard)/layout.tsx` (or equivalent layout) to include:
  - A sticky top navigation bar using `components/ui/navbar.tsx`
  - Move document navigation to a sidebar (collapsible if needed)
  - Add Tailwind breakpoints for responsive behavior

#### 1.2 Global Styling

- Update `globals.css`:
  - Use `font-sans` and ensure a clean base typography
  - Ensure dark/light mode support via Tailwind's `class` strategy

#### 1.3 Component Polish

- Refactor any custom buttons/inputs to use `shadcn/ui` equivalents (`<Button>`, `<Input>`, etc.)

---

## 2. 📈 Demo-Only Mode for Anonymous Users

**Goal:** Allow unsigned users to edit up to 100 words for 10 s before blocking them.

### Tasks

#### 2.1 Track Anonymous Usage

- In `DocumentEditor.tsx`, count words in the editor (`editorText.split(/\s+/).length`)
- Use `useEffect` to start a `setTimeout()` 10 s after crossing 100 words

#### 2.2 Popup Blocker

- Create a `components/ui/OverlayModal.tsx` using `Dialog` from `@/components/ui/dialog`
- On trigger, render a fullscreen modal:
  - Text: "Sign up to keep writing"
  - Buttons: "Sign up with Clerk" or "Sign in"

#### 2.3 Auth Check

- Use `useAuth()` from Clerk in `DocumentEditor.tsx` to check for signed-in status
- Skip limit if the user is authenticated

---

## 3. 🛠 Autosave Every 30 Seconds

**Goal:** Save draft updates every 30 s without lag or excess DB hits.

### Tasks

#### 3.1 Add Autosave Hook

- Create `lib/hooks/useAutosave.ts`

```ts
export function useAutosave(callback: () => void, delay: number) {
  useEffect(() => {
    const id = setInterval(callback, delay)
    return () => clearInterval(id)
  }, [callback, delay])
}
```

#### 3.2 Use in Editor

- In `DocumentEditor.tsx`, call `useAutosave(() => saveDocument(editorText), 30000)`
- `saveDocument()` should call the `PATCH` API route:

```ts
await fetch(`/api/documents/${documentId}`, {
  method: "PATCH",
  body: JSON.stringify({ content })
})
```

#### 3.3 Debounce for Stability

- Use `lodash.debounce()` to avoid firing `PATCH` while the user is actively typing

---

## 4. 📑 Rich-Text Formatting Toolbar

**Goal:** Add formatting controls and persist them.

### Tasks

#### 4.1 Change Storage Format

- In `documents` schema, change `content` to support HTML (or Markdown)
- Migrate existing text to simple `<p>`-wrapped blocks (optional)

#### 4.2 Add Toolbar Component

- Create `components/EditorToolbar.tsx`:
  - Bold, Italics, Underline, Font Size, Text Align
  - Buttons modify the current selection using `document.execCommand()` or custom handlers

#### 4.3 Apply Formatting

- Update `DocumentEditor.tsx`:
  - Change the `textarea` to a `contenteditable` `div`
  - Use `innerHTML` binding for content

#### 4.4 Persist Formatting

- On save (manual or autosave), extract `.innerHTML` and send to Supabase

---

## 5. 🚀 Document Load Performance

**Goal:** Reduce time-to-edit when opening a document.

### Tasks

#### 5.1 Preload Text via Server Props

- In `/app/documents/[documentId]/page.tsx`, fetch the document server-side and pass down as a prop

#### 5.2 Skeleton Loader

- Add `components/ui/DocumentSkeleton.tsx` to show gray bars while loading

#### 5.3 Defer Non-Critical JS

- Defer analytics, heavy LLM calls, and editor overlays using `React.lazy()` + `Suspense`

---

## 6. ⚙️ Optional: Modular Editor Refactor

**Goal:** Organize `DocumentEditor.tsx` into smaller, cleaner files.

### Tasks

#### 6.1 Split into Modules

- `/components/editor/EditorContainer.tsx`
- `/components/editor/EditorTextLayer.tsx`
- `/components/editor/EditorOverlay.tsx`
- `/components/editor/EditorToolbar.tsx`

#### 6.2 Use Context

- Share state like content, formatting, and `documentId` via React context

---

## 🎯 MVP Completion Criteria

1. Clean layout with navbar and styled components
2. Auth-free users blocked after 100 words + 10 s
3. Autosave works reliably every 30 s (debounced)
4. Text-formatting toolbar is available and persisted
5. Document load time is snappy, with skeleton shown if delayed
6. Code is modular and uses best practices (context, hooks)
