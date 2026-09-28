# Better SOS and Craving Insights — Design

**Date:** 2026-09-28
**Status:** Approved in conversation ("build it all that you mentioned… up to the checkpoint")
**Builds on:** `2026-09-28-sos-activities-design.md`

## Summary

Make the SOS activities feel finished and give cravings a memory:

1. **Bubble pop** — a real pop (swell + droplets + fade), a pop sound, a vibration tick.
2. **Sound and vibration preferences** — Settings switches, plus a mute button on game screens.
3. **Breathing** — colour per phase, a 4-3-2-1 countdown, a full-size outline ring, a vibration at
   each phase change.
4. **Best scores** — block drop (score), bubble pop (most popped), memory pairs (fewest moves), with
   "New best!".
5. **Block drop** — next-piece preview, landing ghost, levels that speed up, scoring, ±2 wall kicks,
   hold-to-drop-faster, line-clear flash.
6. **Craving strength** — "How strong is it?" (1–5, optional) when SOS starts and when it passes;
   Log shows the trend.
7. **Your reason** — why you are quitting, written in onboarding or Settings, shown in SOS.
8. **Craving patterns** — on Log: cravings by time of day, and what set slips off.

## Non-goals

- Online anything; accounts; leaderboards.
- Background audio, recording, or any new dangerous permission.
- Notifications changes.

## Sound: `expo-audio`, locked down

`expo-audio@~57.0.5` (first-party, SDK 57) plays the pop. Its config plugin adds
`RECORD_AUDIO`, `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK` by default, so it is
configured `recordAudioAndroid: false, enableBackgroundPlayback: false,
enableBackgroundRecording: false`, **and** those permissions (plus
`FOREGROUND_SERVICE_MICROPHONE`) are added to `android.blockedPermissions`. The library's own
`MODIFY_AUDIO_SETTINGS` (a normal permission) remains. The built APK/AAB permission list is
checked before any release; `INTERNET` and `RECORD_AUDIO` must be absent.

The pop sound (`assets/sounds/pop.wav`) is synthesised by a checked-in script
(`scripts/make-pop.py`): a ~90 ms decaying sine chirp with a short noise click, mono 44.1 kHz,
no third-party audio, so no licensing. Playback rate varies ±12% per pop.

Vibration uses React Native's `Vibration` API (the `VIBRATE` permission is already present): 12 ms
on pop, 20 ms at breathing phase changes.

## Data — migration v6 (additive)

```sql
CREATE TABLE preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE game_records (
  game        TEXT PRIMARY KEY CHECK (game IN ('blocks','memory','bubbles')),
  best        INTEGER NOT NULL CHECK (best >= 0),
  achieved_at TEXT NOT NULL
);
ALTER TABLE craving_events ADD COLUMN strength_start INTEGER NULL CHECK (strength_start BETWEEN 1 AND 5);
ALTER TABLE craving_events ADD COLUMN strength_end   INTEGER NULL CHECK (strength_end BETWEEN 1 AND 5);
```

Preferences keys: `sound` ('on'|'off', default on), `vibration` ('on'|'off', default on),
`reason` (free text, empty = none). Everything is included in export and wiped by Delete
everything.

## Domain (pure, tested)

- `games/records.ts` — `RECORD_DIRECTION: Record<GameId, 'higher' | 'lower'>` (blocks, bubbles
  higher; memory lower); `isNewBest(game, value, current: number | null): boolean`.
- `games/blocks.ts` additions — `score`, `level` (= floor(lines / 10)), `lastCleared: number[]`
  (rows cleared by the last lock, for the flash); `gravityMs(level)` = max(120, 600 − level·50);
  line points 100 / 300 / 500 / 800 × (level + 1); soft drop `softDrop(s)` moves down one row
  and adds 1 point; hard drop adds 2 points per row; `ghost(s): Piece` (where a hard drop would
  land); wall kicks try 0, −1, +1, −2, +2.
- `breathing.ts` — `breathAt(elapsedMs): { phase: 'in' | 'hold' | 'out'; secondsLeft: number;
  phaseProgress: number }` over the 4-4-6 cycle; `secondsLeft` is a whole number ≥ 1.
- `cravings.ts` additions — `strengthTrend(events, now)`: average start strength over the last
  14 days vs all earlier rated events → `{ recent: number | null; earlier: number | null }`;
  `cravingsByTimeOfDay(events, timezoneOffsetFn)`: counts in night (0–6), morning (6–12),
  afternoon (12–18), evening (18–24) using the device-local hour passed in as a function so the
  domain stays pure; `slipTriggers(slips)`: counts per trigger, most frequent first.

## UI

- **Bubble pop:** `PopBurst` renders at the popped bubble's current position: the ring scales to
  1.25 and fades (180 ms) while 7 droplets fly outward 28–44 px and fade (260 ms). A "Best: N"
  caption; when `popped` beats it, "New best!" and the record is saved.
- **Game header:** a mute toggle (speaker icon drawn from Views/Text, labelled) bound to `sound`.
- **Breathing:** fill colour per phase — accent (in), achieve (hold), `game[3]` (out) —
  interpolated; the seconds-left number in the circle; a dashed outline ring at full size;
  vibration at each phase change if enabled; reduced-motion keeps colour and countdown.
- **Block drop:** next-piece mini-grid; ghost cells drawn as outlines; Score / Lines / Level row;
  "Best"; the ▼ button supports press-and-hold (soft drop every 60 ms) and ⤓ hard-drops; cleared
  rows flash `achieve` for 200 ms.
- **Memory pairs:** "Best: N moves"; "New best!" on a win that beats it.
- **SOS strength:** on the delay screen, "How strong is it? (optional)" 1–5 chips; after "It
  passed", a short step "How strong is it now?" 1–5 with "Skip"; the event is saved with both.
- **Your reason:** onboarding step 4 gains an optional multi-line field; Settings gains "Your
  reason for quitting"; SOS shows it in a card under the craving bar when set.
- **Log → Cravings:** beaten count; the trend sentence ("Your cravings started at 3.8 on average
  before; the last two weeks average 2.1." — only when both numbers exist); time-of-day bars;
  top slip triggers.
- **Settings → Sound and vibration:** two switches.

## Testing

Domain: records direction and ties; blocks scoring per line count and level, level from lines,
gravity floor, soft/hard drop points, ghost landing, ±2 kick for a vertical I at the right wall,
`lastCleared`; breathing phase boundaries (0, 3.99 s, 4 s, 8 s, 13.99 s, 14 s wraps); trend with
no/one/both windows; time-of-day buckets at boundaries; triggers ordering.
Data: v6 migration, CHECKs, preference upsert, record upsert, strength columns; repository
functions through the Node harness (`src/data/testDb.ts`).
UI: typecheck, Android export, dev build; permission list checked on the built APK.
