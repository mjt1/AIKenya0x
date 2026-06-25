---
name: frontend-data-layer
description: Frontend data-fetching architecture — TanStack Query + axios via a /api BFF proxy, hooks in queries/mutations
metadata:
  type: project
---

The FrontEnd data layer uses a fixed pattern:
- Fetching with **TanStack Query** (`@tanstack/react-query`) + **axios**.
- `FrontEnd/lib/api.ts` exports a single axios instance: `axios.create({ baseURL: "/api" })`.
- Requests therefore hit **Next.js route handlers** in `FrontEnd/app/api/**/route.ts`, which act as a BFF proxy forwarding to the NestJS backend (keeps secrets/Webkul/Shopify off the client — aligns with CLAUDE.md proxy rule).
- **Queries** live in `FrontEnd/hooks/queries/`; **mutations** in `FrontEnd/hooks/mutations/` (one hook per file, per [[use-custom-components]] granularity rule).

Work is tracked story-by-story in PRD.md: pick a story, build backend + frontend, tick its Backend/Frontend boxes

**How to apply:** before the first wired story, install the deps, add a QueryClientProvider to the root layout, and scaffold `lib/api.ts` + the `app/api` proxy + `hooks/queries|mutations`. New endpoints get a `route.ts` proxy + a query/mutation hook.


---
name: use-custom-components
description: Reuse UI primitives over raw HTML, and keep one small component per file (no stacked inline components)
metadata:
  type: feedback
---

Two rules when building FrontEnd pages/components:

1. **Reuse primitives, not raw HTML.** Prefer custom components from `FrontEnd/components/ui/` (`Text`, `Button`, `Input`, `Field`, `Checkbox`). Check what exists before writing raw HTML with equivalent styling.
2. **One small component per file.** Keep components as small as possible and put each in its own file. Do NOT stack multiple components in a single file (e.g. don't define an inline `OpeningHero`/`Stat` helper inside `page.tsx` — extract it to `components/`).

**Why:** The project has a design-system layer (CVA-based components) that ensures consistency. Raw `<h1>`, `<p>`, `<label>` with inline Tailwind duplicates variant logic and drifts from the system. Stacked inline components hurt readability and reuse.

**How to apply:** Before writing JSX, check `FrontEnd/components/ui/` and `FrontEnd/components/` for an available primitive. Use `<Text variant="h1">` instead of raw `<h1 className="text-3xl font-bold ...">`, `<Text variant="label">` instead of raw `<label>`, etc. If a needed variant doesn't exist, add it to the component rather than inlining. Extract any page sub-section (hero, stat, panel) into its own file under `components/`.
