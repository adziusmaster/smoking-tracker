# Better SOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finished-feeling SOS games (pop with sound/vibration, breathing guidance, full block drop, best scores) and craving insights (strength rating, reason, patterns).

**Architecture:** Rules in pure domain modules (`games/records`, `games/blocks`, `breathing`, `cravings`); storage in migration v6 (`preferences`, `game_records`, strength columns) behind repository functions tested through the Node harness; a `usePreferences` hook and a `useFeedback` hook (sound + vibration) shared by the games; UI in `src/ui/sos/` and Log/Settings.

**Tech Stack:** Expo SDK 57, RN 0.86, expo-audio ~57.0.5 (locked down), Vitest + better-sqlite3.

**Spec:** `docs/superpowers/specs/2026-09-28-better-sos-design.md` — its Domain, Data and Testing sections are the interfaces and test lists.

## Global Constraints

- No new permission beyond `MODIFY_AUDIO_SETTINGS`; `INTERNET`, `RECORD_AUDIO`, `FOREGROUND_SERVICE*` blocked; verified on the built APK.
- Domain pure (no `Date.now`, no `Math.random`, no device time zone lookups — pass them in).
- Colours only from the theme; strict TS; AAA tests; commits by the configured user, no Co-Authored-By.
- Local phone testing only via the dev variant; never touch `com.adziusmaster.smokefree`.

## Review Focus

1. Sound/vibration firing after the user turned them off (preference not read at play time).
2. Audio player not released on unmount (leak) or crashing when the asset fails to load.
3. Block drop hold-to-drop timer continuing after release/unmount; gravity timer not following level.
4. Strength rating skipped → event still saved with nulls; double tap on rating chips → one event.
5. Reason text with emoji / very long text / newlines renders without breaking the SOS layout.

---

### Task 1: Storage v6 and repositories
Migration v6 per spec; queries `UPSERT_PREFERENCE`, `SELECT_PREFERENCES`, `UPSERT_GAME_RECORD`, `SELECT_GAME_RECORDS`; `INSERT_CRAVING_EVENT` gains strength columns; repository `loadPreferences`, `savePreference`, `loadGameRecords`, `saveGameRecord`, `addCravingEvent` with strengths; `DELETE_ALL` clears the new tables first; export includes them. Tests: sql (v6, CHECKs), repositories (round trips) — RED first.

### Task 2: Domain rules
`games/records.ts`, blocks additions, `breathing.ts`, cravings additions — tests from the spec, RED first. Update `CravingEvent` type (strengthStart/End).

### Task 3: Content, sound asset, preferences hook, feedback hook
`scripts/make-pop.py` → `assets/sounds/pop.wav`; `src/ui/usePreferences.ts` (load + set, defaults); `src/ui/useFeedback.ts` (`pop()`, `tick()` honouring prefs; expo-audio `useAudioPlayer`, rate jitter; `Vibration.vibrate`). Copy for reason/insights in `src/content/sos.ts`.

### Task 4: Game UIs
PopBurst + bubble records; memory records; block drop (score row, next preview, ghost, levels, hold-to-drop, flash, records); breathing (colours, countdown, outline, phase vibration); mute toggle in the activity header.

### Task 5: Strength, reason, insights, settings
SOS strength steps; reason field in onboarding step 4 and Settings; reason card in SOS; Log "Cravings" section; Settings sound/vibration switches.

### Task 6: Verify, docs, final review, checkpoint
npm ci/test/typecheck/export; dev APK build; permission check on the APK; STATE.md; fresh reviewer; fix pass; leave the dev APK ready plus the install command.
