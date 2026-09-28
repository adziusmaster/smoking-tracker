# SOS Activities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SOS timers with a delay, a choice of six activities (breathing, block drop, memory pairs, bubble pop, grounding, water), a five-minute bar, and a recorded "cravings beaten" count shown on home.

**Architecture:** Game rules are pure, seeded functions in `src/domain/games/` (tested in Node). Craving outcomes are stored in a new `craving_events` table (migration v4) and loaded into `QuitState`. The SOS screen orchestrates small UI components in `src/ui/sos/`, all built from RN core views and `Animated`.

**Tech Stack:** Expo SDK 57, RN 0.86, TypeScript strict, Vitest + better-sqlite3.

**Spec:** `docs/superpowers/specs/2026-09-28-sos-activities-design.md` (its Domain, Data and Testing sections are the exact interfaces and test lists for Tasks 1–3).

## Global Constraints

- No new dependencies; RN core + `Animated` only; colours only from the theme.
- `src/domain/` pure — randomness only through `nextRandom(seed)`; no `Math.random`/`Date.now` there.
- strict TS, no `any`; tests `function_stateUnderTest_expectedBehavior` + AAA.
- Commits by the configured user, no `Co-Authored-By`.
- Activity ids exactly: `breathe`, `blocks`, `memory`, `bubbles`, `grounding`, `water`.
- The block-drop claim is exactly the spec's sentence, linked to `tetris-cravings`.

## Review Focus

1. **Leaving SOS mid-game** (back gesture) — no craving event recorded, no timers left running (every interval/animation cleaned up on unmount).
2. **Double tap on "It passed"** — one event only (reuse `useSubmitGuard`).
3. **Block drop on a small screen / large font** — board fits; controls reachable above the pinned footer.
4. **Memory: tapping fast during the 700 ms mismatch** — third flip ignored until hidden.
5. **Dark mode** — every game readable (grid lines, glyph colours, bubbles).

---

### Task 1: Seeded randomness and block-drop rules
Files: create `src/domain/games/random.ts`, `random.test.ts`, `blocks.ts`, `blocks.test.ts`.
- [ ] Write the tests listed in the spec (random: deterministic + range; blocks: 7 cases). Run → FAIL.
- [ ] Implement mulberry32 `nextRandom`; blocks per the spec interface (shapes as 4×(x,y) offsets per rotation; spawn at x=3, y=0; kicks try x±1).
- [ ] Run → PASS; commit `feat(domain): falling-blocks game rules`.

### Task 2: Memory pairs and craving helpers
Files: create `src/domain/games/memory.ts`, `memory.test.ts`, `src/domain/cravings.ts`, `cravings.test.ts`; modify `src/domain/types.ts` (`CravingEvent`, `ActivityId`, `QuitState.cravingEvents`) and every test fixture building a `QuitState` (`periods: []` → add `cravingEvents: []`).
- [ ] Tests from the spec → FAIL; implement (Fisher–Yates shuffle via `nextRandom`) → PASS; typecheck; commit `feat(domain): memory pairs rules and cravings count`.

### Task 3: Storage v4
Files: `src/data/schema.ts`, `queries.ts` (`INSERT_CRAVING_EVENT`, `SELECT_CRAVING_EVENTS`, `DELETE_ALL` gains `craving_events` first), `repositories.ts` (`addCravingEvent`, load into `QuitState`), `sql.test.ts`.
- [ ] SQL tests (v4 applies, CHECKs, ordering, version counts updated) → FAIL; implement → PASS; commit `feat(data): record craving outcomes (migration v4)`.

### Task 4: Content
Files: `src/content/sos.ts` (`ACTIVITIES`, `GROUNDING_STEPS`), `sources.ts` (`tetris-cravings`), `content.test.ts` (ids match the SQL list; source ids resolve; grounding counts 5..1).
- [ ] Tests → FAIL; content → PASS; commit `feat(content): SOS activities and grounding prompts`.

### Task 5: Activity components
Files: create `src/ui/sos/{CravingBar,ActivityPicker,BreatheGuide,BlockDrop,MemoryPairs,BubblePop,Grounding}.tsx`.
- [ ] Build each per the spec's UI section with `makeStyles`; every interval/animation stopped in effect cleanup.
- [ ] Typecheck; commit `feat(ui): SOS activity components`.

### Task 6: SOS screen, home count
Files: `app/sos.tsx`, `src/ui/Hero.tsx`, `app/index.tsx`.
- [ ] SOS state machine: `delay` → `pick` → activity id; `startedAt` captured on mount; bar; pinned buttons; passed → `addCravingEvent(passed, activity)` then passed screen with count; slip logged → also `addCravingEvent(slipped)`.
- [ ] Hero: third tile or caption per the spec, from `cravingsBeaten(state.cravingEvents)` passed via props.
- [ ] Typecheck, export, install on the phone, screenshot each activity in light and dark; commit `feat(sos): ride out a craving with an activity; count cravings beaten`.

### Task 7: Docs and gate
- [ ] `npm test`, typecheck, `npm ci`, export; STATE.md (schema v4, activities, roadmap); commit `docs: state after SOS activities`.
