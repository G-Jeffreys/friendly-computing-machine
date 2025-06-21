# Architecture Decision Record: `next.config.mjs`

> Status: **Accepted** · Date: 2025-06-20

This ADR captures **why** each non-default flag in `next.config.mjs` is enabled or disabled.  Future maintainers should read this before changing the configuration.

---

## 1. `reactStrictMode: true`

* **What it does:** Activates additional React runtime checks during development (double-render, extra warnings).
* **Why we turned it on:**  
  • Surfaces unsafe side-effects early.  
  • Aligns with React 19 where strict-mode behaviours become default.  
  • Zero production impact.
* **Rollback plan:** Set to `false` if a third-party lib misbehaves in dev; keep a backlog task to upgrade the lib.

---

## 2. `experimental.workerThreads`

| State | Value |
|-------|-------|
| **Disabled** | `false` |

* **What it does:** Runs webpack compilations in parallel Node `worker_threads`, improving build times on multi-core machines.
* **Reason for _disabling_:**  
  Next 15.1 crashes with `DataCloneError` when this flag is on **and** a dynamic import uses `loading: () => null` (see [`components/utilities/providers.tsx`](../../components/utilities/providers.tsx)).  Until Vercel ships a fix, we keep the flag off.
* **Re-enable checklist:**  
  1. Upgrade Next.js to a patch version that fixes [vercel/next.js#xxxxx] (issue link TBD).  
  2. Toggle `workerThreads: true`, run `npm run build`.  
  3. Verify no `DataCloneError`.

---

## 3. `images.domains`

* **What it does:** Whitelists remote hosts for the `<Image>` optimizer.
* **Implementation detail:** Instead of hard-coding hosts we read `NEXT_PUBLIC_IMAGE_DOMAINS` from the environment and split it on commas.  This keeps secrets/config out of source control.
* **Default value:** The array is empty in production; `localhost` is always allowed through `remotePatterns` for dev screenshots & Storybook.

---

## 4. Removed flag: `swcMinify`

`swcMinify` was removed in Next 15 – SWC is the only minifier now.  The flag was deleted in commit `feat/runtime-hardening` to silence the "Unrecognized key" warning.

---

## How to propose changes

1. Create a PR with the config change.  
2. Update this ADR: explain the trade-offs and include a rollback plan.  
3. Assign at least one reviewer from the core team.

Maintaining this file prevents "why is this flag here?" confusion six months from now. 