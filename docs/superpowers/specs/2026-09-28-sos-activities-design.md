# SOS Activities and Cravings Beaten — Design

**Date:** 2026-09-28
**Status:** Approved in conversation ("looks good, go for it. build it.")
**Part of:** pre-closed-testing release (between design system and store assets).

## Summary

Turn the craving SOS from four timers into something to do. After a 60-second delay the user
picks an activity — guided breathing, a falling-blocks puzzle, memory pairs, bubble pop, 5-4-3-2-1
grounding, or drinking water — and can switch at any time. A five-minute bar runs across the top
the whole time. Every SOS that ends with "It passed" is recorded, and home shows the running count
of cravings beaten.

## Goals

- Something engaging to do for the 3–5 minutes a craving lasts, without leaving the app.
- One evidence-backed activity, cited honestly: a small real-world study found three minutes of
  Tetris lowered craving strength, nicotine included, by 13.9 points on average
  (Skorka-Brown et al., Addictive Behaviors 2015; PubMed 26275843; verified 2026-09-28).
- A number that keeps growing after the early milestones: cravings beaten.

## Non-goals

- Scores, levels, high-score history, sound, haptics.
- A "your reasons" card (daily-engagement sub-project).
- Health claims for breathing, bubbles or grounding — they are presented as ways to occupy hands
  and attention, nothing more.
- New dependencies. Everything uses React Native core views and the built-in `Animated` API.

## Flow

```
open SOS ──► Delay (60 s ring) ──► Ride it out (activity picker)
                                     ├─ Breathe      (guided 4-4-6 loop)
                                     ├─ Block drop   (falling-blocks puzzle)
                                     ├─ Memory pairs (12 cards, 6 pairs)
                                     ├─ Bubble pop   (tap rising bubbles)
                                     ├─ 5-4-3-2-1    (grounding prompts)
                                     └─ Drink water  (existing copy, 60 s ring)
Pinned throughout:  [It passed, I'm fine]   [I used a stick]
Top throughout:     5-minute bar — "Most cravings pass within 3–5 minutes"
```

- "Skip the wait" on the delay step jumps straight to the picker.
- Inside an activity, "Try something else" returns to the picker; the five-minute bar never resets.
- When the bar completes it reads "Five minutes. How is it now?" and nothing else changes.
- "It passed" records a `passed` craving event (with the activity used last, if any) and shows the
  existing "It passed." screen, now with "That’s N cravings beaten."
- "I used a stick" goes to the existing slip screen; logging the slip also records a `slipped`
  craving event. Leaving SOS any other way records nothing.

## Domain (pure, tested)

### `src/domain/games/random.ts`
`nextRandom(seed: number): { value: number; seed: number }` — a 32-bit LCG (mulberry32). Games
carry their seed in state, so every rule is a pure function and testable.

### `src/domain/games/blocks.ts`
Board 10 × 18. Seven tetrominoes (I, O, T, S, Z, J, L) with 4 rotation states each.

```ts
export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;          // 0 empty, else piece colour index
export interface Piece { kind: PieceKind; rotation: 0 | 1 | 2 | 3; x: number; y: number }
export interface BlocksState { board: Cell[][]; piece: Piece; next: PieceKind; lines: number; over: boolean; seed: number }
export function newBlocks(seed: number): BlocksState;
export function tick(s: BlocksState): BlocksState;          // gravity: move down or lock + clear + spawn
export function moveBy(s: BlocksState, dx: -1 | 1): BlocksState;
export function rotate(s: BlocksState): BlocksState;        // clockwise, with a one-cell wall kick either side
export function hardDrop(s: BlocksState): BlocksState;
export function visibleBoard(s: BlocksState): Cell[][];     // board with the falling piece drawn in
```

Rules: a blocked move or rotation returns the same state; locking clears full rows and adds to
`lines`; a spawned piece that collides sets `over` (the UI offers "Play again").

