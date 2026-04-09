# Profile/Memory Data Flow Into LLM Prompts

This document explains exactly how user facts ("memory") are stored, transformed,
and passed into LLM prompts.

## 1) Storage: `profileFacts`

Source of truth is the `profileFacts` table in `convex/schema.ts`:

```ts
profileFacts: defineTable({
  fact: v.string(),
  category: v.string(),
  createdAt: v.number(),
})
```

Important details:
- `category` is a plain string (not schema-enforced enum).
- Facts are append-only in practice (no delete/update path in current code).

## 2) Write path (how facts are learned)

Primary runtime path:
1. `convex/ai.ts`
   - `doClarification` and `doTaskBreakdown` ask the LLM for `learned_facts`.
2. `convex/workflows.ts`
   - passes `learned_facts` into `internal.aiMutations.saveClarification` / `saveTaskBreakdown`.
3. `convex/aiMutations.ts`
   - inserts into `profileFacts` with exact-text dedupe:
     - lowercases `fact`
     - skips insert if same lowercase fact already exists.

There is also `convex/profile.ts::bulkAdd` with the same exact-text dedupe behavior,
but it is not used by the main clarification workflow.

## 3) Read path A: Clarification + Task Breakdown prompts

Files:
- `convex/ai.ts`
- `convex/agents/prompts/ai/clarificationPrompt.ts`
- `convex/agents/prompts/ai/taskBreakdownPrompt.ts`

Flow:
1. `getProfileContext()` in `convex/ai.ts` calls `api.profile.list`.
2. It groups facts by category and formats as:

```text
What you know about this user:
- family: fact1; fact2; fact3
- location: fact4; fact5
```

3. That formatted block is appended to:
   - `buildClarificationPrompt(profileContext)`
   - `buildTaskBreakdownPrompt(profileContext)`

Model calls:
- Clarification: `gpt-5.4`
- Task breakdown: `gpt-5.4` with `web_search` tool

Behavior notes:
- No additional dedupe/truncation at prompt-build time.
- So prompt size can grow as the profile accumulates facts.

## 4) Read path B: PDF field-mapping prompt

Files:
- `convex/agent.ts`
- `convex/agents/pdfGraph.ts`
- `convex/agents/prompts/pdf/mapFieldsPrompt.ts`

Flow:
1. `doFillPdf` in `convex/agent.ts` calls `api.profile.list`.
2. It builds raw lines: `"<category>: <fact>"` joined by newlines.
3. `runPdfFillGraph` in `pdfGraph.ts` runs `condenseProfile(raw)` before LLM use.
4. Condensed profile is injected into `buildMapFieldsPrompt({ profileStr, convoStr, fieldInfo, taskLabel })`.

`condenseProfile` behavior:
- groups by category,
- dedupes normalized duplicates,
- treats `Still needed: X` as a keyed missing-data marker,
- dedupes key/value facts by key (`"Parent 1 full name: ..."` last write wins),
- removes cross-category duplicates,
- outputs sectioned format:

```text
[personal]
- Parent 1 full name: ...

[needed_info]
- Still needed: Clara's Social Security number
```

The `mapFields` prompt also explicitly tells the model:
- profile is grouped by `[category]` sections,
- `Still needed: X` means missing data (do not invent values).

## 5) What "memory" means in this repo

For these flows, memory is:
- `profileFacts` (longer-lived user facts), plus
- current item conversation (`messages`) where applicable.

There is no separate vector memory or retrieval index in this path.

## 6) Practical implication

- Clarification/task prompts use broad context and can tolerate repetition.
- PDF mapping needs precision, so it applies `condenseProfile` first.
- If token growth becomes an issue, apply similar condensation to `getProfileContext()`.
