# LifeOS — V0

A **daily triage engine for life projects** — not a todo app. LifeOS maintains a
set of durable life projects (each with state, one next action, research
freshness, and decision context), ranks 3–5 actions each day, and explains *why
now*. V0 proves one thing: **will you open the Today list and trust it over your
own anxiety-driven task switching?**

V0 is **manual triage** — no AI, no backend. All state is client-side and
persisted to `localStorage`.

## Two screens

- **Today** — the execution surface: the ranked daily action list, each card with
  a "why now", the deterministic score breakdown, and a Quiet list of projects
  deliberately not surfaced.
- **Projects** — the memory: project list → project detail (Overview · Tasks ·
  Sources). Task research synthesizes into each project's memo.

## Ranking (deterministic)

```
score = deadline_urgency        # 0–40
      + momentum_risk           # 0–30  (habit projects)
      + strategic_importance*5  # 0–25
      + project_priority*3      # 0–15
      + research_change_signal  # +20
      - recently_snoozed        # -50
```

Gates (`blocked`, `no new info`, low actionability) remove an item from Today
entirely rather than lowering its score. With the seed data the list ranks, in
order: **German A1 → USA Taxes 2025 → Ellie German Exposure**.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm run lint     # eslint
```

## Stack

Next.js (App Router) + React + TypeScript. The UI uses inline styles driven by
`src/lib/lifeos/tokens.ts` to match the design handoff's exact tokens. The domain
core lives in `src/lib/lifeos/`.