### `src/domain/games/memory.ts`
```ts
export interface MemoryState { cards: { symbol: number; faceUp: boolean; matched: boolean }[]; moves: number; seed: number }
export function newMemory(seed: number, pairs?: number): MemoryState;   // default 6 pairs, shuffled
export function flip(s: MemoryState, index: number): MemoryState;
export function needsHide(s: MemoryState): boolean;                     // two face-up, unmatched
export function hideUnmatched(s: MemoryState): MemoryState;
export function isWon(s: MemoryState): boolean;
```
Flipping a matched or face-up card, or a third card while two are unresolved, returns the same
state. A matching pair becomes `matched` immediately.

### `src/domain/cravings.ts`
`cravingsBeaten(events: CravingEvent[]): number` — count of `passed` events.
`sosProgress(startedAt: string, now: Date): number` — 0..1 over 300 seconds.

## Data

Migration **v4**:

```sql
CREATE TABLE craving_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at  TEXT NOT NULL,
  ended_at    TEXT NOT NULL,
  outcome     TEXT NOT NULL CHECK (outcome IN ('passed','slipped')),
  activity    TEXT     NULL CHECK (activity IN ('breathe','blocks','memory','bubbles','grounding','water')),
  created_at  TEXT NOT NULL,
  CHECK (ended_at >= started_at)
);
```

`QuitState` gains `cravingEvents: CravingEvent[]`; `loadQuitState` reads them; `exportAll`
includes them; `deleteEverything` clears the table first.

## Content

`src/content/sos.ts` gains `ACTIVITIES` (id, title, blurb, optional `sourceId`) and
`GROUNDING_STEPS` (5 see, 4 touch, 3 hear, 2 smell, 1 taste). Block drop's blurb:
"A small real-world study found that three minutes of a Tetris-style game weakened cravings,
nicotine included." with `sourceId: 'tetris-cravings'` rendered as a link. New source
`tetris-cravings` (tier a, PubMed 26275843).

## UI (`src/ui/sos/`)

- `CravingBar` — thin bar + caption, driven by `sosProgress`.
- `ActivityPicker` — 2-column grid of cards from `ACTIVITIES`.
- `BreatheGuide` — circle scaling 0.55→1 (4 s), hold (4 s), →0.55 (6 s) with `Animated.loop`
  (native driver); label "Breathe in / Hold / Breathe out" from a 250 ms clock.
- `BlockDrop` — 10×18 grid of Views, 550 ms gravity; ◀ ⟳ ▶ ⤓ buttons (48 px, labelled) plus a
  PanResponder: horizontal swipe moves, tap rotates, downward fling drops.
- `MemoryPairs` — 4×3 grid; six glyphs (● ■ ▲ ◆ ★ ♥) in six palette colours; a mismatch hides
  after 700 ms.
- `BubblePop` — up to 8 bubbles rising over 6 s (`Animated`), tap to pop, a popped counter.
- `Grounding` — one prompt at a time ("5 things you can see"), a "Named one" button fills dots.
- Water — the existing instruction with the ring.

All colours from the theme; every control has a role and label.

## Home

- Non-combustible products: the empty third hero tile shows `N` / "cravings beaten".
- Combustible products (three tiles already): a caption under the tiles when N > 0.

## Testing

- `random.test.ts` — deterministic sequence; values in [0, 1).
- `blocks.test.ts` — new game spawns a piece on an empty board; `moveBy` into a wall returns the same
  state; `rotate` against a wall kicks; `tick` locks at the floor and spawns the next piece;
  a full row clears and increments `lines`; spawn collision sets `over`; `hardDrop` locks at the
  lowest free row; `visibleBoard` includes the falling piece.
- `memory.test.ts` — deck has each symbol twice; matching pair stays up; mismatch then
  `hideUnmatched` flips both down; third flip blocked while unresolved; `isWon` after all pairs.
- `cravings.test.ts` — counts only `passed`; progress clamps at 0 and 1.
- `sql.test.ts` — v4 applies; outcome and activity CHECKs; `ended_at >= started_at`.
- `content.test.ts` — every activity id matches the SQL CHECK list; activity `sourceId`s resolve.
