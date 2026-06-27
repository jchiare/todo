<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LifeOS — V0 (Manual Life Triage)

LifeOS is a **daily triage engine for life projects**, not a todo app. It keeps a
set of durable life projects (each with state, one next action, research
freshness, and decision context), ranks 3–5 actions each day, and explains *why
now*.

**V0 has no AI and no backend.** All state is client-side and persisted to
`localStorage` under the key `lifeos_v0`. Do not add a backend, AI, claims
engine, chat, calendar, mobile layout, or gamification — see the anti-patterns
in the design handoff.

## Layout
- `src/app/` — Next.js App Router entry (`page.tsx` is the single client-side app).
- `src/lib/lifeos/` — the domain core:
  - `types.ts` — the product data model (source of truth, not the persisted blob).
  - `seed.ts` — the 8 seed projects, decisions, and per-project detail.
  - `ranking.ts` — the deterministic scoring function + Today/Quiet partition.
  - `store.ts` — the `useLifeOS` state hook (persist on change, sanitize on read).
  - `tokens.ts` — design tokens; the UI uses inline styles to match the handoff exactly.
- `src/components/lifeos/` — the screens (Sidebar, Today, ProjectsList, ProjectDetail).

## Invariants
- Ranking is a small, visible `if`/scoring function — never a learned model.
- The default seed must rank, in order: **German A1 → USA Taxes 2025 → Ellie German Exposure**.
- The Project↔Decision link lives only on the decision side (lookup by id) so the two can never drift.
