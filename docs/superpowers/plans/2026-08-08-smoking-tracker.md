# Smoking Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an offline-first Android quit-smoking tracker that derives time smoke-free, money saved, recovery-milestone progress and phase-appropriate coping guidance from a stored quit date, and models slips honestly.

**Architecture:** Three strict layers. `src/domain/` is pure — every function takes `now` as an argument and imports nothing from React, storage or the network. `src/data/` holds SQL as exported string constants plus a thin `expo-sqlite` binding. `app/` renders view models and contains no arithmetic. Milestone and phase text is static data in `src/content/`.

**Tech Stack:** Expo SDK 57, React Native, expo-router 57, TypeScript (strict), expo-sqlite 57, expo-notifications 57, Vitest 4 for domain/content/SQL, better-sqlite3 for SQL tests in Node, EAS Build for the `.aab`.

**Source spec:** `docs/superpowers/specs/2026-08-08-smoking-tracker-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Domain purity:** nothing in `src/domain/` may import from `src/data/`, `app/`, React, or `expo-*`. No `Date.now()`, no `new Date()` without arguments — `now: Date` is always a parameter.
- **No `any`.** `tsconfig.json` runs `strict: true`. No `@ts-ignore` without an adjacent comment naming the upstream issue.
- **No fabricated setbacks.** The app must never render an invented "days of healing lost" figure. See spec § Slip and relapse model. A slip resets only milestones whose `slipBehavior` is `restarts`.
- **Every physiological claim is attributable.** Each milestone carries a `sourceId` that resolves in `src/content/sources.ts`. A milestone without a resolvable source fails a test.
- **No network calls at runtime.** No `fetch`, no analytics, no crash reporting SDK. v1 collects nothing.
- **Money is integer minor units.** Field names end in `Minor`. No floating-point currency arithmetic anywhere.
- **Life-expectancy constant:** `MINUTES_LOST_PER_CIGARETTE = 20` (Jackson et al., *Addiction*, 2025). Displayed as "time not lost", never "life regained".
- **Danger window:** `DANGER_WINDOW_DAYS = 19`.
- **Default `cigarettesPerPack` is 20; default currency is `EUR`.**
- **Test naming:** `function_stateUnderTest_expectedBehavior`. Strict AAA with `// Arrange` / `// Act` / `// Assert` comments — except that a test with no distinct arrange step (typically one that filters a static constant) may combine them as `// Arrange & Act`. Padding such a test with an empty Arrange section to satisfy the letter of the rule is worse than combining.
- **Commit after every task.** Repo identity is already set to `adziusmaster / adzius.lech@gmail.com` — do not change it, and never add a `Co-Authored-By` trailer.

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/domain/types.ts` | Every shared type. No logic. |
| `src/domain/elapsed.ts` | Duration arithmetic and formatting inputs. |
| `src/domain/savings.ts` | Cigarettes avoided, money saved, time not lost, lifetime total. |
| `src/domain/anchors.ts` | Fast and cumulative anchor resolution; currently-smoking detection. |
| `src/domain/milestones.ts` | Milestone status, reached/projected dates, progress. |
| `src/domain/phases.ts` | Current phase resolution and danger window. |
| `src/domain/timeline.ts` | Assembles the single view model the timeline screen renders. |
| `src/content/sources.ts` | Citations, keyed by id. |
| `src/content/milestones.ts` | The 12 milestone records. |
| `src/content/phases.ts` | The 5 phase records plus the danger-window tip set. |
| `src/data/schema.ts` | `CREATE TABLE` SQL constants and the ordered migration list. |
| `src/data/queries.ts` | Every query/mutation as a named SQL constant. |
| `src/data/db.ts` | `expo-sqlite` open + migrate binding. |
| `src/data/repositories.ts` | Thin typed wrappers mapping rows to domain types. |
| `src/ui/theme.ts` | Colours, spacing, type scale. |
| `app/_layout.tsx` | Root layout, `SQLiteProvider`, onboarding gate. |
| `app/index.tsx` | Timeline (home). |
| `app/onboarding.tsx` | First-run setup. |
| `app/sos.tsx` | Craving SOS intervention. |
| `app/log.tsx` | Slip / relapse / daily check-in. |
| `app/settings.tsx` | Edit inputs, export, delete, sources, disclaimer, help links. |
| `src/notifications/schedule.ts` | Local notification scheduling. |

---

### Task 1: Scaffold, toolchain, and domain types

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `app.json`, `CLAUDE.md`
- Create: `src/domain/types.ts`
- Create: `src/domain/elapsed.ts`
- Test: `src/domain/elapsed.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every type in `src/domain/types.ts` (listed in Step 3 below); `elapsedSince(anchorIso: string, now: Date): Elapsed`.

- [ ] **Step 1: Scaffold the Expo project**

Run from `/Users/andrzej.lech/Code/private/smoking-tracker` (the directory already contains `.git`, `.gitignore` and `docs/`, so scaffold in place rather than into a subfolder):

```bash
npx create-expo-app@latest . --template blank-typescript --no-install
npm install
npx expo install expo-router expo-sqlite expo-notifications expo-constants expo-linking react-native-safe-area-context react-native-screens
npm install -D vitest@^4 better-sqlite3 @types/better-sqlite3 typescript
```

If `create-expo-app` refuses to write into a non-empty directory, scaffold to `/tmp/st-scaffold` and copy everything except `.git`, `.gitignore` and `docs/` across.

- [ ] **Step 2: Configure strict TypeScript, Vitest, and expo-router entry**

`tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

`vitest.config.ts` — domain, content and data SQL only; screens are excluded because they need a native runtime:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/{domain,content,data}/**/*.test.ts'],
  },
});
```

In `package.json` set the entry point and scripts:

```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

In `app.json`, add the router plugin and the Android package name:

```json
{
  "expo": {
    "name": "Smoke Free",
    "slug": "smoking-tracker",
    "scheme": "smokefree",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "android": { "package": "com.adzius.smokefree" },
    "plugins": ["expo-router", "expo-sqlite", "expo-notifications"]
  }
}
```

Delete the scaffolded `App.tsx` — `expo-router/entry` replaces it.

- [ ] **Step 3: Write `src/domain/types.ts`**

```ts
export type SlipBehavior = 'restarts' | 'cumulative' | 'qualitative';
export type SlipTrigger = 'alcohol' | 'stress' | 'social' | 'boredom' | 'routine' | 'other';
export type PhaseId = 'crash' | 'fog' | 'consolidation' | 'long-haul' | 'non-smoker';
export type MilestoneStatus = 'reached' | 'in-progress' | 'future';
export type SourceTier = 'a' | 'b';

export interface Settings {
  quitDate: string;            // ISO 8601 with offset
  cigarettesPerDay: number;
  cigarettesPerPack: number;
  packPriceMinor: number;      // integer minor units
  currency: string;            // ISO 4217
  timezone: string;            // IANA
  lifetimeBaseline: number;    // cigarettes smoked before quitting; 0 if unknown
}

export interface Slip {
  id: number;
  occurredAt: string;
  cigaretteCount: number;
  trigger: SlipTrigger | null;
  note: string | null;
}

export interface SmokingPeriod {
  id: number;
  startedAt: string;
  endedAt: string | null;      // null means currently smoking
  averageCigarettesPerDay: number;
  note: string | null;
}

/** Every stored fact the domain needs. */
export interface QuitState {
  settings: Settings;
  slips: Slip[];
  periods: SmokingPeriod[];
}

export interface Elapsed {
  totalMs: number;
  days: number;
  hours: number;    // remainder after days
  minutes: number;  // remainder after hours
}

export interface Anchors {
  /** Most recent nicotine intake; falls back to quitDate. Drives `restarts` milestones. */
  fast: string;
  /** End of most recent completed smoking period; falls back to quitDate. Drives `cumulative`. */
  cumulative: string;
  isCurrentlySmoking: boolean;
}

export interface Savings {
  cigarettesAvoided: number;
  moneySavedMinor: number;
  minutesNotLost: number;
  lifetimeTotal: number;
}

export interface Source {
  id: string;
  label: string;
  url: string;
  tier: SourceTier;
}

export interface Milestone {
  id: string;
  title: string;
  body: string;
  /** null only when slipBehavior is 'qualitative'. */
  offsetMs: number | null;
  /** Upper bound for ranged milestones such as 1-12 months; null otherwise. */
  offsetEndMs: number | null;
  slipBehavior: SlipBehavior;
  sourceId: string;
  phaseId: PhaseId;
}

export interface MilestoneState {
  milestone: Milestone;
  status: MilestoneStatus;
  reachedAt: string | null;
  projectedAt: string | null;
  /** 0..1, only for an in-progress ranged milestone; null otherwise. */
  progress: number | null;
}

export interface Phase {
  id: PhaseId;
  name: string;
  startMs: number;
  endMs: number | null;        // null means open-ended
  whatsHappening: string;
  whyYouFeelThisWay: string;
  howToCope: string[];
}

export interface DangerWindow {
  active: boolean;
  endsAt: string | null;
  daysRemaining: number | null;
  triggeredBySlipId: number | null;
}

export interface Chapter {
  phase: Phase;
  status: 'past' | 'current' | 'future';
  milestones: MilestoneState[];
}

export interface TimelineViewModel {
  elapsed: Elapsed;
  savings: Savings;
  anchors: Anchors;
  currentPhase: Phase;
  dangerWindow: DangerWindow;
  chapters: Chapter[];
  nextMilestone: MilestoneState | null;
}

export const MINUTES_LOST_PER_CIGARETTE = 20;
export const DANGER_WINDOW_DAYS = 19;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
```

- [ ] **Step 4: Write the failing test for `elapsedSince`**

`src/domain/elapsed.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { elapsedSince } from './elapsed';

describe('elapsedSince', () => {
  it('elapsedSince_fortyThreeDaysAndSixHours_returnsBrokenDownDuration', () => {
    // Arrange
    const anchor = '2026-06-26T08:00:00+02:00';
    const now = new Date('2026-08-08T14:30:00+02:00');

    // Act
    const result = elapsedSince(anchor, now);

    // Assert
    expect(result.days).toBe(43);
    expect(result.hours).toBe(6);
    expect(result.minutes).toBe(30);
  });

  it('elapsedSince_anchorInTheFuture_returnsAllZeros', () => {
    // Arrange
    const anchor = '2026-09-01T00:00:00Z';
    const now = new Date('2026-08-08T00:00:00Z');

    // Act
    const result = elapsedSince(anchor, now);

    // Assert
    expect(result).toEqual({ totalMs: 0, days: 0, hours: 0, minutes: 0 });
  });

  it('elapsedSince_spanningDstTransition_countsWallClockDaysCorrectly', () => {
    // Arrange — Europe/Amsterdam moved to CEST on 29 March 2026
    const anchor = '2026-03-28T12:00:00+01:00';
    const now = new Date('2026-03-30T12:00:00+02:00');

    // Act
    const result = elapsedSince(anchor, now);

    // Assert — 47 absolute hours, so 1 day and 23 hours
    expect(result.days).toBe(1);
    expect(result.hours).toBe(23);
  });
});
```

- [ ] **Step 5: Run the test and confirm it fails**

Run: `npm test -- src/domain/elapsed.test.ts`
Expected: FAIL — cannot resolve `./elapsed`.

- [ ] **Step 6: Implement `src/domain/elapsed.ts`**

```ts
import { type Elapsed, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from './types';

/**
 * Absolute duration between an ISO anchor and `now`, broken into days/hours/minutes.
 * Clamped at zero so a backdated-in-the-future anchor never renders a negative streak.
 */
export function elapsedSince(anchorIso: string, now: Date): Elapsed {
  const totalMs = Math.max(0, now.getTime() - new Date(anchorIso).getTime());

  return {
    totalMs,
    days: Math.floor(totalMs / MS_PER_DAY),
    hours: Math.floor((totalMs % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((totalMs % MS_PER_HOUR) / MS_PER_MINUTE),
  };
}
```

- [ ] **Step 7: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: 3 passing tests, no type errors.

- [ ] **Step 8: Write `CLAUDE.md`**

```markdown
# Smoking Tracker

Offline-first Android quit-smoking tracker. Expo SDK 57 + expo-router, TypeScript strict,
expo-sqlite. No backend, no network calls, no analytics.

The repository's global .NET standards do not apply here. These are the equivalents.

## Layering

- `src/domain/` is PURE. No React, no `expo-*`, no `src/data/` imports, no I/O.
  `now: Date` is always a parameter — never call `Date.now()` or argless `new Date()`.
- `src/content/` is static data with no logic.
- `src/data/` holds SQL as exported string constants (`schema.ts`, `queries.ts`) plus a
  thin `expo-sqlite` binding. SQL constants are tested in Node with better-sqlite3
  because `expo-sqlite` is a native module and cannot run under Vitest.
- `app/` renders view models. Screens contain no arithmetic.

## Rules

- `strict: true`, no `any`, no `@ts-ignore` without a comment naming the upstream issue.
- Money is integer minor units; field names end in `Minor`.
- Every milestone carries a `sourceId` that resolves in `src/content/sources.ts`.
- Never render a fabricated "days of healing lost" figure. See the design spec.

## Testing

Vitest. `function_stateUnderTest_expectedBehavior` naming, strict AAA with
`// Arrange` / `// Act` / `// Assert` comments. Minimum one happy path and two
sad paths or edge cases per module.

## Commands

`npm test` · `npm run typecheck` · `npm start` · `npm run android`
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Expo app, strict TS, Vitest, domain types and elapsed"
```

---

### Task 2: Savings arithmetic

**Files:**
- Create: `src/domain/savings.ts`
- Test: `src/domain/savings.test.ts`

**Interfaces:**
- Consumes: `QuitState`, `Savings`, `MINUTES_LOST_PER_CIGARETTE`, `MS_PER_DAY` from `src/domain/types.ts`.
- Produces: `computeSavings(state: QuitState, now: Date): Savings`; `smokedDuringPeriods(periods: SmokingPeriod[], now: Date): number`.

Counting runs from the **original** `quitDate`, not from either anchor — cigarettes avoided and money saved are lifetime totals and must not collapse to zero because of one slip. A slip subtracts exactly the cigarettes smoked.

- [ ] **Step 1: Write the failing tests**

`src/domain/savings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeSavings } from './savings';
import type { QuitState } from './types';

const baseState = (overrides: Partial<QuitState> = {}): QuitState => ({
  settings: {
    quitDate: '2026-06-26T08:00:00+02:00',
    cigarettesPerDay: 15,
    cigarettesPerPack: 20,
    packPriceMinor: 1100,
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    lifetimeBaseline: 43_800,
  },
  slips: [],
  periods: [],
  ...overrides,
});

describe('computeSavings', () => {
  it('computeSavings_fortyThreeCleanDays_returnsAvoidedMoneyAndTimeNotLost', () => {
    // Arrange
    const state = baseState();
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert — 43 days x 15 = 645 cigarettes; 645 x 1100 / 20 = 35_475 minor units
    expect(result.cigarettesAvoided).toBe(645);
    expect(result.moneySavedMinor).toBe(35_475);
    expect(result.minutesNotLost).toBe(12_900);
    expect(result.lifetimeTotal).toBe(43_800);
  });

  it('computeSavings_withSlip_subtractsOnlyTheCigarettesSmoked', () => {
    // Arrange
    const state = baseState({
      slips: [{ id: 1, occurredAt: '2026-08-05T22:00:00+02:00', cigaretteCount: 3, trigger: 'alcohol', note: null }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert
    expect(result.cigarettesAvoided).toBe(642);
    expect(result.lifetimeTotal).toBe(43_803);
  });

  it('computeSavings_withCompletedRelapsePeriod_subtractsPeriodConsumption', () => {
    // Arrange — a 10-day relapse at 20/day = 200 cigarettes
    const state = baseState({
      periods: [{
        id: 1,
        startedAt: '2026-07-01T00:00:00+02:00',
        endedAt: '2026-07-11T00:00:00+02:00',
        averageCigarettesPerDay: 20,
        note: null,
      }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert
    expect(result.cigarettesAvoided).toBe(445);
    expect(result.lifetimeTotal).toBe(44_000);
  });

  it('computeSavings_relapseLongerThanQuitAttempt_clampsAvoidedAtZero', () => {
    // Arrange
    const state = baseState({
      slips: [{ id: 1, occurredAt: '2026-08-01T00:00:00+02:00', cigaretteCount: 9_999, trigger: null, note: null }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert
    expect(result.cigarettesAvoided).toBe(0);
    expect(result.moneySavedMinor).toBe(0);
    expect(result.minutesNotLost).toBe(0);
  });

  it('computeSavings_openRelapsePeriod_countsConsumptionUpToNow', () => {
    // Arrange — still smoking, started 4 days ago at 20/day
    const state = baseState({
      periods: [{ id: 1, startedAt: '2026-08-04T08:00:00+02:00', endedAt: null, averageCigarettesPerDay: 20, note: null }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert — 645 - (4 x 20) = 565
    expect(result.cigarettesAvoided).toBe(565);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/domain/savings.test.ts`
Expected: FAIL — cannot resolve `./savings`.

- [ ] **Step 3: Implement `src/domain/savings.ts`**

```ts
import {
  MINUTES_LOST_PER_CIGARETTE,
  MS_PER_DAY,
  type QuitState,
  type Savings,
  type SmokingPeriod,
} from './types';

/** Estimated cigarettes consumed during logged smoking periods, open periods counted to `now`. */
export function smokedDuringPeriods(periods: SmokingPeriod[], now: Date): number {
  return periods.reduce((total, period) => {
    const start = new Date(period.startedAt).getTime();
    const end = period.endedAt ? new Date(period.endedAt).getTime() : now.getTime();
    const days = Math.max(0, end - start) / MS_PER_DAY;
    return total + days * period.averageCigarettesPerDay;
  }, 0);
}

export function computeSavings(state: QuitState, now: Date): Savings {
  const { settings, slips, periods } = state;

  const elapsedDays = Math.max(0, now.getTime() - new Date(settings.quitDate).getTime()) / MS_PER_DAY;
  const wouldHaveSmoked = elapsedDays * settings.cigarettesPerDay;

  const slipCigarettes = slips.reduce((total, slip) => total + slip.cigaretteCount, 0);
  const periodCigarettes = smokedDuringPeriods(periods, now);
  const actuallySmoked = slipCigarettes + periodCigarettes;

  const cigarettesAvoided = Math.max(0, Math.round(wouldHaveSmoked - actuallySmoked));

  return {
    cigarettesAvoided,
    // Integer arithmetic first, then divide, so pack price never drifts through a float.
    moneySavedMinor: Math.round((cigarettesAvoided * settings.packPriceMinor) / settings.cigarettesPerPack),
    minutesNotLost: cigarettesAvoided * MINUTES_LOST_PER_CIGARETTE,
    lifetimeTotal: settings.lifetimeBaseline + Math.round(actuallySmoked),
  };
}
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all passing, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/domain/savings.ts src/domain/savings.test.ts
git commit -m "feat: cigarettes avoided, money saved and time-not-lost arithmetic"
```

---

### Task 3: Anchor resolution

**Files:**
- Create: `src/domain/anchors.ts`
- Test: `src/domain/anchors.test.ts`

**Interfaces:**
- Consumes: `QuitState`, `Anchors` from `src/domain/types.ts`.
- Produces: `resolveAnchors(state: QuitState, now: Date): Anchors`.

The **fast** anchor is the latest nicotine intake — the most recent of all slip timestamps and all smoking-period ends. The **cumulative** anchor is the end of the most recent *completed* smoking period, and slips never move it, because every risk-reduction figure in the literature is measured from sustained cessation.

- [ ] **Step 1: Write the failing tests**

`src/domain/anchors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveAnchors } from './anchors';
import type { QuitState } from './types';

const QUIT = '2026-06-26T08:00:00+02:00';

const state = (overrides: Partial<QuitState> = {}): QuitState => ({
  settings: {
    quitDate: QUIT,
    cigarettesPerDay: 15,
    cigarettesPerPack: 20,
    packPriceMinor: 1100,
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    lifetimeBaseline: 0,
  },
  slips: [],
  periods: [],
  ...overrides,
});

const now = new Date('2026-08-08T08:00:00+02:00');

describe('resolveAnchors', () => {
  it('resolveAnchors_noSlipsOrPeriods_bothAnchorsAreQuitDate', () => {
    // Arrange
    const input = state();

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.fast).toBe(QUIT);
    expect(result.cumulative).toBe(QUIT);
    expect(result.isCurrentlySmoking).toBe(false);
  });

  it('resolveAnchors_withSlip_movesFastAnchorButNotCumulative', () => {
    // Arrange
    const slipAt = '2026-08-05T22:00:00+02:00';
    const input = state({ slips: [{ id: 1, occurredAt: slipAt, cigaretteCount: 3, trigger: 'social', note: null }] });

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.fast).toBe(slipAt);
    expect(result.cumulative).toBe(QUIT);
  });

  it('resolveAnchors_multipleSlips_usesMostRecent', () => {
    // Arrange
    const input = state({
      slips: [
        { id: 1, occurredAt: '2026-07-04T20:00:00+02:00', cigaretteCount: 1, trigger: null, note: null },
        { id: 2, occurredAt: '2026-08-05T22:00:00+02:00', cigaretteCount: 3, trigger: null, note: null },
      ],
    });

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.fast).toBe('2026-08-05T22:00:00+02:00');
  });

  it('resolveAnchors_completedRelapsePeriod_movesCumulativeAnchorToItsEnd', () => {
    // Arrange
    const endedAt = '2026-07-11T00:00:00+02:00';
    const input = state({
      periods: [{ id: 1, startedAt: '2026-07-01T00:00:00+02:00', endedAt, averageCigarettesPerDay: 20, note: null }],
    });

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.cumulative).toBe(endedAt);
    expect(result.fast).toBe(endedAt);
    expect(result.isCurrentlySmoking).toBe(false);
  });

  it('resolveAnchors_openRelapsePeriod_reportsCurrentlySmoking', () => {
    // Arrange
    const input = state({
      periods: [{ id: 1, startedAt: '2026-08-04T08:00:00+02:00', endedAt: null, averageCigarettesPerDay: 20, note: null }],
    });

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.isCurrentlySmoking).toBe(true);
  });

  it('resolveAnchors_slipOlderThanRelapseEnd_prefersTheRelapseEndForFastAnchor', () => {
    // Arrange
    const input = state({
      slips: [{ id: 1, occurredAt: '2026-07-02T12:00:00+02:00', cigaretteCount: 2, trigger: null, note: null }],
      periods: [{ id: 1, startedAt: '2026-07-01T00:00:00+02:00', endedAt: '2026-07-11T00:00:00+02:00', averageCigarettesPerDay: 20, note: null }],
    });

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.fast).toBe('2026-07-11T00:00:00+02:00');
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/domain/anchors.test.ts`
Expected: FAIL — cannot resolve `./anchors`.

- [ ] **Step 3: Implement `src/domain/anchors.ts`**

```ts
import type { Anchors, QuitState } from './types';

/** Returns whichever ISO timestamp is later. */
function latest(a: string, b: string): string {
  return new Date(b).getTime() > new Date(a).getTime() ? b : a;
}

export function resolveAnchors(state: QuitState, _now: Date): Anchors {
  const { settings, slips, periods } = state;
  const completedEnds = periods
    .map((period) => period.endedAt)
    .filter((endedAt): endedAt is string => endedAt !== null);

  // Cumulative recovery is measured from sustained cessation, so only a completed
  // relapse period moves it. A slip never does.
  const cumulative = completedEnds.reduce(latest, settings.quitDate);

  // The fast anchor tracks the most recent nicotine in the bloodstream, whatever its source.
  const fast = slips.map((slip) => slip.occurredAt).reduce(latest, cumulative);

  return {
    fast,
    cumulative,
    isCurrentlySmoking: periods.some((period) => period.endedAt === null),
  };
}
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/domain/anchors.ts src/domain/anchors.test.ts
git commit -m "feat: fast and cumulative anchor resolution for slips and relapses"
```

---

### Task 4: Sources and milestone content

**Files:**
- Create: `src/content/sources.ts`
- Create: `src/content/milestones.ts`
- Test: `src/content/content.test.ts`

**Interfaces:**
- Consumes: `Milestone`, `Source`, `MS_PER_DAY`, `MS_PER_HOUR`, `MS_PER_MINUTE` from `src/domain/types.ts`.
- Produces: `SOURCES: Record<string, Source>`; `MILESTONES: Milestone[]`.

- [ ] **Step 1: Write `src/content/sources.ts`**

```ts
import type { Source } from '@/domain/types';

/**
 * Tier 'a' is a primary or authoritative secondary source (ACS, peer-reviewed).
 * Tier 'b' is general health media — phrase tier-b milestone copy more tentatively.
 */
export const SOURCES: Record<string, Source> = {
  acs: {
    id: 'acs',
    label: 'American Cancer Society — Health Benefits of Quitting Smoking Over Time',
    url: 'https://www.cancer.org/cancer/risk-prevention/tobacco/benefits-of-quitting-smoking-over-time.html',
    tier: 'a',
  },
  'co-halflife': {
    id: 'co-halflife',
    label: 'Carbon monoxide half-life 4–5 hours; nicotine ~2 h, cotinine ~16–20 h',
    url: 'https://www.healthline.com/health/quit-smoking/how-long-does-nicotine-stay-in-your-system',
    tier: 'b',
  },
  'withdrawal-peak': {
    id: 'withdrawal-peak',
    label: 'Cleveland Clinic — Nicotine withdrawal begins 4–24 h, peaks around day 3, fades over 3–4 weeks',
    url: 'https://my.clevelandclinic.org/health/diseases/21587-nicotine-withdrawal',
    tier: 'a',
  },
  'taste-smell': {
    id: 'taste-smell',
    label: 'Medical News Today — Timeline after quitting smoking',
    url: 'https://www.medicalnewstoday.com/articles/317956',
    tier: 'b',
  },
  nachr: {
    id: 'nachr',
    label: 'Cosgrove et al. — Smoking upregulates α4β2* nicotinic receptors in the human brain (2007)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/17997038/',
    tier: 'a',
  },
  'life-expectancy': {
    id: 'life-expectancy',
    label: 'Jackson et al. — The price of a cigarette: 20 minutes of life? (Addiction, 2025)',
    url: 'https://onlinelibrary.wiley.com/doi/10.1111/add.16757',
    tier: 'a',
  },
  'lapse-relapse': {
    id: 'lapse-relapse',
    label: 'NHS — Getting back on track after a smoking relapse',
    url: 'https://www.nhs.uk/better-health/quit-smoking/staying-smoke-free/get-back-on-track-after-a-smoking-relapse/',
    tier: 'a',
  },
};
```

- [ ] **Step 2: Write `src/content/milestones.ts`**

Deliberately excluded: "48 hours — nerve endings start to regrow" and "72 hours — bronchial tubes relax". Both appear in most online quit timelines but are absent from the ACS and CDC timelines and could not be traced to a primary source. Do not add them.

```ts
import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, type Milestone } from '@/domain/types';

const DAYS = (n: number) => n * MS_PER_DAY;
const YEARS = (n: number) => n * 365.25 * MS_PER_DAY;
const MONTHS = (n: number) => n * 30.44 * MS_PER_DAY;

export const MILESTONES: Milestone[] = [
  {
    id: 'heart-rate',
    title: 'Heart rate drops toward normal',
    body: 'Your pulse begins returning to its normal resting range.',
    offsetMs: 20 * MS_PER_MINUTE,
    offsetEndMs: null,
    slipBehavior: 'restarts',
    sourceId: 'acs',
    phaseId: 'crash',
  },
  {
    id: 'carbon-monoxide',
    title: 'Carbon monoxide clears your blood',
    body: 'Blood carbon monoxide returns to a non-smoker’s range, so oxygen moves freely again. CO has a half-life of 4–5 hours, which is why this one takes about a day.',
    offsetMs: 24 * MS_PER_HOUR,
    offsetEndMs: null,
    slipBehavior: 'restarts',
    sourceId: 'acs',
    phaseId: 'crash',
  },
  {
    id: 'nicotine-cleared',
    title: 'Nicotine fully cleared',
    body: 'Nothing left in your bloodstream. Nicotine has a half-life of about 2 hours and its metabolite cotinine about 16–20.',
    offsetMs: DAYS(3),
    offsetEndMs: null,
    slipBehavior: 'restarts',
    sourceId: 'co-halflife',
    phaseId: 'crash',
  },
  {
    id: 'withdrawal-peak',
    title: 'The withdrawal peak is behind you',
    body: 'Symptoms usually start within 4–24 hours and peak around day 3. This is the hardest it gets, and it is now behind you.',
    offsetMs: DAYS(3),
    offsetEndMs: null,
    slipBehavior: 'restarts',
    sourceId: 'withdrawal-peak',
    phaseId: 'crash',
  },
  {
    id: 'taste-smell',
    title: 'Taste, smell and energy improve',
    body: 'Most people notice food tasting like food again, easier breathing and more energy around this point.',
    offsetMs: DAYS(14),
    offsetEndMs: null,
    slipBehavior: 'cumulative',
    sourceId: 'taste-smell',
    phaseId: 'fog',
  },
  {
    id: 'craving-adaptation',
    title: 'Craving intensity and receptor adaptation',
    body: 'Smoking increases the density of nicotine receptors in your brain, and abstinence lets that adaptation unwind. There is good evidence the change happens, but no reliable timeline for when it finishes — so this milestone has no date and no progress bar.',
    offsetMs: null,
    offsetEndMs: null,
    slipBehavior: 'qualitative',
    sourceId: 'nachr',
    phaseId: 'consolidation',
  },
  {
    id: 'cough-breathlessness',
    title: 'Coughing and breathlessness decrease',
    body: 'The cilia lining your airways have regrown enough to clear tar, which is also why the cough can get worse before it gets better.',
    offsetMs: MONTHS(1),
    offsetEndMs: MONTHS(12),
    slipBehavior: 'cumulative',
    sourceId: 'acs',
    phaseId: 'consolidation',
  },
  {
    id: 'heart-attack-risk',
    title: 'Heart attack risk drops sharply',
    body: 'The single biggest cardiovascular payoff of quitting.',
    offsetMs: YEARS(1),
    offsetEndMs: YEARS(2),
    slipBehavior: 'cumulative',
    sourceId: 'acs',
    phaseId: 'long-haul',
  },
  {
    id: 'oral-cancer-stroke',
    title: 'Mouth, throat and larynx cancer risk halves',
    body: 'Stroke risk falls over the same period.',
    offsetMs: YEARS(5),
    offsetEndMs: YEARS(10),
    slipBehavior: 'cumulative',
    sourceId: 'acs',
    phaseId: 'long-haul',
  },
  {
    id: 'lung-cancer-halved',
    title: 'Lung cancer risk about half that of a smoker',
    body: 'Bladder, kidney and oesophageal cancer risk fall as well.',
    offsetMs: YEARS(10),
    offsetEndMs: null,
    slipBehavior: 'cumulative',
    sourceId: 'acs',
    phaseId: 'non-smoker',
  },
  {
    id: 'chd-nonsmoker',
    title: 'Coronary heart disease risk close to a non-smoker’s',
    body: 'Fifteen years of sustained abstinence brings your heart disease risk near someone who never smoked.',
    offsetMs: YEARS(15),
    offsetEndMs: null,
    slipBehavior: 'cumulative',
    sourceId: 'acs',
    phaseId: 'non-smoker',
  },
  {
    id: 'multi-cancer-nonsmoker',
    title: 'Several cancer risks close to a non-smoker’s',
    body: 'Mouth, throat, larynx and pancreatic cancer risk approach that of someone who does not smoke.',
    offsetMs: YEARS(20),
    offsetEndMs: null,
    slipBehavior: 'cumulative',
    sourceId: 'acs',
    phaseId: 'non-smoker',
  },
];
```

- [ ] **Step 3: Write the content schema tests**

`src/content/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MILESTONES } from './milestones';
import { SOURCES } from './sources';

describe('MILESTONES', () => {
  it('MILESTONES_everyRecord_hasResolvableSourceId', () => {
    // Arrange
    const knownSourceIds = new Set(Object.keys(SOURCES));

    // Act
    const unresolved = MILESTONES.filter((m) => !knownSourceIds.has(m.sourceId));

    // Assert
    expect(unresolved.map((m) => m.id)).toEqual([]);
  });

  it('MILESTONES_everyRecord_hasUniqueId', () => {
    // Arrange
    const ids = MILESTONES.map((m) => m.id);

    // Act
    const unique = new Set(ids);

    // Assert
    expect(unique.size).toBe(ids.length);
  });

  it('MILESTONES_datedRecords_haveAnOffsetAndQualitativeOnesDoNot', () => {
    // Arrange & Act
    const datedWithoutOffset = MILESTONES.filter((m) => m.slipBehavior !== 'qualitative' && m.offsetMs === null);
    const qualitativeWithOffset = MILESTONES.filter((m) => m.slipBehavior === 'qualitative' && m.offsetMs !== null);

    // Assert
    expect(datedWithoutOffset).toEqual([]);
    expect(qualitativeWithOffset).toEqual([]);
  });

  it('MILESTONES_rangedRecords_haveEndAfterStart', () => {
    // Arrange & Act
    const inverted = MILESTONES.filter(
      (m) => m.offsetEndMs !== null && m.offsetMs !== null && m.offsetEndMs <= m.offsetMs,
    );

    // Assert
    expect(inverted.map((m) => m.id)).toEqual([]);
  });

  it('MILESTONES_excludedUnsourcedClaims_areAbsent', () => {
    // Arrange — these circulate widely online but are not in the ACS or CDC timelines
    const banned = ['nerve-endings', 'bronchial-tubes'];

    // Act
    const present = MILESTONES.filter((m) => banned.includes(m.id));

    // Assert
    expect(present).toEqual([]);
  });
});
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all passing. If `@/domain/types` fails to resolve under Vitest, add the alias to `vitest.config.ts`:

```ts
import path from 'node:path';
// inside defineConfig:
resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
```

- [ ] **Step 5: Commit**

```bash
git add src/content vitest.config.ts
git commit -m "feat: cited milestone content with source tiers and schema tests"
```

---

### Task 5: Phase content

**Files:**
- Create: `src/content/phases.ts`
- Modify: `src/content/content.test.ts` (append a `PHASES` describe block)

**Interfaces:**
- Consumes: `Phase`, `PhaseId`, `MS_PER_DAY` from `src/domain/types.ts`.
- Produces: `PHASES: Phase[]` (ordered, contiguous); `DANGER_WINDOW_TIPS: { whatsHappening: string; whyYouFeelThisWay: string; howToCope: string[] }`.

- [ ] **Step 1: Write `src/content/phases.ts`**

```ts
import { MS_PER_DAY, type Phase } from '@/domain/types';

const DAYS = (n: number) => n * MS_PER_DAY;
const MONTHS = (n: number) => n * 30.44 * MS_PER_DAY;
const YEARS = (n: number) => n * 365.25 * MS_PER_DAY;

/** Ordered and contiguous: each phase starts exactly where the previous one ends. */
export const PHASES: Phase[] = [
  {
    id: 'crash',
    name: 'The Crash',
    startMs: 0,
    endMs: DAYS(3),
    whatsHappening: 'Nicotine is leaving your body. Blood carbon monoxide normalises within about a day, and nicotine is gone within three.',
    whyYouFeelThisWay: 'Withdrawal starts within 4–24 hours and peaks around day 3. Irritability, headaches, mood swings and relentless cravings are your nervous system recalibrating, not a character flaw.',
    howToCope: [
      'Use the 4 Ds when a craving hits: delay, deep breathe, drink water, distract. It peaks and passes in 3–5 minutes.',
      'Avoid alcohol entirely this week. It removes exactly the judgement you are relying on.',
      'Change your routine where you used to smoke — different route, different coffee spot, different break.',
      'Nicotine replacement is not cheating. Patches, gum or lozenges roughly double your odds.',
      'This is the worst it gets. Every hour from here is downhill.',
    ],
  },
  {
    id: 'fog',
    name: 'The Fog',
    startMs: DAYS(3),
    endMs: DAYS(28),
    whatsHappening: 'Physical withdrawal is fading. Taste and smell start returning around two weeks.',
    whyYouFeelThisWay: 'The sharp cravings give way to something duller — broken sleep, a bigger appetite, and genuine trouble concentrating. Withdrawal insomnia usually resolves within 1–2 weeks and the rest fades over 3–4.',
    howToCope: [
      'Protect your sleep: same bedtime, no caffeine after mid-afternoon, screens down early.',
      'Eat properly and drink water. Appetite changes are normal and temporary.',
      'Move your body daily, even a walk. It blunts cravings and helps you sleep.',
      'Expect the brain fog. Do not make this the week you take on something hard at work.',
    ],
  },
  {
    id: 'consolidation',
    name: 'Consolidation',
    startMs: DAYS(28),
    endMs: MONTHS(6),
    whatsHappening: 'Your airways are clearing. Coughing and breathlessness decrease across the first year.',
    whyYouFeelThisWay: 'The chemistry is over. What is left is situational — cravings triggered by a place, a mood or a person, lasting 3–5 minutes whether you feed them or not.',
    howToCope: [
      'The risk now is complacency. "I could handle just one" is a symptom, not a plan.',
      'Name your remaining triggers and have a specific answer ready for each one.',
      'Bank the money somewhere visible. Abstract savings do not motivate; a number that grows does.',
      'If the cough got worse before it got better, that is cilia clearing tar. It is progress, not damage.',
    ],
  },
  {
    id: 'long-haul',
    name: 'The Long Haul',
    startMs: MONTHS(6),
    endMs: YEARS(10),
    whatsHappening: 'The risk curves bend. Heart attack risk drops sharply in years 1–2; mouth, throat and larynx cancer risk halves across years 5–10.',
    whyYouFeelThisWay: 'You are a non-smoker now, and it mostly feels like nothing. Occasional ambush cravings still arrive with stress, grief or alcohol, sometimes years in.',
    howToCope: [
      'An ambush craving after two years is normal and means nothing about your progress.',
      'Do not test yourself. There is no version of one cigarette that proves you are in control.',
      'Keep the reason you quit somewhere you will see it.',
    ],
  },
  {
    id: 'non-smoker',
    name: 'Non-Smoker',
    startMs: YEARS(10),
    endMs: null,
    whatsHappening: 'Lung cancer risk is about half a smoker’s. By year 15 coronary heart disease risk is close to someone who never smoked, and by year 20 several cancer risks are too.',
    whyYouFeelThisWay: 'Nothing to manage. Smoking is something you used to do.',
    howToCope: [
      'You are statistically close to someone who never started. That is the whole point.',
    ],
  },
];

/** Overrides the active phase’s tips while a post-slip danger window is open. */
export const DANGER_WINDOW_TIPS = {
  whatsHappening: 'You logged a slip. The fast-moving markers — carbon monoxide and nicotine — restarted from that cigarette. Everything measured in months and years kept going, because those depend on cumulative exposure and one cigarette barely registers against it.',
  whyYouFeelThisWay: 'A single slip is the strongest known predictor of a full return to smoking, and the average slide from lapse to relapse takes about 19 days. You are in that window now. The pull you are feeling is real and well documented — it is not weakness.',
  howToCope: [
    'Re-commit today, not tomorrow. Immediacy is the single biggest factor in whether a slip stays a slip.',
    'One cigarette is not a failed quit attempt. Treating it as one is what turns it into a relapse.',
    'Write down what actually happened before you forget — where you were, who you were with, what you felt.',
    'Remove the means. Get rid of anything you bought.',
    'If you are near the person or place it happened, avoid it for the rest of this window.',
  ],
} as const;
```

- [ ] **Step 2: Append the phase tests to `src/content/content.test.ts`**

```ts
import { PHASES } from './phases';

describe('PHASES', () => {
  it('PHASES_wholeSet_coversTimeContiguouslyFromZero', () => {
    // Arrange
    const first = PHASES[0];

    // Act & Assert
    expect(first?.startMs).toBe(0);
    for (let i = 1; i < PHASES.length; i += 1) {
      expect(PHASES[i]?.startMs).toBe(PHASES[i - 1]?.endMs);
    }
  });

  it('PHASES_lastPhase_isOpenEnded', () => {
    // Arrange & Act
    const last = PHASES[PHASES.length - 1];

    // Assert
    expect(last?.endMs).toBeNull();
  });

  it('PHASES_everyPhase_hasAtLeastOneCopingTip', () => {
    // Arrange & Act
    const empty = PHASES.filter((phase) => phase.howToCope.length === 0);

    // Assert
    expect(empty.map((phase) => phase.id)).toEqual([]);
  });

  it('MILESTONES_everyPhaseId_matchesAKnownPhase', () => {
    // Arrange
    const knownPhaseIds = new Set(PHASES.map((phase) => phase.id));

    // Act
    const orphans = MILESTONES.filter((m) => !knownPhaseIds.has(m.phaseId));

    // Assert
    expect(orphans.map((m) => m.id)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all passing.

- [ ] **Step 4: Commit**

```bash
git add src/content/phases.ts src/content/content.test.ts
git commit -m "feat: five-phase content with coping tips and danger-window overrides"
```

---

### Task 6: Milestone state resolution

**Files:**
- Create: `src/domain/milestones.ts`
- Test: `src/domain/milestones.test.ts`

**Interfaces:**
- Consumes: `resolveAnchors` from `src/domain/anchors.ts`; `Anchors`, `Milestone`, `MilestoneState` from types.
- Produces: `resolveMilestone(milestone: Milestone, anchors: Anchors, now: Date): MilestoneState`; `resolveMilestones(milestones: Milestone[], anchors: Anchors, now: Date): MilestoneState[]`; `anchorFor(milestone: Milestone, anchors: Anchors): string | null`.

Status rules. A `qualitative` milestone is always `in-progress` with `progress: null`. A milestone with `offsetEndMs` is `reached` once `now` passes the end, `in-progress` between start and end (with fractional progress), `future` before the start. A milestone without `offsetEndMs` is `reached` at or after its offset and `future` before it — never `in-progress`.

- [ ] **Step 1: Write the failing tests**

`src/domain/milestones.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { anchorFor, resolveMilestone } from './milestones';
import { MS_PER_DAY, MS_PER_HOUR, type Anchors, type Milestone } from './types';

const QUIT = '2026-06-26T08:00:00+02:00';
const SLIP = '2026-08-05T22:00:00+02:00';

const anchors: Anchors = { fast: SLIP, cumulative: QUIT, isCurrentlySmoking: false };

const milestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'test',
  title: 'Test',
  body: 'Body',
  offsetMs: 24 * MS_PER_HOUR,
  offsetEndMs: null,
  slipBehavior: 'restarts',
  sourceId: 'acs',
  phaseId: 'crash',
  ...overrides,
});

describe('anchorFor', () => {
  it('anchorFor_restartsMilestone_returnsFastAnchor', () => {
    // Arrange
    const m = milestone({ slipBehavior: 'restarts' });

    // Act
    const result = anchorFor(m, anchors);

    // Assert
    expect(result).toBe(SLIP);
  });

  it('anchorFor_cumulativeMilestone_returnsCumulativeAnchor', () => {
    // Arrange
    const m = milestone({ slipBehavior: 'cumulative' });

    // Act
    const result = anchorFor(m, anchors);

    // Assert
    expect(result).toBe(QUIT);
  });

  it('anchorFor_qualitativeMilestone_returnsNull', () => {
    // Arrange
    const m = milestone({ slipBehavior: 'qualitative', offsetMs: null });

    // Act
    const result = anchorFor(m, anchors);

    // Assert
    expect(result).toBeNull();
  });
});

describe('resolveMilestone', () => {
  it('resolveMilestone_restartsMilestoneAfterSlip_isFutureAgain', () => {
    // Arrange — 24 h milestone, slip was only 10 h before now
    const m = milestone({ offsetMs: 24 * MS_PER_HOUR, slipBehavior: 'restarts' });
    const now = new Date('2026-08-06T08:00:00+02:00');

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('future');
    expect(result.projectedAt).toBe(new Date(new Date(SLIP).getTime() + 24 * MS_PER_HOUR).toISOString());
    expect(result.reachedAt).toBeNull();
  });

  it('resolveMilestone_cumulativeMilestoneAfterSlip_staysReached', () => {
    // Arrange — 14-day milestone, quit 43 days ago, slip 3 days ago
    const m = milestone({ offsetMs: 14 * MS_PER_DAY, slipBehavior: 'cumulative' });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert — the slip must not undo this
    expect(result.status).toBe('reached');
    expect(result.reachedAt).toBe(new Date(new Date(QUIT).getTime() + 14 * MS_PER_DAY).toISOString());
  });

  it('resolveMilestone_exactlyOnTheBoundary_countsAsReached', () => {
    // Arrange
    const m = milestone({ offsetMs: 14 * MS_PER_DAY, slipBehavior: 'cumulative' });
    const now = new Date(new Date(QUIT).getTime() + 14 * MS_PER_DAY);

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('reached');
  });

  it('resolveMilestone_rangedMilestoneMidRange_isInProgressWithFractionalProgress', () => {
    // Arrange — range 0–100 days, now is day 25 since the cumulative anchor
    const m = milestone({ offsetMs: 0, offsetEndMs: 100 * MS_PER_DAY, slipBehavior: 'cumulative' });
    const now = new Date(new Date(QUIT).getTime() + 25 * MS_PER_DAY);

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('in-progress');
    expect(result.progress).toBeCloseTo(0.25, 5);
  });

  it('resolveMilestone_rangedMilestonePastEnd_isReachedWithNullProgress', () => {
    // Arrange
    const m = milestone({ offsetMs: 0, offsetEndMs: 10 * MS_PER_DAY, slipBehavior: 'cumulative' });
    const now = new Date(new Date(QUIT).getTime() + 40 * MS_PER_DAY);

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('reached');
    expect(result.progress).toBeNull();
  });

  it('resolveMilestone_qualitativeMilestone_isAlwaysInProgressWithoutDates', () => {
    // Arrange
    const m = milestone({ slipBehavior: 'qualitative', offsetMs: null });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('in-progress');
    expect(result.progress).toBeNull();
    expect(result.reachedAt).toBeNull();
    expect(result.projectedAt).toBeNull();
  });

  it('resolveMilestone_unreachedNonRangedMilestone_isNeverInProgress', () => {
    // Arrange — 10-year milestone, only 43 days in
    const m = milestone({ offsetMs: 3652 * MS_PER_DAY, offsetEndMs: null, slipBehavior: 'cumulative' });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('future');
    expect(result.progress).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/domain/milestones.test.ts`
Expected: FAIL — cannot resolve `./milestones`.

- [ ] **Step 3: Implement `src/domain/milestones.ts`**

```ts
import type { Anchors, Milestone, MilestoneState } from './types';

/** Which anchor a milestone measures from. `qualitative` milestones have no anchor. */
export function anchorFor(milestone: Milestone, anchors: Anchors): string | null {
  switch (milestone.slipBehavior) {
    case 'restarts':
      return anchors.fast;
    case 'cumulative':
      return anchors.cumulative;
    case 'qualitative':
      return null;
  }
}

export function resolveMilestone(milestone: Milestone, anchors: Anchors, now: Date): MilestoneState {
  const anchorIso = anchorFor(milestone, anchors);

  // Qualitative milestones are narrative: no date, no bar, always ongoing.
  if (anchorIso === null || milestone.offsetMs === null) {
    return { milestone, status: 'in-progress', reachedAt: null, projectedAt: null, progress: null };
  }

  const anchorMs = new Date(anchorIso).getTime();
  const startMs = anchorMs + milestone.offsetMs;
  const endMs = milestone.offsetEndMs === null ? null : anchorMs + milestone.offsetEndMs;
  const nowMs = now.getTime();

  const completionMs = endMs ?? startMs;

  if (nowMs >= completionMs) {
    return {
      milestone,
      status: 'reached',
      reachedAt: new Date(completionMs).toISOString(),
      projectedAt: null,
      progress: null,
    };
  }

  // Between start and end of a ranged milestone: genuinely underway.
  if (endMs !== null && nowMs >= startMs) {
    return {
      milestone,
      status: 'in-progress',
      reachedAt: null,
      projectedAt: new Date(endMs).toISOString(),
      progress: (nowMs - startMs) / (endMs - startMs),
    };
  }

  return {
    milestone,
    status: 'future',
    reachedAt: null,
    projectedAt: new Date(completionMs).toISOString(),
    progress: null,
  };
}

export function resolveMilestones(milestones: Milestone[], anchors: Anchors, now: Date): MilestoneState[] {
  return milestones.map((milestone) => resolveMilestone(milestone, anchors, now));
}
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/domain/milestones.ts src/domain/milestones.test.ts
git commit -m "feat: milestone status resolution honouring per-milestone slip behaviour"
```

---

### Task 7: Phase resolution and danger window

**Files:**
- Create: `src/domain/phases.ts`
- Test: `src/domain/phases.test.ts`

**Interfaces:**
- Consumes: `Anchors`, `DangerWindow`, `Phase`, `Slip`, `DANGER_WINDOW_DAYS`, `MS_PER_DAY` from types.
- Produces: `resolvePhase(phases: Phase[], anchors: Anchors, now: Date): Phase`; `resolveDangerWindow(slips: Slip[], now: Date): DangerWindow`.

`resolvePhase` reads the **cumulative** anchor, not the fast one. A single cigarette after six weeks does not reproduce day-one withdrawal, so dropping the user back into "The Crash" would be both wrong and punitive. The post-slip state is expressed through the danger window instead.

- [ ] **Step 1: Write the failing tests**

`src/domain/phases.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveDangerWindow, resolvePhase } from './phases';
import { MS_PER_DAY, type Anchors, type Phase, type Slip } from './types';

const QUIT = '2026-06-26T08:00:00+02:00';

const phases: Phase[] = [
  { id: 'crash', name: 'The Crash', startMs: 0, endMs: 3 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
  { id: 'fog', name: 'The Fog', startMs: 3 * MS_PER_DAY, endMs: 28 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
  { id: 'consolidation', name: 'Consolidation', startMs: 28 * MS_PER_DAY, endMs: null, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
];

const anchors = (overrides: Partial<Anchors> = {}): Anchors => ({
  fast: QUIT,
  cumulative: QUIT,
  isCurrentlySmoking: false,
  ...overrides,
});

const slip = (occurredAt: string, id = 1): Slip => ({ id, occurredAt, cigaretteCount: 3, trigger: null, note: null });

describe('resolvePhase', () => {
  it('resolvePhase_dayOne_returnsTheCrash', () => {
    // Arrange
    const now = new Date(new Date(QUIT).getTime() + 1 * MS_PER_DAY);

    // Act
    const result = resolvePhase(phases, anchors(), now);

    // Assert
    expect(result.id).toBe('crash');
  });

  it('resolvePhase_exactlyOnPhaseBoundary_returnsTheLaterPhase', () => {
    // Arrange
    const now = new Date(new Date(QUIT).getTime() + 3 * MS_PER_DAY);

    // Act
    const result = resolvePhase(phases, anchors(), now);

    // Assert
    expect(result.id).toBe('fog');
  });

  it('resolvePhase_recentSlip_doesNotDropBackToTheCrash', () => {
    // Arrange — 43 days of cumulative abstinence, slip 3 days ago
    const now = new Date('2026-08-08T08:00:00+02:00');
    const input = anchors({ fast: '2026-08-05T22:00:00+02:00', cumulative: QUIT });

    // Act
    const result = resolvePhase(phases, input, now);

    // Assert
    expect(result.id).toBe('consolidation');
  });

  it('resolvePhase_beyondTheLastBoundary_returnsTheOpenEndedPhase', () => {
    // Arrange
    const now = new Date(new Date(QUIT).getTime() + 4000 * MS_PER_DAY);

    // Act
    const result = resolvePhase(phases, anchors(), now);

    // Assert
    expect(result.id).toBe('consolidation');
  });
});

describe('resolveDangerWindow', () => {
  it('resolveDangerWindow_noSlips_isInactive', () => {
    // Arrange
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = resolveDangerWindow([], now);

    // Assert
    expect(result).toEqual({ active: false, endsAt: null, daysRemaining: null, triggeredBySlipId: null });
  });

  it('resolveDangerWindow_eighteenDaysAfterSlip_isActiveWithOneDayRemaining', () => {
    // Arrange
    const occurredAt = '2026-07-21T08:00:00+02:00';
    const now = new Date(new Date(occurredAt).getTime() + 18 * MS_PER_DAY);

    // Act
    const result = resolveDangerWindow([slip(occurredAt, 7)], now);

    // Assert
    expect(result.active).toBe(true);
    expect(result.daysRemaining).toBe(1);
    expect(result.triggeredBySlipId).toBe(7);
  });

  it('resolveDangerWindow_twentyDaysAfterSlip_isInactive', () => {
    // Arrange
    const occurredAt = '2026-07-19T08:00:00+02:00';
    const now = new Date(new Date(occurredAt).getTime() + 20 * MS_PER_DAY);

    // Act
    const result = resolveDangerWindow([slip(occurredAt)], now);

    // Assert
    expect(result.active).toBe(false);
  });

  it('resolveDangerWindow_multipleSlips_measuresFromTheMostRecent', () => {
    // Arrange
    const old = '2026-07-01T08:00:00+02:00';
    const recent = '2026-08-06T08:00:00+02:00';
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = resolveDangerWindow([slip(old, 1), slip(recent, 2)], now);

    // Assert
    expect(result.active).toBe(true);
    expect(result.triggeredBySlipId).toBe(2);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/domain/phases.test.ts`
Expected: FAIL — cannot resolve `./phases`.

- [ ] **Step 3: Implement `src/domain/phases.ts`**

```ts
import {
  DANGER_WINDOW_DAYS,
  MS_PER_DAY,
  type Anchors,
  type DangerWindow,
  type Phase,
  type Slip,
} from './types';

/**
 * The phase is driven by the CUMULATIVE anchor. One cigarette after six weeks does not
 * reproduce day-one withdrawal, so a slip must not drop the user back into The Crash.
 * The post-slip state is expressed by the danger window instead.
 */
export function resolvePhase(phases: Phase[], anchors: Anchors, now: Date): Phase {
  const elapsedMs = Math.max(0, now.getTime() - new Date(anchors.cumulative).getTime());

  const match = phases.find(
    (phase) => elapsedMs >= phase.startMs && (phase.endMs === null || elapsedMs < phase.endMs),
  );

  // `phases` is validated as contiguous from 0 with an open-ended tail, so a match always
  // exists. The fallback keeps the return type honest without an assertion.
  const last = phases[phases.length - 1];
  if (match) return match;
  if (last) return last;
  throw new Error('resolvePhase requires at least one phase');
}

export function resolveDangerWindow(slips: Slip[], now: Date): DangerWindow {
  const inactive: DangerWindow = { active: false, endsAt: null, daysRemaining: null, triggeredBySlipId: null };
  if (slips.length === 0) return inactive;

  const mostRecent = slips.reduce((latest, slip) =>
    new Date(slip.occurredAt).getTime() > new Date(latest.occurredAt).getTime() ? slip : latest,
  );

  const endMs = new Date(mostRecent.occurredAt).getTime() + DANGER_WINDOW_DAYS * MS_PER_DAY;
  const remainingMs = endMs - now.getTime();
  if (remainingMs <= 0) return inactive;

  return {
    active: true,
    endsAt: new Date(endMs).toISOString(),
    daysRemaining: Math.ceil(remainingMs / MS_PER_DAY),
    triggeredBySlipId: mostRecent.id,
  };
}
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/domain/phases.ts src/domain/phases.test.ts
git commit -m "feat: phase resolution from cumulative anchor plus 19-day danger window"
```

---

### Task 8: Timeline view model

**Files:**
- Create: `src/domain/timeline.ts`
- Test: `src/domain/timeline.test.ts`

**Interfaces:**
- Consumes: `elapsedSince`, `computeSavings`, `resolveAnchors`, `resolveMilestones`, `resolvePhase`, `resolveDangerWindow`; `MILESTONES` and `PHASES` are passed in as arguments, never imported, so the domain stays independent of content.
- Produces: `buildTimeline(input: TimelineInput): TimelineViewModel` where

```ts
export interface TimelineInput {
  state: QuitState;
  milestones: Milestone[];
  phases: Phase[];
  now: Date;
}
```

This is the single seam between the domain and every screen. Screens read a `TimelineViewModel` and render it — they never compute.

- [ ] **Step 1: Write the failing tests**

`src/domain/timeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildTimeline } from './timeline';
import { MS_PER_DAY, type Milestone, type Phase, type QuitState } from './types';

const QUIT = '2026-06-26T08:00:00+02:00';
const NOW = new Date('2026-08-08T08:00:00+02:00');

const phases: Phase[] = [
  { id: 'crash', name: 'The Crash', startMs: 0, endMs: 3 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
  { id: 'fog', name: 'The Fog', startMs: 3 * MS_PER_DAY, endMs: 28 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
  { id: 'consolidation', name: 'Consolidation', startMs: 28 * MS_PER_DAY, endMs: null, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
];

const milestones: Milestone[] = [
  { id: 'co', title: 'CO clears', body: '', offsetMs: MS_PER_DAY, offsetEndMs: null, slipBehavior: 'restarts', sourceId: 'acs', phaseId: 'crash' },
  { id: 'taste', title: 'Taste returns', body: '', offsetMs: 14 * MS_PER_DAY, offsetEndMs: null, slipBehavior: 'cumulative', sourceId: 'acs', phaseId: 'fog' },
  { id: 'cough', title: 'Cough fades', body: '', offsetMs: 30 * MS_PER_DAY, offsetEndMs: 365 * MS_PER_DAY, slipBehavior: 'cumulative', sourceId: 'acs', phaseId: 'consolidation' },
];

const state: QuitState = {
  settings: {
    quitDate: QUIT,
    cigarettesPerDay: 15,
    cigarettesPerPack: 20,
    packPriceMinor: 1100,
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    lifetimeBaseline: 43_800,
  },
  slips: [],
  periods: [],
};

describe('buildTimeline', () => {
  it('buildTimeline_cleanFortyThreeDays_returnsElapsedSavingsAndCurrentPhase', () => {
    // Arrange
    const input = { state, milestones, phases, now: NOW };

    // Act
    const result = buildTimeline(input);

    // Assert
    expect(result.elapsed.days).toBe(43);
    expect(result.savings.cigarettesAvoided).toBe(645);
    expect(result.currentPhase.id).toBe('consolidation');
    expect(result.dangerWindow.active).toBe(false);
  });

  it('buildTimeline_groupsMilestonesIntoChaptersMarkingPastCurrentAndFuture', () => {
    // Arrange
    const input = { state, milestones, phases, now: NOW };

    // Act
    const result = buildTimeline(input);

    // Assert
    expect(result.chapters.map((c) => [c.phase.id, c.status])).toEqual([
      ['crash', 'past'],
      ['fog', 'past'],
      ['consolidation', 'current'],
    ]);
    expect(result.chapters[0]?.milestones.map((m) => m.milestone.id)).toEqual(['co']);
  });

  it('buildTimeline_nextMilestone_isTheSoonestUnreachedOne', () => {
    // Arrange
    const input = { state, milestones, phases, now: NOW };

    // Act
    const result = buildTimeline(input);

    // Assert — 'cough' is in progress (ends at day 365) and is the only unreached one
    expect(result.nextMilestone?.milestone.id).toBe('cough');
  });

  it('buildTimeline_afterSlip_restartsFastMilestoneButKeepsCumulativeOnes', () => {
    // Arrange — slip 10 hours before now, so the 24 h CO milestone is unreached again
    const withSlip: QuitState = {
      ...state,
      slips: [{ id: 1, occurredAt: '2026-08-07T22:00:00+02:00', cigaretteCount: 3, trigger: 'alcohol', note: null }],
    };

    // Act
    const result = buildTimeline({ state: withSlip, milestones, phases, now: NOW });

    // Assert
    const byId = new Map(result.chapters.flatMap((c) => c.milestones).map((m) => [m.milestone.id, m.status]));
    expect(byId.get('co')).toBe('future');
    expect(byId.get('taste')).toBe('reached');
    expect(result.dangerWindow.active).toBe(true);
  });

  it('buildTimeline_allMilestonesReached_returnsNullNextMilestone', () => {
    // Arrange
    const now = new Date(new Date(QUIT).getTime() + 4000 * MS_PER_DAY);

    // Act
    const result = buildTimeline({ state, milestones, phases, now });

    // Assert
    expect(result.nextMilestone).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/domain/timeline.test.ts`
Expected: FAIL — cannot resolve `./timeline`.

- [ ] **Step 3: Implement `src/domain/timeline.ts`**

```ts
import { resolveAnchors } from './anchors';
import { elapsedSince } from './elapsed';
import { resolveMilestones } from './milestones';
import { resolveDangerWindow, resolvePhase } from './phases';
import { computeSavings } from './savings';
import type {
  Chapter,
  Milestone,
  MilestoneState,
  Phase,
  QuitState,
  TimelineViewModel,
} from './types';

export interface TimelineInput {
  state: QuitState;
  milestones: Milestone[];
  phases: Phase[];
  now: Date;
}

/** The soonest unreached milestone, ranked by its projected date. */
function pickNext(states: MilestoneState[]): MilestoneState | null {
  const upcoming = states
    .filter((state) => state.status !== 'reached' && state.projectedAt !== null)
    .sort((a, b) => new Date(a.projectedAt as string).getTime() - new Date(b.projectedAt as string).getTime());

  return upcoming[0] ?? null;
}

export function buildTimeline({ state, milestones, phases, now }: TimelineInput): TimelineViewModel {
  const anchors = resolveAnchors(state, now);
  const currentPhase = resolvePhase(phases, anchors, now);
  const milestoneStates = resolveMilestones(milestones, anchors, now);

  const currentIndex = phases.findIndex((phase) => phase.id === currentPhase.id);

  const chapters: Chapter[] = phases.map((phase, index) => ({
    phase,
    status: index < currentIndex ? 'past' : index === currentIndex ? 'current' : 'future',
    milestones: milestoneStates.filter((milestoneState) => milestoneState.milestone.phaseId === phase.id),
  }));

  return {
    // Displayed streak follows the cumulative anchor: a slip does not zero the counter.
    elapsed: elapsedSince(anchors.cumulative, now),
    savings: computeSavings(state, now),
    anchors,
    currentPhase,
    dangerWindow: resolveDangerWindow(state.slips, now),
    chapters,
    nextMilestone: pickNext(milestoneStates),
  };
}
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all passing. The whole domain layer is now covered with zero I/O.

- [ ] **Step 5: Commit**

```bash
git add src/domain/timeline.ts src/domain/timeline.test.ts
git commit -m "feat: assemble timeline view model from stored facts and the clock"
```

---

### Task 9: SQL schema and queries, tested in Node

**Files:**
- Create: `src/data/schema.ts`
- Create: `src/data/queries.ts`
- Test: `src/data/sql.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `MIGRATIONS: Migration[]` where `interface Migration { version: number; up: string }`; `SCHEMA_VERSION: number`; and the named query constants listed in Step 2.

`expo-sqlite` is a native module and cannot load under Vitest in Node. So all SQL lives in exported string constants here, and the tests execute those exact strings through `better-sqlite3`. The device runs the same constants through `expo-sqlite`. The SQL is genuinely tested; only the thin binding in Task 10 is not.

- [ ] **Step 1: Write `src/data/schema.ts`**

```ts
export interface Migration {
  version: number;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE settings (
        id                   INTEGER PRIMARY KEY CHECK (id = 1),
        quit_date            TEXT    NOT NULL,
        cigarettes_per_day   INTEGER NOT NULL CHECK (cigarettes_per_day > 0),
        cigarettes_per_pack  INTEGER NOT NULL DEFAULT 20 CHECK (cigarettes_per_pack > 0),
        pack_price_minor     INTEGER NOT NULL CHECK (pack_price_minor >= 0),
        currency             TEXT    NOT NULL DEFAULT 'EUR',
        timezone             TEXT    NOT NULL,
        lifetime_baseline    INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_baseline >= 0),
        created_at           TEXT    NOT NULL,
        updated_at           TEXT    NOT NULL
      );

      CREATE TABLE slips (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        occurred_at     TEXT    NOT NULL,
        cigarette_count INTEGER NOT NULL CHECK (cigarette_count > 0),
        trigger         TEXT        NULL CHECK (trigger IN ('alcohol','stress','social','boredom','routine','other')),
        note            TEXT        NULL,
        created_at      TEXT    NOT NULL
      );

      CREATE INDEX idx_slips_occurred_at ON slips (occurred_at DESC);

      CREATE TABLE smoking_periods (
        id                          INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at                  TEXT    NOT NULL,
        ended_at                    TEXT        NULL,
        average_cigarettes_per_day  INTEGER NOT NULL CHECK (average_cigarettes_per_day > 0),
        note                        TEXT        NULL,
        created_at                  TEXT    NOT NULL,
        CHECK (ended_at IS NULL OR ended_at >= started_at)
      );

      CREATE TABLE milestone_events (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        milestone_id TEXT NOT NULL UNIQUE,
        reached_at   TEXT NOT NULL,
        notified_at  TEXT     NULL
      );

      CREATE TABLE craving_checkins (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        logged_on         TEXT    NOT NULL UNIQUE,
        craving_intensity INTEGER NOT NULL CHECK (craving_intensity BETWEEN 1 AND 5),
        mood              INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
        note              TEXT        NULL,
        created_at        TEXT    NOT NULL
      );
    `,
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
```

The `CHECK (id = 1)` on `settings` enforces the single-row invariant in the database rather than in application code, so no code path can create a second settings row.

- [ ] **Step 2: Write `src/data/queries.ts`**

```ts
export const UPSERT_SETTINGS = `
  INSERT INTO settings (
    id, quit_date, cigarettes_per_day, cigarettes_per_pack, pack_price_minor,
    currency, timezone, lifetime_baseline, created_at, updated_at
  )
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (id) DO UPDATE SET
    quit_date           = excluded.quit_date,
    cigarettes_per_day  = excluded.cigarettes_per_day,
    cigarettes_per_pack = excluded.cigarettes_per_pack,
    pack_price_minor    = excluded.pack_price_minor,
    currency            = excluded.currency,
    timezone            = excluded.timezone,
    lifetime_baseline   = excluded.lifetime_baseline,
    updated_at          = excluded.updated_at
`;

export const SELECT_SETTINGS = `
  SELECT quit_date, cigarettes_per_day, cigarettes_per_pack, pack_price_minor,
         currency, timezone, lifetime_baseline
  FROM settings WHERE id = 1
`;

export const INSERT_SLIP = `
  INSERT INTO slips (occurred_at, cigarette_count, trigger, note, created_at)
  VALUES (?, ?, ?, ?, ?)
`;

export const SELECT_SLIPS = `
  SELECT id, occurred_at, cigarette_count, trigger, note
  FROM slips ORDER BY occurred_at DESC
`;

export const DELETE_SLIP = `DELETE FROM slips WHERE id = ?`;

export const INSERT_SMOKING_PERIOD = `
  INSERT INTO smoking_periods (started_at, ended_at, average_cigarettes_per_day, note, created_at)
  VALUES (?, ?, ?, ?, ?)
`;

export const END_OPEN_SMOKING_PERIOD = `
  UPDATE smoking_periods SET ended_at = ? WHERE ended_at IS NULL
`;

export const SELECT_SMOKING_PERIODS = `
  SELECT id, started_at, ended_at, average_cigarettes_per_day, note
  FROM smoking_periods ORDER BY started_at DESC
`;

export const UPSERT_MILESTONE_EVENT = `
  INSERT INTO milestone_events (milestone_id, reached_at)
  VALUES (?, ?)
  ON CONFLICT (milestone_id) DO NOTHING
`;

export const MARK_MILESTONE_NOTIFIED = `
  UPDATE milestone_events SET notified_at = ? WHERE milestone_id = ?
`;

export const SELECT_UNNOTIFIED_MILESTONES = `
  SELECT milestone_id, reached_at FROM milestone_events WHERE notified_at IS NULL
`;

export const UPSERT_CHECKIN = `
  INSERT INTO craving_checkins (logged_on, craving_intensity, mood, note, created_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (logged_on) DO UPDATE SET
    craving_intensity = excluded.craving_intensity,
    mood              = excluded.mood,
    note              = excluded.note
`;

export const SELECT_CHECKINS = `
  SELECT logged_on, craving_intensity, mood, note
  FROM craving_checkins ORDER BY logged_on DESC LIMIT ?
`;

/** Ordered so children go before parents; used by the wipe-everything action. */
export const DELETE_ALL = [
  'DELETE FROM craving_checkins',
  'DELETE FROM milestone_events',
  'DELETE FROM smoking_periods',
  'DELETE FROM slips',
  'DELETE FROM settings',
];
```

- [ ] **Step 3: Write the failing SQL tests**

`src/data/sql.test.ts`:

```ts
import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS } from './schema';
import {
  DELETE_ALL,
  END_OPEN_SMOKING_PERIOD,
  INSERT_SLIP,
  INSERT_SMOKING_PERIOD,
  SELECT_SETTINGS,
  SELECT_SLIPS,
  SELECT_SMOKING_PERIODS,
  SELECT_UNNOTIFIED_MILESTONES,
  UPSERT_CHECKIN,
  UPSERT_MILESTONE_EVENT,
  UPSERT_SETTINGS,
} from './queries';

let db: Database.Database;

const NOW = '2026-08-08T08:00:00.000Z';

const insertSettings = (quitDate = '2026-06-26T08:00:00+02:00') =>
  db.prepare(UPSERT_SETTINGS).run(quitDate, 15, 20, 1100, 'EUR', 'Europe/Amsterdam', 43_800, NOW, NOW);

beforeEach(() => {
  db = new Database(':memory:');
  for (const migration of MIGRATIONS) db.exec(migration.up);
});

describe('migrations', () => {
  it('MIGRATIONS_appliedToEmptyDatabase_createsEveryExpectedTable', () => {
    // Arrange & Act
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];

    // Assert
    expect(rows.map((r) => r.name).sort()).toEqual([
      'craving_checkins', 'milestone_events', 'settings', 'slips', 'smoking_periods',
    ]);
  });
});

describe('settings', () => {
  it('UPSERT_SETTINGS_calledTwice_updatesInPlaceAndKeepsOneRow', () => {
    // Arrange
    insertSettings('2026-06-26T08:00:00+02:00');

    // Act
    insertSettings('2026-07-01T08:00:00+02:00');
    const rows = db.prepare(SELECT_SETTINGS).all() as { quit_date: string }[];

    // Assert
    expect(rows).toHaveLength(1);
    expect(rows[0]?.quit_date).toBe('2026-07-01T08:00:00+02:00');
  });

  it('settings_secondRowWithDifferentId_isRejectedByCheckConstraint', () => {
    // Arrange
    insertSettings();

    // Act
    const act = () =>
      db.prepare(
        `INSERT INTO settings (id, quit_date, cigarettes_per_day, cigarettes_per_pack,
          pack_price_minor, currency, timezone, lifetime_baseline, created_at, updated_at)
         VALUES (2, ?, 10, 20, 900, 'EUR', 'UTC', 0, ?, ?)`,
      ).run('2026-01-01T00:00:00Z', NOW, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('settings_zeroCigarettesPerDay_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(UPSERT_SETTINGS).run('2026-06-26T08:00:00+02:00', 0, 20, 1100, 'EUR', 'UTC', 0, NOW, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });
});

describe('slips', () => {
  it('SELECT_SLIPS_multipleRows_returnsMostRecentFirst', () => {
    // Arrange
    db.prepare(INSERT_SLIP).run('2026-07-04T20:00:00+02:00', 1, null, null, NOW);
    db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 3, 'alcohol', 'party', NOW);

    // Act
    const rows = db.prepare(SELECT_SLIPS).all() as { occurred_at: string }[];

    // Assert
    expect(rows[0]?.occurred_at).toBe('2026-08-05T22:00:00+02:00');
  });

  it('INSERT_SLIP_unknownTrigger_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 3, 'peer-pressure', null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('INSERT_SLIP_zeroCigarettes_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 0, null, null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });
});

describe('smoking_periods', () => {
  it('END_OPEN_SMOKING_PERIOD_withOneOpenPeriod_closesIt', () => {
    // Arrange
    db.prepare(INSERT_SMOKING_PERIOD).run('2026-08-01T08:00:00+02:00', null, 20, null, NOW);

    // Act
    db.prepare(END_OPEN_SMOKING_PERIOD).run('2026-08-08T08:00:00+02:00');
    const rows = db.prepare(SELECT_SMOKING_PERIODS).all() as { ended_at: string | null }[];

    // Assert
    expect(rows[0]?.ended_at).toBe('2026-08-08T08:00:00+02:00');
  });

  it('smoking_periods_endBeforeStart_isRejected', () => {
    // Arrange & Act
    const act = () =>
      db.prepare(INSERT_SMOKING_PERIOD).run('2026-08-08T08:00:00+02:00', '2026-08-01T08:00:00+02:00', 20, null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });
});

describe('milestone_events', () => {
  it('UPSERT_MILESTONE_EVENT_sameMilestoneTwice_keepsTheOriginalReachedAt', () => {
    // Arrange
    db.prepare(UPSERT_MILESTONE_EVENT).run('carbon-monoxide', '2026-06-27T08:00:00+02:00');

    // Act
    db.prepare(UPSERT_MILESTONE_EVENT).run('carbon-monoxide', '2026-08-08T08:00:00+02:00');
    const rows = db.prepare(SELECT_UNNOTIFIED_MILESTONES).all() as { reached_at: string }[];

    // Assert — reaching it again must not re-fire a notification or overwrite the date
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reached_at).toBe('2026-06-27T08:00:00+02:00');
  });
});

describe('craving_checkins', () => {
  it('UPSERT_CHECKIN_sameDayTwice_overwritesRatherThanDuplicating', () => {
    // Arrange
    db.prepare(UPSERT_CHECKIN).run('2026-08-08', 4, 2, 'rough morning', NOW);

    // Act
    db.prepare(UPSERT_CHECKIN).run('2026-08-08', 2, 4, 'better by evening', NOW);
    const rows = db.prepare('SELECT craving_intensity, mood, note FROM craving_checkins').all() as { craving_intensity: number }[];

    // Assert
    expect(rows).toHaveLength(1);
    expect(rows[0]?.craving_intensity).toBe(2);
  });

  it('UPSERT_CHECKIN_intensityOutOfRange_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(UPSERT_CHECKIN).run('2026-08-08', 9, 3, null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });
});

describe('DELETE_ALL', () => {
  it('DELETE_ALL_appliedInOrder_emptiesEveryTable', () => {
    // Arrange
    insertSettings();
    db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 3, 'alcohol', null, NOW);
    db.prepare(UPSERT_CHECKIN).run('2026-08-08', 3, 3, null, NOW);

    // Act
    for (const statement of DELETE_ALL) db.exec(statement);

    // Assert
    expect(db.prepare(SELECT_SETTINGS).all()).toEqual([]);
    expect(db.prepare(SELECT_SLIPS).all()).toEqual([]);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/data/sql.test.ts && npm run typecheck`
Expected: all passing. If `better-sqlite3` fails to load with a `NODE_MODULE_VERSION` error, rebuild it for the local Node: `npm rebuild better-sqlite3`.

This task writes the SQL before its tests, unlike the domain tasks, because the SQL *is* the
specification — there is no interface to design first. That makes the tests vulnerable to passing
vacuously, so Step 5 proves they bite.

- [ ] **Step 5: Prove the tests are not vacuous**

Temporarily delete `CHECK (id = 1)` from the `settings` table in `src/data/schema.ts` and re-run:

Run: `npm test -- src/data/sql.test.ts`
Expected: FAIL on `settings_secondRowWithDifferentId_isRejectedByCheckConstraint`.

Then temporarily change `SELECT_SLIPS` to `ORDER BY occurred_at ASC` and re-run:

Expected: FAIL on `SELECT_SLIPS_multipleRows_returnsMostRecentFirst`.

Restore both, confirm green again. Do not commit either temporary change.

- [ ] **Step 6: Commit**

```bash
git add src/data/schema.ts src/data/queries.ts src/data/sql.test.ts
git commit -m "feat: SQLite schema and queries as constants, tested in Node via better-sqlite3"
```

---

### Task 10: expo-sqlite binding and repositories

**Files:**
- Create: `src/data/db.ts`
- Create: `src/data/repositories.ts`

**Interfaces:**
- Consumes: `MIGRATIONS`, `SCHEMA_VERSION` from `src/data/schema.ts`; every query constant from `src/data/queries.ts`; `QuitState`, `Settings`, `Slip`, `SmokingPeriod`, `SlipTrigger` from `src/domain/types.ts`.
- Produces:
  - `migrateDbIfNeeded(db: SQLiteDatabase): Promise<void>`
  - `loadQuitState(db: SQLiteDatabase): Promise<QuitState | null>` — `null` when onboarding has not run
  - `saveSettings(db: SQLiteDatabase, settings: Settings, now: Date): Promise<void>`
  - `addSlip(db, input: { occurredAt: string; cigaretteCount: number; trigger: SlipTrigger | null; note: string | null }, now: Date): Promise<void>`
  - `startSmokingPeriod(db, input: { startedAt: string; averageCigarettesPerDay: number; note: string | null }, now: Date): Promise<void>`
  - `endSmokingPeriod(db, endedAt: string): Promise<void>`
  - `recordMilestoneReached(db, milestoneId: string, reachedAt: string): Promise<void>`
  - `listUnnotifiedMilestones(db): Promise<{ milestoneId: string; reachedAt: string }[]>`
  - `markMilestoneNotified(db, milestoneId: string, now: Date): Promise<void>`
  - `saveCheckin(db, input: { loggedOn: string; cravingIntensity: number; mood: number; note: string | null }, now: Date): Promise<void>`
  - `listCheckins(db, limit: number): Promise<CheckinRow[]>` where `interface CheckinRow { loggedOn: string; cravingIntensity: number; mood: number; note: string | null }`
  - `exportAll(db): Promise<string>` — pretty-printed JSON of everything
  - `deleteEverything(db): Promise<void>`

No unit tests here: this module is a mechanical mapping over SQL that Task 9 already covers, and `expo-sqlite` cannot load in Node. It is verified by running the app in Task 12.

- [ ] **Step 1: Write `src/data/db.ts`**

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';

export const DATABASE_NAME = 'smokefree.db';

/**
 * Applies any migration newer than the stored `user_version`. Runs on every launch via
 * SQLiteProvider's onInit, so it must stay idempotent.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current >= SCHEMA_VERSION) return;

  await db.execAsync('PRAGMA foreign_keys = ON');

  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      await db.execAsync(migration.up);
    }
  }

  // PRAGMA does not accept bound parameters, so interpolate the validated integer.
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
```

- [ ] **Step 2: Write `src/data/repositories.ts`**

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { QuitState, Settings, Slip, SlipTrigger, SmokingPeriod } from '@/domain/types';
import {
  DELETE_ALL,
  END_OPEN_SMOKING_PERIOD,
  INSERT_SLIP,
  INSERT_SMOKING_PERIOD,
  MARK_MILESTONE_NOTIFIED,
  SELECT_CHECKINS,
  SELECT_SETTINGS,
  SELECT_SLIPS,
  SELECT_SMOKING_PERIODS,
  SELECT_UNNOTIFIED_MILESTONES,
  UPSERT_CHECKIN,
  UPSERT_MILESTONE_EVENT,
  UPSERT_SETTINGS,
} from './queries';

interface SettingsRow {
  quit_date: string;
  cigarettes_per_day: number;
  cigarettes_per_pack: number;
  pack_price_minor: number;
  currency: string;
  timezone: string;
  lifetime_baseline: number;
}

interface SlipRow {
  id: number;
  occurred_at: string;
  cigarette_count: number;
  trigger: SlipTrigger | null;
  note: string | null;
}

interface PeriodRow {
  id: number;
  started_at: string;
  ended_at: string | null;
  average_cigarettes_per_day: number;
  note: string | null;
}

export interface CheckinRow {
  loggedOn: string;
  cravingIntensity: number;
  mood: number;
  note: string | null;
}

export async function loadQuitState(db: SQLiteDatabase): Promise<QuitState | null> {
  const settingsRow = await db.getFirstAsync<SettingsRow>(SELECT_SETTINGS);
  if (!settingsRow) return null;

  const slipRows = await db.getAllAsync<SlipRow>(SELECT_SLIPS);
  const periodRows = await db.getAllAsync<PeriodRow>(SELECT_SMOKING_PERIODS);

  const settings: Settings = {
    quitDate: settingsRow.quit_date,
    cigarettesPerDay: settingsRow.cigarettes_per_day,
    cigarettesPerPack: settingsRow.cigarettes_per_pack,
    packPriceMinor: settingsRow.pack_price_minor,
    currency: settingsRow.currency,
    timezone: settingsRow.timezone,
    lifetimeBaseline: settingsRow.lifetime_baseline,
  };

  const slips: Slip[] = slipRows.map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    cigaretteCount: row.cigarette_count,
    trigger: row.trigger,
    note: row.note,
  }));

  const periods: SmokingPeriod[] = periodRows.map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    averageCigarettesPerDay: row.average_cigarettes_per_day,
    note: row.note,
  }));

  return { settings, slips, periods };
}

export async function saveSettings(db: SQLiteDatabase, settings: Settings, now: Date): Promise<void> {
  const stamp = now.toISOString();
  await db.runAsync(
    UPSERT_SETTINGS,
    settings.quitDate,
    settings.cigarettesPerDay,
    settings.cigarettesPerPack,
    settings.packPriceMinor,
    settings.currency,
    settings.timezone,
    settings.lifetimeBaseline,
    stamp,
    stamp,
  );
}

export async function addSlip(
  db: SQLiteDatabase,
  input: { occurredAt: string; cigaretteCount: number; trigger: SlipTrigger | null; note: string | null },
  now: Date,
): Promise<void> {
  await db.runAsync(INSERT_SLIP, input.occurredAt, input.cigaretteCount, input.trigger, input.note, now.toISOString());
}

export async function startSmokingPeriod(
  db: SQLiteDatabase,
  input: { startedAt: string; averageCigarettesPerDay: number; note: string | null },
  now: Date,
): Promise<void> {
  await db.runAsync(INSERT_SMOKING_PERIOD, input.startedAt, null, input.averageCigarettesPerDay, input.note, now.toISOString());
}

export async function endSmokingPeriod(db: SQLiteDatabase, endedAt: string): Promise<void> {
  await db.runAsync(END_OPEN_SMOKING_PERIOD, endedAt);
}

export async function recordMilestoneReached(db: SQLiteDatabase, milestoneId: string, reachedAt: string): Promise<void> {
  await db.runAsync(UPSERT_MILESTONE_EVENT, milestoneId, reachedAt);
}

export async function listUnnotifiedMilestones(db: SQLiteDatabase): Promise<{ milestoneId: string; reachedAt: string }[]> {
  const rows = await db.getAllAsync<{ milestone_id: string; reached_at: string }>(SELECT_UNNOTIFIED_MILESTONES);
  return rows.map((row) => ({ milestoneId: row.milestone_id, reachedAt: row.reached_at }));
}

export async function markMilestoneNotified(db: SQLiteDatabase, milestoneId: string, now: Date): Promise<void> {
  await db.runAsync(MARK_MILESTONE_NOTIFIED, now.toISOString(), milestoneId);
}

export async function saveCheckin(
  db: SQLiteDatabase,
  input: { loggedOn: string; cravingIntensity: number; mood: number; note: string | null },
  now: Date,
): Promise<void> {
  await db.runAsync(UPSERT_CHECKIN, input.loggedOn, input.cravingIntensity, input.mood, input.note, now.toISOString());
}

export async function listCheckins(db: SQLiteDatabase, limit: number): Promise<CheckinRow[]> {
  const rows = await db.getAllAsync<{ logged_on: string; craving_intensity: number; mood: number; note: string | null }>(
    SELECT_CHECKINS,
    limit,
  );
  return rows.map((row) => ({
    loggedOn: row.logged_on,
    cravingIntensity: row.craving_intensity,
    mood: row.mood,
    note: row.note,
  }));
}

/** Everything the user has stored, as JSON. This is the only "backup" v1 offers. */
export async function exportAll(db: SQLiteDatabase): Promise<string> {
  const state = await loadQuitState(db);
  const checkins = await listCheckins(db, 100_000);
  return JSON.stringify({ exportedAt: new Date().toISOString(), state, checkins }, null, 2);
}

export async function deleteEverything(db: SQLiteDatabase): Promise<void> {
  for (const statement of DELETE_ALL) {
    await db.execAsync(statement);
  }
}
```

`exportAll` is the one deliberate exception to the no-argless-`new Date()` rule, and it lives in `data/`, not `domain/` — the export stamp is metadata about the file, not an input to any calculation.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck && npm test`
Expected: no type errors, all existing tests still passing.

- [ ] **Step 4: Commit**

```bash
git add src/data/db.ts src/data/repositories.ts
git commit -m "feat: expo-sqlite migration runner and typed repositories"
```

---

### Task 11: Formatters and theme

**Files:**
- Create: `src/domain/format.ts`
- Create: `src/ui/theme.ts`
- Test: `src/domain/format.test.ts`

**Interfaces:**
- Consumes: `Elapsed`, `MS_PER_DAY` from types.
- Produces: `formatMoneyMinor(minor: number, currency: string): string`; `formatElapsed(elapsed: Elapsed): string`; `formatMinutesNotLost(minutes: number): string`; `formatMilestoneDate(iso: string): string`; `theme` object.

Formatters live in `domain/` because they are pure and worth testing. They take no `Date` and read no clock.

- [ ] **Step 1: Write the failing tests**

`src/domain/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatElapsed, formatMinutesNotLost, formatMoneyMinor } from './format';

describe('formatMoneyMinor', () => {
  it('formatMoneyMinor_euroAmount_rendersWithTwoDecimals', () => {
    // Arrange & Act
    const result = formatMoneyMinor(35_475, 'EUR');

    // Assert
    expect(result).toBe('€354.75');
  });

  it('formatMoneyMinor_zero_rendersZeroNotEmpty', () => {
    // Arrange & Act
    const result = formatMoneyMinor(0, 'EUR');

    // Assert
    expect(result).toBe('€0.00');
  });

  it('formatMoneyMinor_unknownCurrencyCode_fallsBackToCodePrefix', () => {
    // Arrange & Act
    const result = formatMoneyMinor(1234, 'XZZ');

    // Assert
    expect(result).toBe('XZZ 12.34');
  });
});

describe('formatElapsed', () => {
  it('formatElapsed_daysAndHours_rendersBoth', () => {
    // Arrange & Act
    const result = formatElapsed({ totalMs: 0, days: 43, hours: 6, minutes: 30 });

    // Assert
    expect(result).toBe('43 days, 6 hours');
  });

  it('formatElapsed_singleDay_usesSingularNoun', () => {
    // Arrange & Act
    const result = formatElapsed({ totalMs: 0, days: 1, hours: 1, minutes: 0 });

    // Assert
    expect(result).toBe('1 day, 1 hour');
  });

  it('formatElapsed_underOneDay_rendersHoursAndMinutes', () => {
    // Arrange & Act
    const result = formatElapsed({ totalMs: 0, days: 0, hours: 5, minutes: 12 });

    // Assert
    expect(result).toBe('5 hours, 12 minutes');
  });

  it('formatElapsed_underOneHour_rendersMinutesOnly', () => {
    // Arrange & Act
    const result = formatElapsed({ totalMs: 0, days: 0, hours: 0, minutes: 42 });

    // Assert
    expect(result).toBe('42 minutes');
  });
});

describe('formatMinutesNotLost', () => {
  it('formatMinutesNotLost_twelveThousandNineHundred_rendersAsDays', () => {
    // Arrange & Act
    const result = formatMinutesNotLost(12_900);

    // Assert
    expect(result).toBe('8 days');
  });

  it('formatMinutesNotLost_underADay_rendersHours', () => {
    // Arrange & Act
    const result = formatMinutesNotLost(300);

    // Assert
    expect(result).toBe('5 hours');
  });

  it('formatMinutesNotLost_zero_rendersZeroHours', () => {
    // Arrange & Act
    const result = formatMinutesNotLost(0);

    // Assert
    expect(result).toBe('0 hours');
  });
});
```

Note the expected value in the first `formatMinutesNotLost` case: 12,900 minutes is 8.95 days, and the implementation floors rather than rounds so the app never overstates the benefit.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/domain/format.test.ts`
Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 3: Implement `src/domain/format.ts`**

```ts
import type { Elapsed } from './types';

const SYMBOLS: Record<string, string> = { EUR: '€', GBP: '£', USD: '$', PLN: 'zł' };

export function formatMoneyMinor(minor: number, currency: string): string {
  const major = (minor / 100).toFixed(2);
  const symbol = SYMBOLS[currency];
  return symbol ? `${symbol}${major}` : `${currency} ${major}`;
}

function plural(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

export function formatElapsed(elapsed: Elapsed): string {
  if (elapsed.days > 0) return `${plural(elapsed.days, 'day')}, ${plural(elapsed.hours, 'hour')}`;
  if (elapsed.hours > 0) return `${plural(elapsed.hours, 'hour')}, ${plural(elapsed.minutes, 'minute')}`;
  return plural(elapsed.minutes, 'minute');
}

/** Floors rather than rounds, so the app never overstates the benefit. */
export function formatMinutesNotLost(minutes: number): string {
  const days = Math.floor(minutes / (60 * 24));
  if (days >= 1) return plural(days, 'day');
  return plural(Math.floor(minutes / 60), 'hour');
}

export function formatMilestoneDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
```

- [ ] **Step 4: Write `src/ui/theme.ts`**

Palette carried over from the approved mockup: deep green for progress, amber for the active milestone, warm sand for tip blocks.

```ts
export const theme = {
  color: {
    bg: '#faf9f7',
    surface: '#ffffff',
    border: '#e5e5ea',
    text: '#111113',
    textMuted: '#55555a',
    textFaint: '#8a8a90',
    heroBg: '#0f3d2e',
    heroText: '#ffffff',
    done: '#1f9d63',
    doneBg: '#f2faf6',
    doneBorder: '#cdeadd',
    active: '#f5a524',
    activeBg: '#fffaf0',
    activeBorder: '#f7dfae',
    tipBg: '#f4f1ea',
    tipAccent: '#b08d3f',
    tipLabel: '#8a6d24',
    danger: '#b42318',
    dangerBg: '#fef3f2',
    dangerBorder: '#fecdca',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 6, md: 10, lg: 14, pill: 999 },
  font: { hero: 34, title: 20, body: 15, small: 13, tiny: 11 },
} as const;
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add src/domain/format.ts src/domain/format.test.ts src/ui/theme.ts
git commit -m "feat: pure display formatters and shared theme tokens"
```

---

### Task 12: Root layout, state hook, and onboarding

**Files:**
- Create: `app/_layout.tsx`
- Create: `src/ui/useQuitState.ts`
- Create: `app/onboarding.tsx`

**Interfaces:**
- Consumes: `migrateDbIfNeeded`, `DATABASE_NAME` from `src/data/db.ts`; `loadQuitState`, `saveSettings` from `src/data/repositories.ts`; `theme`; `Settings`, `QuitState`.
- Produces: `useQuitState(): { state: QuitState | null; loading: boolean; reload: () => Promise<void> }` from `src/ui/useQuitState.ts`.

The onboarding gate lives in `_layout.tsx`: if `loadQuitState` returns `null`, redirect to `/onboarding`.

- [ ] **Step 1: Write `app/_layout.tsx`**

```tsx
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/data/db';
import { theme } from '@/ui/theme';

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.bg }}>
      <ActivityIndicator color={theme.color.heroBg} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded} useSuspense>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.bg } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="sos" options={{ presentation: 'modal' }} />
            <Stack.Screen name="log" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" />
          </Stack>
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Write `src/ui/useQuitState.ts`**

```ts
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { loadQuitState } from '@/data/repositories';
import type { QuitState } from '@/domain/types';

/** Loads the stored facts. `state === null` after loading means onboarding has not run. */
export function useQuitState(): { state: QuitState | null; loading: boolean; reload: () => Promise<void> } {
  const db = useSQLiteContext();
  const [state, setState] = useState<QuitState | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setState(await loadQuitState(db));
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, loading, reload };
}
```

- [ ] **Step 3: Write `app/onboarding.tsx`**

```tsx
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveSettings } from '@/data/repositories';
import { theme } from '@/ui/theme';

function toMinor(input: string): number | null {
  const normalised = input.replace(',', '.').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null;
  return Math.round(Number(normalised) * 100);
}

function toPositiveInt(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null;
  const value = Number(input);
  return value > 0 ? value : null;
}

export default function Onboarding() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [daysAgo, setDaysAgo] = useState('0');
  const [perDay, setPerDay] = useState('15');
  const [perPack, setPerPack] = useState('20');
  const [price, setPrice] = useState('11.00');
  const [baseline, setBaseline] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const cigarettesPerDay = toPositiveInt(perDay);
    const cigarettesPerPack = toPositiveInt(perPack);
    const packPriceMinor = toMinor(price);
    const backdatedDays = /^\d+$/.test(daysAgo.trim()) ? Number(daysAgo) : null;

    if (cigarettesPerDay === null) return setError('Cigarettes per day must be a whole number above zero.');
    if (cigarettesPerPack === null) return setError('Cigarettes per pack must be a whole number above zero.');
    if (packPriceMinor === null) return setError('Pack price must look like 11 or 11.50.');
    if (backdatedDays === null) return setError('Days ago must be a whole number, or 0 if you are quitting now.');

    const now = new Date();
    const quitDate = new Date(now.getTime() - backdatedDays * 86_400_000);

    await saveSettings(
      db,
      {
        quitDate: quitDate.toISOString(),
        cigarettesPerDay,
        cigarettesPerPack,
        packPriceMinor,
        currency: 'EUR',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        lifetimeBaseline: /^\d+$/.test(baseline.trim()) ? Number(baseline) : 0,
      },
      now,
    );

    router.replace('/');
  };

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + theme.space.xl }]}>
      <Text style={styles.h1}>Let’s set this up</Text>
      <Text style={styles.lede}>
        Five numbers and you’re done. Everything stays on this phone — no account, no server, nothing
        leaves the device.
      </Text>

      <Field label="How many days ago did you quit?" hint="0 if you’re quitting right now." value={daysAgo} onChange={setDaysAgo} keyboardType="number-pad" />
      <Field label="Cigarettes per day" hint="Roughly what you smoked before quitting." value={perDay} onChange={setPerDay} keyboardType="number-pad" />
      <Field label="Cigarettes per pack" value={perPack} onChange={setPerPack} keyboardType="number-pad" />
      <Field label="Price per pack (€)" value={price} onChange={setPrice} keyboardType="decimal-pad" />
      <Field
        label="Cigarettes smoked in your life (optional)"
        hint="A rough guess is fine. Used only for your lifetime total."
        value={baseline}
        onChange={setBaseline}
        keyboardType="number-pad"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.cta} onPress={submit} accessibilityRole="button">
        <Text style={styles.ctaText}>Start tracking</Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        This app is not medical advice. If you want real support, your GP or a national quitline will
        do more for your odds than any app.
      </Text>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  keyboardType: 'number-pad' | 'decimal-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      {props.hint ? <Text style={styles.hint}>{props.hint}</Text> : null}
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChange}
        keyboardType={props.keyboardType}
        accessibilityLabel={props.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.md },
  h1: { fontSize: theme.font.title, fontWeight: '700', color: theme.color.text },
  lede: { fontSize: theme.font.body, color: theme.color.textMuted, lineHeight: 21, marginBottom: theme.space.sm },
  field: { gap: theme.space.xs },
  label: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.text },
  hint: { fontSize: theme.font.tiny, color: theme.color.textFaint },
  input: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    fontSize: theme.font.body,
    color: theme.color.text,
  },
  error: { color: theme.color.danger, fontSize: theme.font.small },
  cta: {
    backgroundColor: theme.color.heroBg,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md,
    alignItems: 'center',
    marginTop: theme.space.sm,
  },
  ctaText: { color: theme.color.heroText, fontSize: theme.font.body, fontWeight: '700' },
  disclaimer: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16, marginTop: theme.space.md },
});
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck && npm test`
Expected: no type errors, all existing tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx app/onboarding.tsx src/ui/useQuitState.ts
git commit -m "feat: root layout with SQLite provider and onboarding screen"
```

---

### Task 13: Timeline screen

**Files:**
- Create: `app/index.tsx`
- Create: `src/ui/Hero.tsx`
- Create: `src/ui/MilestoneNode.tsx`
- Create: `src/ui/ChapterBlock.tsx`

**Interfaces:**
- Consumes: `buildTimeline` from `src/domain/timeline.ts`; `MILESTONES`, `PHASES`, `DANGER_WINDOW_TIPS`, `SOURCES` from `src/content/`; `useQuitState`; `recordMilestoneReached` from repositories; all four formatters; `theme`.
- Produces: nothing consumed by later tasks.

Layout is the approved direction: now-anchored and phase-chaptered in one scroll. Past chapters collapse to one-line dated receipts, the current chapter expands with its tips and active milestone, future chapters are dimmed. A danger-window banner replaces the current chapter's tips while active.

- [ ] **Step 1: Write `src/ui/Hero.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { formatElapsed, formatMinutesNotLost, formatMoneyMinor } from '@/domain/format';
import type { Savings, Elapsed } from '@/domain/types';
import { theme } from './theme';

export function Hero(props: { elapsed: Elapsed; savings: Savings; currency: string; phaseName: string; currentlySmoking: boolean }) {
  if (props.currentlySmoking) {
    return (
      <View style={[styles.hero, styles.heroSmoking]}>
        <Text style={styles.smokingTitle}>You’re smoking again right now</Text>
        <Text style={styles.smokingBody}>
          That’s logged, not judged. Your best run was {formatElapsed(props.elapsed)} — you’ve already proved
          you can do this once. End the period from the Log screen whenever you’re ready to start again.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.hero}>
      <Text style={styles.big}>{formatElapsed(props.elapsed)}</Text>
      <Text style={styles.sub}>smoke-free · {props.phaseName}</Text>
      <View style={styles.row}>
        <Stat value={formatMoneyMinor(props.savings.moneySavedMinor, props.currency)} label="saved" />
        <Stat value={String(props.savings.cigarettesAvoided)} label="not smoked" />
        <Stat value={formatMinutesNotLost(props.savings.minutesNotLost)} label="time not lost" />
      </View>
    </View>
  );
}

function Stat(props: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{props.value}</Text>
      <Text style={styles.statLabel}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: theme.color.heroBg, borderRadius: theme.radius.lg, padding: theme.space.lg },
  heroSmoking: { backgroundColor: theme.color.danger },
  big: { fontSize: theme.font.hero, fontWeight: '700', color: theme.color.heroText, letterSpacing: -0.5 },
  sub: { fontSize: theme.font.small, color: theme.color.heroText, opacity: 0.75, marginTop: theme.space.xs },
  row: { flexDirection: 'row', gap: theme.space.sm, marginTop: theme.space.lg },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: theme.radius.sm, padding: theme.space.sm },
  statValue: { color: theme.color.heroText, fontSize: theme.font.small, fontWeight: '700' },
  statLabel: { color: theme.color.heroText, opacity: 0.7, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  smokingTitle: { fontSize: theme.font.title, fontWeight: '700', color: theme.color.heroText },
  smokingBody: { fontSize: theme.font.small, color: theme.color.heroText, opacity: 0.9, lineHeight: 19, marginTop: theme.space.sm },
});
```

- [ ] **Step 2: Write `src/ui/MilestoneNode.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { formatMilestoneDate } from '@/domain/format';
import type { MilestoneState } from '@/domain/types';
import { theme } from './theme';

const BEHAVIOUR_LABEL: Record<string, string> = {
  restarts: 'Restarts if you slip',
  cumulative: 'A slip does not undo this',
  qualitative: 'No fixed timeline',
};

export function MilestoneNode(props: { state: MilestoneState; compact: boolean }) {
  const { state, compact } = props;
  const { milestone, status } = state;

  if (compact) {
    return (
      <View style={styles.compact}>
        <Text style={styles.tick}>✓</Text>
        <Text style={styles.compactText} numberOfLines={1}>
          {milestone.title}
          {state.reachedAt ? ` — ${formatMilestoneDate(state.reachedAt)}` : ''}
        </Text>
      </View>
    );
  }

  const cardStyle = [
    styles.card,
    status === 'reached' && styles.cardDone,
    status === 'in-progress' && styles.cardActive,
    status === 'future' && styles.cardFuture,
  ];

  return (
    <View style={styles.node}>
      <View style={[styles.dot, status === 'reached' && styles.dotDone, status === 'in-progress' && styles.dotActive]} />
      <View style={cardStyle}>
        <Text style={styles.time}>
          {status === 'in-progress' ? 'Happening now' : status === 'reached' ? 'Reached' : 'Ahead of you'}
          {state.projectedAt && status === 'future' ? ` · ${formatMilestoneDate(state.projectedAt)}` : ''}
          {state.reachedAt && status === 'reached' ? ` · ${formatMilestoneDate(state.reachedAt)}` : ''}
        </Text>
        <Text style={styles.title}>{milestone.title}</Text>
        {milestone.body ? <Text style={styles.body}>{milestone.body}</Text> : null}

        {state.progress !== null ? (
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(state.progress * 100)}%` }]} />
          </View>
        ) : null}

        <Text style={styles.badge}>{BEHAVIOUR_LABEL[milestone.slipBehavior]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  node: { flexDirection: 'row', gap: theme.space.md, marginBottom: theme.space.md },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: theme.color.border, backgroundColor: theme.color.surface, marginTop: theme.space.md },
  dotDone: { backgroundColor: theme.color.done, borderColor: theme.color.done },
  dotActive: { backgroundColor: theme.color.active, borderColor: theme.color.active },
  card: { flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md, padding: theme.space.md, backgroundColor: theme.color.surface },
  cardDone: { backgroundColor: theme.color.doneBg, borderColor: theme.color.doneBorder },
  cardActive: { backgroundColor: theme.color.activeBg, borderColor: theme.color.activeBorder, borderWidth: 2 },
  cardFuture: { opacity: 0.55 },
  time: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: theme.color.textFaint },
  title: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.text, marginTop: 2, marginBottom: 3 },
  body: { fontSize: theme.font.tiny, color: theme.color.textMuted, lineHeight: 16 },
  bar: { height: 4, backgroundColor: theme.color.border, borderRadius: 3, marginTop: theme.space.sm, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: theme.color.active },
  badge: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: theme.color.textFaint, marginTop: theme.space.sm },
  compact: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, paddingVertical: 5 },
  tick: { color: theme.color.done, fontWeight: '700', fontSize: theme.font.small },
  compactText: { flex: 1, fontSize: theme.font.tiny, color: theme.color.textMuted },
});
```

- [ ] **Step 3: Write `src/ui/ChapterBlock.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import type { Chapter } from '@/domain/types';
import { MilestoneNode } from './MilestoneNode';
import { theme } from './theme';

export interface TipContent {
  whatsHappening: string;
  whyYouFeelThisWay: string;
  howToCope: readonly string[];
}

export function ChapterBlock(props: { chapter: Chapter; tips: TipContent | null; tipsAreDangerWindow: boolean }) {
  const { chapter, tips } = props;
  const isCurrent = chapter.status === 'current';

  return (
    <View style={chapter.status === 'future' ? styles.future : undefined}>
      <View style={styles.header}>
        <View style={[styles.num, chapter.status === 'past' && styles.numPast, chapter.status === 'future' && styles.numFuture]}>
          <Text style={styles.numText}>{chapter.status === 'past' ? '✓' : chapter.phase.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{chapter.phase.name}</Text>
          <Text style={styles.range}>{isCurrent ? 'you are here' : chapter.status === 'past' ? 'behind you' : 'ahead'}</Text>
        </View>
      </View>

      {isCurrent && tips ? (
        <View style={[styles.tipBox, props.tipsAreDangerWindow && styles.tipBoxDanger]}>
          <Text style={[styles.tipLabel, props.tipsAreDangerWindow && styles.tipLabelDanger]}>What’s happening</Text>
          <Text style={styles.tipText}>{tips.whatsHappening}</Text>

          <Text style={[styles.tipLabel, props.tipsAreDangerWindow && styles.tipLabelDanger, styles.tipLabelSpaced]}>
            Why you feel this way
          </Text>
          <Text style={styles.tipText}>{tips.whyYouFeelThisWay}</Text>

          <Text style={[styles.tipLabel, props.tipsAreDangerWindow && styles.tipLabelDanger, styles.tipLabelSpaced]}>
            What to do about it
          </Text>
          {tips.howToCope.map((tip) => (
            <Text key={tip} style={styles.tipBullet}>• {tip}</Text>
          ))}
        </View>
      ) : null}

      {chapter.milestones.map((milestoneState) => (
        <MilestoneNode
          key={milestoneState.milestone.id}
          state={milestoneState}
          compact={chapter.status === 'past' && milestoneState.status === 'reached'}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  future: { opacity: 0.5 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, marginTop: theme.space.lg, marginBottom: theme.space.md },
  num: { width: 24, height: 24, borderRadius: theme.radius.sm, backgroundColor: theme.color.heroBg, alignItems: 'center', justifyContent: 'center' },
  numPast: { backgroundColor: theme.color.done },
  numFuture: { backgroundColor: theme.color.textFaint },
  numText: { color: theme.color.heroText, fontSize: theme.font.tiny, fontWeight: '700' },
  name: { fontSize: theme.font.small, fontWeight: '700', color: theme.color.text },
  range: { fontSize: 9, color: theme.color.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipBox: {
    backgroundColor: theme.color.tipBg,
    borderLeftWidth: 3,
    borderLeftColor: theme.color.tipAccent,
    borderRadius: theme.radius.sm,
    padding: theme.space.md,
    marginBottom: theme.space.md,
  },
  tipBoxDanger: { backgroundColor: theme.color.dangerBg, borderLeftColor: theme.color.danger },
  tipLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.color.tipLabel },
  tipLabelDanger: { color: theme.color.danger },
  tipLabelSpaced: { marginTop: theme.space.md },
  tipText: { fontSize: theme.font.tiny, color: theme.color.textMuted, lineHeight: 17, marginTop: 3 },
  tipBullet: { fontSize: theme.font.tiny, color: theme.color.textMuted, lineHeight: 17, marginTop: 4 },
});
```

- [ ] **Step 4: Write `app/index.tsx`**

```tsx
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { recordMilestoneReached } from '@/data/repositories';
import { buildTimeline } from '@/domain/timeline';
import { MILESTONES } from '@/content/milestones';
import { DANGER_WINDOW_TIPS, PHASES } from '@/content/phases';
import { ChapterBlock } from '@/ui/ChapterBlock';
import { Hero } from '@/ui/Hero';
import { theme } from '@/ui/theme';
import { useQuitState } from '@/ui/useQuitState';

export default function Timeline() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, loading, reload } = useQuitState();

  // Re-tick every minute so the counter is live without a heavy interval.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Reload after returning from the log or settings modals.
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  useEffect(() => {
    if (!loading && state === null) router.replace('/onboarding');
  }, [loading, state, router]);

  const timeline = useMemo(
    () => (state ? buildTimeline({ state, milestones: MILESTONES, phases: PHASES, now }) : null),
    [state, now],
  );

  // Persist newly reached milestones so notifications never re-fire for them.
  const recorded = useRef(new Set<string>());
  useEffect(() => {
    if (!timeline) return;
    const reached = timeline.chapters
      .flatMap((chapter) => chapter.milestones)
      .filter((milestoneState) => milestoneState.status === 'reached' && milestoneState.reachedAt !== null);

    void (async () => {
      for (const milestoneState of reached) {
        if (recorded.current.has(milestoneState.milestone.id)) continue;
        recorded.current.add(milestoneState.milestone.id);
        await recordMilestoneReached(db, milestoneState.milestone.id, milestoneState.reachedAt as string);
      }
    })();
  }, [timeline, db]);

  if (loading || !timeline || !state) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.color.heroBg} />
      </View>
    );
  }

  const { dangerWindow, currentPhase } = timeline;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + theme.space.md }]}>
        <View style={styles.topBar}>
          <Link href="/log" style={styles.topLink}>Log</Link>
          <Link href="/settings" style={styles.topLink}>Settings</Link>
        </View>

        <Hero
          elapsed={timeline.elapsed}
          savings={timeline.savings}
          currency={state.settings.currency}
          phaseName={currentPhase.name}
          currentlySmoking={timeline.anchors.isCurrentlySmoking}
        />

        {dangerWindow.active ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Danger window · {dangerWindow.daysRemaining} days left</Text>
            <Text style={styles.bannerBody}>
              Most slips that become relapses do it within about 19 days. You’re inside that window, so the
              guidance below has changed to match.
            </Text>
          </View>
        ) : null}

        {timeline.chapters.map((chapter) => (
          <ChapterBlock
            key={chapter.phase.id}
            chapter={chapter}
            tips={
              chapter.status !== 'current'
                ? null
                : dangerWindow.active
                  ? DANGER_WINDOW_TIPS
                  : {
                      whatsHappening: chapter.phase.whatsHappening,
                      whyYouFeelThisWay: chapter.phase.whyYouFeelThisWay,
                      howToCope: chapter.phase.howToCope,
                    }
            }
            tipsAreDangerWindow={chapter.status === 'current' && dangerWindow.active}
          />
        ))}

        <Text style={styles.footer}>
          Every claim above is sourced. See Settings for the citations, and remember this app is not
          medical advice.
        </Text>
      </ScrollView>

      <Pressable style={[styles.sos, { bottom: insets.bottom + theme.space.lg }]} onPress={() => router.push('/sos')}>
        <Text style={styles.sosText}>I want to smoke</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.bg },
  page: { padding: theme.space.lg, paddingBottom: 120 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.space.lg, marginBottom: theme.space.md },
  topLink: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.heroBg },
  banner: {
    marginTop: theme.space.md,
    backgroundColor: theme.color.dangerBg,
    borderWidth: 1,
    borderColor: theme.color.dangerBorder,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
  },
  bannerTitle: { fontSize: theme.font.small, fontWeight: '700', color: theme.color.danger },
  bannerBody: { fontSize: theme.font.tiny, color: theme.color.textMuted, lineHeight: 17, marginTop: 4 },
  footer: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16, marginTop: theme.space.xl },
  sos: {
    position: 'absolute',
    left: theme.space.lg,
    right: theme.space.lg,
    backgroundColor: theme.color.danger,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.space.md,
    alignItems: 'center',
  },
  sosText: { color: '#fff', fontSize: theme.font.body, fontWeight: '700' },
});
```

- [ ] **Step 5: Run the app and verify on a device or emulator**

Run: `npm run android`

Verify by hand, because this is the first task whose output is not covered by unit tests:
1. First launch lands on onboarding. Enter 43 days ago, 15/day, 20/pack, 11.00.
2. Timeline shows "43 days, N hours", €354.75 saved, 645 not smoked, 8 days time not lost.
3. Current chapter is Consolidation, expanded with tips; The Crash and The Fog are collapsed to ticked receipts with dates; The Long Haul and Non-Smoker are dimmed.
4. "Coughing and breathlessness decrease" shows a progress bar roughly 10% full.
5. The SOS button is pinned above the bottom inset and navigates.

- [ ] **Step 6: Commit**

```bash
git add app/index.tsx src/ui/Hero.tsx src/ui/MilestoneNode.tsx src/ui/ChapterBlock.tsx
git commit -m "feat: now-anchored phase-chaptered recovery timeline"
```

---

### Task 14: Craving SOS

**Files:**
- Create: `src/content/sos.ts`
- Create: `app/sos.tsx`
- Test: `src/content/sos.test.ts`

**Interfaces:**
- Consumes: `addSlip` from repositories; `theme`.
- Produces: `SOS_STEPS: SosStep[]` where `interface SosStep { id: string; seconds: number; heading: string; instruction: string }`; `SOS_TOTAL_SECONDS: number`.

The intervention is built on the fact that a craving peaks and passes in 3–5 minutes, so the script totals 300 seconds. The honest exit records either "it passed" or a slip, and the slip path carries no shaming copy.

- [ ] **Step 1: Write `src/content/sos.ts`**

```ts
export interface SosStep {
  id: string;
  seconds: number;
  heading: string;
  instruction: string;
}

/** The 4 Ds, timed. Totals 300 seconds because a craving peaks and passes in 3–5 minutes. */
export const SOS_STEPS: SosStep[] = [
  {
    id: 'delay',
    seconds: 60,
    heading: 'Delay',
    instruction: 'You are not saying no forever. You are saying not in the next minute. That is all this screen is asking.',
  },
  {
    id: 'breathe',
    seconds: 90,
    heading: 'Breathe',
    instruction: 'In through your nose for four counts, hold for four, out through your mouth for six. Keep going until the number below runs out.',
  },
  {
    id: 'drink',
    seconds: 60,
    heading: 'Drink water',
    instruction: 'Get a full glass and finish it slowly. It occupies your hands and your mouth, which is most of what a cigarette was doing.',
  },
  {
    id: 'distract',
    seconds: 90,
    heading: 'Distract',
    instruction: 'Leave the room you are in. Walk somewhere, message someone, wash something. The craving needs your attention to survive.',
  },
];

export const SOS_TOTAL_SECONDS = SOS_STEPS.reduce((total, step) => total + step.seconds, 0);
```

- [ ] **Step 2: Write the failing test**

`src/content/sos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SOS_STEPS, SOS_TOTAL_SECONDS } from './sos';

describe('SOS_STEPS', () => {
  it('SOS_STEPS_wholeScript_lastsFiveMinutes', () => {
    // Arrange & Act & Assert — a craving peaks and passes in 3–5 minutes
    expect(SOS_TOTAL_SECONDS).toBe(300);
  });

  it('SOS_STEPS_everyStep_hasPositiveDurationAndCopy', () => {
    // Arrange & Act
    const broken = SOS_STEPS.filter((step) => step.seconds <= 0 || step.instruction.trim() === '');

    // Assert
    expect(broken.map((step) => step.id)).toEqual([]);
  });

  it('SOS_STEPS_everyStep_hasUniqueId', () => {
    // Arrange
    const ids = SOS_STEPS.map((step) => step.id);

    // Act & Assert
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npm test -- src/content/sos.test.ts`
Expected: PASS (content and test are written together; if the total is not 300, adjust the step seconds, not the assertion).

- [ ] **Step 4: Write `app/sos.tsx`**

```tsx
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addSlip } from '@/data/repositories';
import { SOS_STEPS } from '@/content/sos';
import type { SlipTrigger } from '@/domain/types';
import { theme } from '@/ui/theme';

const TRIGGERS: SlipTrigger[] = ['alcohol', 'stress', 'social', 'boredom', 'routine', 'other'];

export default function Sos() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(SOS_STEPS[0]?.seconds ?? 60);
  const [outcome, setOutcome] = useState<'running' | 'passed' | 'slipped'>('running');
  const [count, setCount] = useState('1');
  const [trigger, setTrigger] = useState<SlipTrigger | null>(null);

  useEffect(() => {
    if (outcome !== 'running') return;
    const id = setInterval(() => setRemaining((value) => value - 1), 1000);
    return () => clearInterval(id);
  }, [outcome]);

  useEffect(() => {
    if (remaining > 0) return;
    const next = stepIndex + 1;
    if (next < SOS_STEPS.length) {
      setStepIndex(next);
      setRemaining(SOS_STEPS[next]?.seconds ?? 60);
    } else {
      setOutcome('passed');
    }
  }, [remaining, stepIndex]);

  const logSlip = async () => {
    const parsed = /^\d+$/.test(count.trim()) ? Number(count) : 1;
    await addSlip(
      db,
      { occurredAt: new Date().toISOString(), cigaretteCount: Math.max(1, parsed), trigger, note: null },
      new Date(),
    );
    router.replace('/');
  };

  if (outcome === 'slipped') {
    return (
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + theme.space.xl }]}>
        <Text style={styles.h1}>Alright. Let’s log it accurately.</Text>
        <Text style={styles.body}>
          One cigarette is not a failed quit attempt — treating it as one is what turns it into a relapse.
          Your carbon monoxide and nicotine clocks restart from this. Everything measured in months and
          years keeps running, because those depend on cumulative exposure and this barely registers
          against it.
        </Text>

        <Text style={styles.label}>How many did you smoke?</Text>
        <TextInput style={styles.input} value={count} onChangeText={setCount} keyboardType="number-pad" accessibilityLabel="Number of cigarettes" />

        <Text style={styles.label}>What set it off? (optional)</Text>
        <View style={styles.chips}>
          {TRIGGERS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setTrigger(trigger === option ? null : option)}
              style={[styles.chip, trigger === option && styles.chipActive]}
            >
              <Text style={[styles.chipText, trigger === option && styles.chipTextActive]}>{option}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.cta} onPress={logSlip}>
          <Text style={styles.ctaText}>Log it and carry on</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (outcome === 'passed') {
    return (
      <View style={[styles.page, styles.centered, { paddingTop: insets.top + theme.space.xl }]}>
        <Text style={styles.h1}>It passed.</Text>
        <Text style={styles.body}>
          That is what cravings do — five minutes, every time, whether you feed them or not. You now have
          direct evidence of that, which is worth more than anything this app can tell you.
        </Text>
        <Pressable style={styles.cta} onPress={() => router.replace('/')}>
          <Text style={styles.ctaText}>Back to the timeline</Text>
        </Pressable>
      </View>
    );
  }

  const step = SOS_STEPS[stepIndex];

  return (
    <View style={[styles.page, { paddingTop: insets.top + theme.space.xl }]}>
      <Text style={styles.stepCount}>Step {stepIndex + 1} of {SOS_STEPS.length}</Text>
      <Text style={styles.h1}>{step?.heading}</Text>
      <Text style={styles.timer}>{Math.max(0, remaining)}</Text>
      <Text style={styles.body}>{step?.instruction}</Text>

      <View style={{ flex: 1 }} />

      <Pressable style={styles.secondary} onPress={() => setOutcome('passed')}>
        <Text style={styles.secondaryText}>It’s passed, I’m fine</Text>
      </Pressable>
      <Pressable style={styles.tertiary} onPress={() => setOutcome('slipped')}>
        <Text style={styles.tertiaryText}>I smoked</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: theme.space.lg, gap: theme.space.md, backgroundColor: theme.color.bg },
  centered: { justifyContent: 'center' },
  stepCount: { fontSize: theme.font.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: theme.color.textFaint },
  h1: { fontSize: theme.font.title, fontWeight: '700', color: theme.color.text },
  timer: { fontSize: 64, fontWeight: '700', color: theme.color.heroBg, letterSpacing: -2 },
  body: { fontSize: theme.font.body, color: theme.color.textMuted, lineHeight: 22 },
  label: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.text, marginTop: theme.space.md },
  input: {
    borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface, paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm, fontSize: theme.font.body, color: theme.color.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  chip: { borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.pill, paddingHorizontal: theme.space.md, paddingVertical: 6, backgroundColor: theme.color.surface },
  chipActive: { backgroundColor: theme.color.heroBg, borderColor: theme.color.heroBg },
  chipText: { fontSize: theme.font.tiny, color: theme.color.textMuted },
  chipTextActive: { color: theme.color.heroText, fontWeight: '600' },
  cta: { backgroundColor: theme.color.heroBg, borderRadius: theme.radius.md, paddingVertical: theme.space.md, alignItems: 'center', marginTop: theme.space.lg },
  ctaText: { color: theme.color.heroText, fontSize: theme.font.body, fontWeight: '700' },
  secondary: { backgroundColor: theme.color.done, borderRadius: theme.radius.md, paddingVertical: theme.space.md, alignItems: 'center' },
  secondaryText: { color: '#fff', fontSize: theme.font.body, fontWeight: '700' },
  tertiary: { paddingVertical: theme.space.md, alignItems: 'center' },
  tertiaryText: { color: theme.color.textFaint, fontSize: theme.font.small },
});
```

- [ ] **Step 5: Verify on device**

Run: `npm run android`
Check: the timer counts down, advances through all four steps, "I smoked" reaches the logging form, and a logged slip returns to a timeline showing the danger-window banner.

- [ ] **Step 6: Commit**

```bash
git add src/content/sos.ts src/content/sos.test.ts app/sos.tsx
git commit -m "feat: timed craving SOS intervention with honest slip logging"
```

---

### Task 15: Log screen

**Files:**
- Create: `app/log.tsx`
- Create: `src/ui/CravingChart.tsx`

**Interfaces:**
- Consumes: `addSlip`, `startSmokingPeriod`, `endSmokingPeriod`, `saveCheckin`, `listCheckins`, `CheckinRow` from repositories; `useQuitState`; `theme`.
- Produces: nothing consumed by later tasks.

The chart is drawn with plain `View` bars rather than a charting library, because a 30-bar sparkline does not justify a dependency and every library would need native linking.

- [ ] **Step 1: Write `src/ui/CravingChart.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import type { CheckinRow } from '@/data/repositories';
import { theme } from './theme';

/** Craving intensity 1–5 as bar heights, oldest on the left. */
export function CravingChart(props: { checkins: CheckinRow[] }) {
  const ordered = [...props.checkins].reverse().slice(-30);

  if (ordered.length === 0) {
    return <Text style={styles.empty}>No check-ins yet. Log one below and a pattern will build up here.</Text>;
  }

  return (
    <View>
      <View style={styles.chart}>
        {ordered.map((checkin) => (
          <View
            key={checkin.loggedOn}
            style={[styles.bar, { height: `${(checkin.cravingIntensity / 5) * 100}%` }]}
            accessibilityLabel={`${checkin.loggedOn}: craving ${checkin.cravingIntensity} of 5`}
          />
        ))}
      </View>
      <Text style={styles.axis}>
        {ordered[0]?.loggedOn} → {ordered[ordered.length - 1]?.loggedOn}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 80 },
  bar: { flex: 1, backgroundColor: theme.color.active, borderRadius: 2, minHeight: 3 },
  axis: { fontSize: 9, color: theme.color.textFaint, marginTop: theme.space.xs },
  empty: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16 },
});
```

- [ ] **Step 2: Write `app/log.tsx`**

```tsx
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addSlip,
  endSmokingPeriod,
  listCheckins,
  saveCheckin,
  startSmokingPeriod,
  type CheckinRow,
} from '@/data/repositories';
import type { SlipTrigger } from '@/domain/types';
import { CravingChart } from '@/ui/CravingChart';
import { theme } from '@/ui/theme';
import { useQuitState } from '@/ui/useQuitState';

const TRIGGERS: SlipTrigger[] = ['alcohol', 'stress', 'social', 'boredom', 'routine', 'other'];
const SCALE = [1, 2, 3, 4, 5];

export default function Log() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, reload } = useQuitState();

  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [slipCount, setSlipCount] = useState('1');
  const [slipTrigger, setSlipTrigger] = useState<SlipTrigger | null>(null);
  const [craving, setCraving] = useState(3);
  const [mood, setMood] = useState(3);
  const [relapseAvg, setRelapseAvg] = useState('15');
  const [status, setStatus] = useState<string | null>(null);

  const loadCheckins = useCallback(async () => {
    setCheckins(await listCheckins(db, 30));
  }, [db]);

  useEffect(() => { void loadCheckins(); }, [loadCheckins]);

  const currentlySmoking = state?.periods.some((period) => period.endedAt === null) ?? false;

  const submitSlip = async () => {
    const parsed = /^\d+$/.test(slipCount.trim()) ? Math.max(1, Number(slipCount)) : 1;
    await addSlip(db, { occurredAt: new Date().toISOString(), cigaretteCount: parsed, trigger: slipTrigger, note: null }, new Date());
    await reload();
    setStatus('Slip logged. Your fast clocks restarted; the long ones did not.');
  };

  const submitCheckin = async () => {
    const today = new Date().toISOString().slice(0, 10);
    await saveCheckin(db, { loggedOn: today, cravingIntensity: craving, mood, note: null }, new Date());
    await loadCheckins();
    setStatus('Check-in saved.');
  };

  const toggleRelapse = async () => {
    if (currentlySmoking) {
      await endSmokingPeriod(db, new Date().toISOString());
      setStatus('Welcome back. Your long-term clocks restart from today.');
    } else {
      const parsed = /^\d+$/.test(relapseAvg.trim()) ? Math.max(1, Number(relapseAvg)) : 15;
      await startSmokingPeriod(db, { startedAt: new Date().toISOString(), averageCigarettesPerDay: parsed, note: null }, new Date());
      setStatus('Logged. Nothing here is a verdict on you — come back when you are ready.');
    }
    await reload();
  };

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + theme.space.lg }]}>
      <Pressable onPress={() => router.back()}><Text style={styles.close}>Close</Text></Pressable>

      <Text style={styles.h2}>Today’s check-in</Text>
      <Scale label="Craving intensity" value={craving} onChange={setCraving} />
      <Scale label="Mood" value={mood} onChange={setMood} />
      <Pressable style={styles.cta} onPress={submitCheckin}><Text style={styles.ctaText}>Save check-in</Text></Pressable>

      <Text style={styles.h2}>Craving over the last 30 days</Text>
      <CravingChart checkins={checkins} />

      <Text style={styles.h2}>Log a slip</Text>
      <Text style={styles.hint}>A few cigarettes, still quit. This subtracts exactly what you smoked — nothing more.</Text>
      <TextInput style={styles.input} value={slipCount} onChangeText={setSlipCount} keyboardType="number-pad" accessibilityLabel="Cigarettes smoked" />
      <View style={styles.chips}>
        {TRIGGERS.map((option) => (
          <Pressable key={option} onPress={() => setSlipTrigger(slipTrigger === option ? null : option)} style={[styles.chip, slipTrigger === option && styles.chipActive]}>
            <Text style={[styles.chipText, slipTrigger === option && styles.chipTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.cta} onPress={submitSlip}><Text style={styles.ctaText}>Log slip</Text></Pressable>

      <Text style={styles.h2}>{currentlySmoking ? 'Start again' : 'I’ve gone back to smoking'}</Text>
      {currentlySmoking ? (
        <Text style={styles.hint}>Ends the current smoking period. Your long-term recovery clocks restart from today; your best previous streak is kept.</Text>
      ) : (
        <>
          <Text style={styles.hint}>Not a slip — a return to regular smoking. Roughly how many a day?</Text>
          <TextInput style={styles.input} value={relapseAvg} onChangeText={setRelapseAvg} keyboardType="number-pad" accessibilityLabel="Average cigarettes per day" />
        </>
      )}
      <Pressable style={[styles.cta, styles.ctaMuted]} onPress={toggleRelapse}>
        <Text style={styles.ctaText}>{currentlySmoking ? 'I’ve stopped again' : 'Log a relapse'}</Text>
      </Pressable>

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </ScrollView>
  );
}

function Scale(props: { label: string; value: number; onChange: (next: number) => void }) {
  return (
    <View style={{ gap: theme.space.xs }}>
      <Text style={styles.label}>{props.label}</Text>
      <View style={styles.chips}>
        {SCALE.map((option) => (
          <Pressable key={option} onPress={() => props.onChange(option)} style={[styles.chip, props.value === option && styles.chipActive]}>
            <Text style={[styles.chipText, props.value === option && styles.chipTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.md, backgroundColor: theme.color.bg },
  close: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.heroBg, alignSelf: 'flex-end' },
  h2: { fontSize: theme.font.body, fontWeight: '700', color: theme.color.text, marginTop: theme.space.lg },
  hint: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16 },
  label: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.text },
  input: {
    borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface, paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm, fontSize: theme.font.body, color: theme.color.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  chip: { borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.pill, paddingHorizontal: theme.space.md, paddingVertical: 6, backgroundColor: theme.color.surface },
  chipActive: { backgroundColor: theme.color.heroBg, borderColor: theme.color.heroBg },
  chipText: { fontSize: theme.font.tiny, color: theme.color.textMuted },
  chipTextActive: { color: theme.color.heroText, fontWeight: '600' },
  cta: { backgroundColor: theme.color.heroBg, borderRadius: theme.radius.md, paddingVertical: theme.space.md, alignItems: 'center' },
  ctaMuted: { backgroundColor: theme.color.textFaint },
  ctaText: { color: theme.color.heroText, fontSize: theme.font.body, fontWeight: '700' },
  status: { fontSize: theme.font.small, color: theme.color.done, marginTop: theme.space.md },
});
```

- [ ] **Step 3: Verify on device**

Run: `npm run android`
Check: a saved check-in appears as a bar; logging a slip returns you to a timeline with the danger banner and a reduced cigarettes-avoided count; logging a relapse switches the hero to the red currently-smoking state; ending it restores the counters with the cumulative anchor moved to today.

- [ ] **Step 4: Commit**

```bash
git add app/log.tsx src/ui/CravingChart.tsx
git commit -m "feat: log screen for slips, relapses and daily craving check-ins"
```

---

### Task 16: Settings, sources, export and delete

**Files:**
- Create: `app/settings.tsx`
- Modify: `package.json` (add `expo-file-system`, `expo-sharing`)

**Interfaces:**
- Consumes: `exportAll`, `deleteEverything`, `saveSettings` from repositories; `SOURCES` from content; `useQuitState`; `theme`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Install the two export dependencies**

```bash
npx expo install expo-file-system expo-sharing
```

- [ ] **Step 2: Write `app/settings.tsx`**

```tsx
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SOURCES } from '@/content/sources';
import { deleteEverything, exportAll, saveSettings } from '@/data/repositories';
import { theme } from '@/ui/theme';
import { useQuitState } from '@/ui/useQuitState';

const HELP_LINKS = [
  { label: 'Ikstopnu.nl — Dutch national quit support', url: 'https://www.ikstopnu.nl/' },
  { label: 'NHS Better Health — Quit Smoking', url: 'https://www.nhs.uk/better-health/quit-smoking/' },
];

export default function Settings() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, reload } = useQuitState();

  const [perDay, setPerDay] = useState(String(state?.settings.cigarettesPerDay ?? 15));
  const [price, setPrice] = useState(((state?.settings.packPriceMinor ?? 1100) / 100).toFixed(2));
  const [status, setStatus] = useState<string | null>(null);

  const save = async () => {
    if (!state) return;
    const cigarettesPerDay = /^\d+$/.test(perDay.trim()) ? Number(perDay) : null;
    const packPriceMinor = /^\d+(\.\d{1,2})?$/.test(price.replace(',', '.').trim())
      ? Math.round(Number(price.replace(',', '.')) * 100)
      : null;

    if (cigarettesPerDay === null || cigarettesPerDay <= 0) return setStatus('Cigarettes per day must be a whole number above zero.');
    if (packPriceMinor === null) return setStatus('Pack price must look like 11 or 11.50.');

    await saveSettings(db, { ...state.settings, cigarettesPerDay, packPriceMinor }, new Date());
    await reload();
    setStatus('Saved. Every figure has been recalculated.');
  };

  const exportData = async () => {
    const json = await exportAll(db);
    const path = `${FileSystem.cacheDirectory}smokefree-export.json`;
    await FileSystem.writeAsStringAsync(path, json);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export your data' });
    } else {
      setStatus(`Saved to ${path}`);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete everything?',
      'Your quit date, slips, relapses and check-ins will be permanently removed from this phone. There is no cloud copy, so this cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEverything(db);
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + theme.space.lg }]}>
      <Pressable onPress={() => router.back()}><Text style={styles.close}>Back</Text></Pressable>

      <Text style={styles.h2}>Your numbers</Text>
      <Text style={styles.label}>Cigarettes per day</Text>
      <TextInput style={styles.input} value={perDay} onChangeText={setPerDay} keyboardType="number-pad" accessibilityLabel="Cigarettes per day" />
      <Text style={styles.label}>Price per pack</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" accessibilityLabel="Price per pack" />
      <Pressable style={styles.cta} onPress={save}><Text style={styles.ctaText}>Save</Text></Pressable>

      <Text style={styles.h2}>Your data</Text>
      <Text style={styles.hint}>
        Everything lives in a database file on this phone. Nothing is uploaded, there is no account, and no
        analytics are collected. That also means an export is your only backup.
      </Text>
      <Pressable style={[styles.cta, styles.ctaMuted]} onPress={exportData}><Text style={styles.ctaText}>Export as JSON</Text></Pressable>
      <Pressable style={[styles.cta, styles.ctaDanger]} onPress={confirmDelete}><Text style={styles.ctaText}>Delete everything</Text></Pressable>

      <Text style={styles.h2}>Where the claims come from</Text>
      <Text style={styles.hint}>
        Every physiological statement in this app is traceable. Two claims that appear in most quit-smoking
        timelines online — nerve endings regrowing at 48 hours and bronchial tubes relaxing at 72 — are
        deliberately absent, because they could not be traced to a primary source.
      </Text>
      {Object.values(SOURCES).map((source) => (
        <Pressable key={source.id} onPress={() => void Linking.openURL(source.url)}>
          <Text style={styles.source}>{source.label}</Text>
        </Pressable>
      ))}

      <Text style={styles.h2}>Real help</Text>
      {HELP_LINKS.map((link) => (
        <Pressable key={link.url} onPress={() => void Linking.openURL(link.url)}>
          <Text style={styles.source}>{link.label}</Text>
        </Pressable>
      ))}

      <Text style={styles.disclaimer}>
        This app is not a medical device and does not provide medical advice. It reports published
        population-level findings, which are not predictions about you. Your GP or a national quitline will
        do more for your odds than any app, including this one.
      </Text>

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.sm, backgroundColor: theme.color.bg },
  close: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.heroBg },
  h2: { fontSize: theme.font.body, fontWeight: '700', color: theme.color.text, marginTop: theme.space.lg },
  label: { fontSize: theme.font.small, fontWeight: '600', color: theme.color.text, marginTop: theme.space.sm },
  hint: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16 },
  input: {
    borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface, paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm, fontSize: theme.font.body, color: theme.color.text,
  },
  cta: { backgroundColor: theme.color.heroBg, borderRadius: theme.radius.md, paddingVertical: theme.space.md, alignItems: 'center', marginTop: theme.space.md },
  ctaMuted: { backgroundColor: theme.color.textFaint },
  ctaDanger: { backgroundColor: theme.color.danger },
  ctaText: { color: theme.color.heroText, fontSize: theme.font.body, fontWeight: '700' },
  source: { fontSize: theme.font.tiny, color: theme.color.heroBg, lineHeight: 18, marginTop: theme.space.xs },
  disclaimer: { fontSize: theme.font.tiny, color: theme.color.textFaint, lineHeight: 16, marginTop: theme.space.lg },
  status: { fontSize: theme.font.small, color: theme.color.done, marginTop: theme.space.md },
});
```

- [ ] **Step 3: Verify on device**

Run: `npm run android`
Check: editing cigarettes-per-day changes the money figure on the timeline; export opens the share sheet with valid JSON; delete-everything returns to onboarding; every source link opens.

- [ ] **Step 4: Commit**

```bash
git add app/settings.tsx package.json package-lock.json
git commit -m "feat: settings with export, wipe, cited sources and real-help links"
```

---

### Task 17: Notification planning and scheduling

**Files:**
- Create: `src/domain/notifications.ts`
- Create: `src/notifications/schedule.ts`
- Test: `src/domain/notifications.test.ts`
- Modify: `app/index.tsx` (call `syncNotifications` after the timeline builds)

**Interfaces:**
- Consumes: `MilestoneState`, `DangerWindow`, `MS_PER_DAY` from types.
- Produces:
  - `planNotifications(input: NotificationPlanInput): PlannedNotification[]` — pure, from `src/domain/notifications.ts`
  - `syncNotifications(planned: PlannedNotification[]): Promise<void>` — from `src/notifications/schedule.ts`

```ts
export interface PlannedNotification {
  id: string;
  title: string;
  body: string;
  fireAt: string;   // ISO
}

export interface NotificationPlanInput {
  milestones: MilestoneState[];
  dangerWindow: DangerWindow;
  now: Date;
}
```

The planning is pure and tested; the Expo call is a thin loop. Milestones already reached are never planned, which is what keeps a re-reached milestone from re-firing.

- [ ] **Step 1: Write the failing tests**

`src/domain/notifications.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { planNotifications } from './notifications';
import { MS_PER_DAY, type DangerWindow, type Milestone, type MilestoneState } from './types';

const NOW = new Date('2026-08-08T08:00:00Z');

const milestone = (id: string): Milestone => ({
  id, title: `Title ${id}`, body: '', offsetMs: MS_PER_DAY, offsetEndMs: null,
  slipBehavior: 'cumulative', sourceId: 'acs', phaseId: 'crash',
});

const future = (id: string, daysAhead: number): MilestoneState => ({
  milestone: milestone(id),
  status: 'future',
  reachedAt: null,
  projectedAt: new Date(NOW.getTime() + daysAhead * MS_PER_DAY).toISOString(),
  progress: null,
});

const noDanger: DangerWindow = { active: false, endsAt: null, daysRemaining: null, triggeredBySlipId: null };

describe('planNotifications', () => {
  it('planNotifications_futureMilestone_schedulesOneAtItsProjectedDate', () => {
    // Arrange
    const input = { milestones: [future('co', 3)], dangerWindow: noDanger, now: NOW };

    // Act
    const result = planNotifications(input);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('milestone:co');
    expect(result[0]?.fireAt).toBe(new Date(NOW.getTime() + 3 * MS_PER_DAY).toISOString());
  });

  it('planNotifications_reachedMilestone_isNeverScheduled', () => {
    // Arrange
    const reached: MilestoneState = {
      milestone: milestone('co'), status: 'reached',
      reachedAt: '2026-08-01T08:00:00.000Z', projectedAt: null, progress: null,
    };

    // Act
    const result = planNotifications({ milestones: [reached], dangerWindow: noDanger, now: NOW });

    // Assert
    expect(result).toEqual([]);
  });

  it('planNotifications_milestoneMoreThanAYearOut_isSkipped', () => {
    // Arrange — no value in an OS-level alarm 15 years out
    const input = { milestones: [future('chd', 400)], dangerWindow: noDanger, now: NOW };

    // Act
    const result = planNotifications(input);

    // Assert
    expect(result).toEqual([]);
  });

  it('planNotifications_activeDangerWindow_addsADailyCheckInPerRemainingDay', () => {
    // Arrange
    const dangerWindow: DangerWindow = {
      active: true,
      endsAt: new Date(NOW.getTime() + 3 * MS_PER_DAY).toISOString(),
      daysRemaining: 3,
      triggeredBySlipId: 1,
    };

    // Act
    const result = planNotifications({ milestones: [], dangerWindow, now: NOW });

    // Assert
    expect(result.map((n) => n.id)).toEqual(['danger:1', 'danger:2', 'danger:3']);
  });

  it('planNotifications_inactiveDangerWindow_addsNoCheckIns', () => {
    // Arrange & Act
    const result = planNotifications({ milestones: [], dangerWindow: noDanger, now: NOW });

    // Assert
    expect(result.filter((n) => n.id.startsWith('danger:'))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/domain/notifications.test.ts`
Expected: FAIL — cannot resolve `./notifications`.

- [ ] **Step 3: Implement `src/domain/notifications.ts`**

```ts
import { MS_PER_DAY, type DangerWindow, type MilestoneState } from './types';

export interface PlannedNotification {
  id: string;
  title: string;
  body: string;
  fireAt: string;
}

export interface NotificationPlanInput {
  milestones: MilestoneState[];
  dangerWindow: DangerWindow;
  now: Date;
}

/** Beyond this horizon an OS alarm is pointless — the app will re-plan long before then. */
const HORIZON_DAYS = 365;

export function planNotifications({ milestones, dangerWindow, now }: NotificationPlanInput): PlannedNotification[] {
  const horizonMs = now.getTime() + HORIZON_DAYS * MS_PER_DAY;

  const milestoneNotifications = milestones
    .filter((state) => state.status !== 'reached' && state.projectedAt !== null)
    .filter((state) => new Date(state.projectedAt as string).getTime() <= horizonMs)
    .map((state) => ({
      id: `milestone:${state.milestone.id}`,
      title: 'Milestone reached',
      body: state.milestone.title,
      fireAt: state.projectedAt as string,
    }));

  const dangerNotifications: PlannedNotification[] = [];
  if (dangerWindow.active && dangerWindow.daysRemaining !== null) {
    for (let day = 1; day <= dangerWindow.daysRemaining; day += 1) {
      dangerNotifications.push({
        id: `danger:${day}`,
        title: 'Checking in',
        body: 'Still on track? A slip is only a slip until it becomes a habit. You have got this far.',
        fireAt: new Date(now.getTime() + day * MS_PER_DAY).toISOString(),
      });
    }
  }

  return [...milestoneNotifications, ...dangerNotifications];
}
```

- [ ] **Step 4: Implement `src/notifications/schedule.ts`**

```ts
import * as Notifications from 'expo-notifications';
import type { PlannedNotification } from '@/domain/notifications';

/**
 * Replaces all scheduled notifications with `planned`. Cancelling first keeps the OS queue
 * in sync when a slip changes what should fire, and makes the whole operation idempotent.
 */
export async function syncNotifications(planned: PlannedNotification[]): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  let granted = status === 'granted';

  if (!granted) {
    const request = await Notifications.requestPermissionsAsync();
    granted = request.status === 'granted';
  }
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const notification of planned) {
    const secondsFromNow = Math.round((new Date(notification.fireAt).getTime() - Date.now()) / 1000);
    if (secondsFromNow <= 0) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: notification.id,
      content: { title: notification.title, body: notification.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsFromNow },
    });
  }
}
```

- [ ] **Step 5: Wire it into `app/index.tsx`**

Add the imports:

```tsx
import { planNotifications } from '@/domain/notifications';
import { syncNotifications } from '@/notifications/schedule';
```

Then add this effect immediately after the milestone-recording effect. It keys off the danger-window state and the next milestone rather than `now`, so it does not re-run every minute:

```tsx
useEffect(() => {
  if (!timeline) return;
  const planned = planNotifications({
    milestones: timeline.chapters.flatMap((chapter) => chapter.milestones),
    dangerWindow: timeline.dangerWindow,
    now: new Date(),
  });
  void syncNotifications(planned);
}, [timeline?.dangerWindow.active, timeline?.nextMilestone?.milestone.id]);
```

- [ ] **Step 6: Run the tests, typecheck, and verify on device**

Run: `npm test && npm run typecheck && npm run android`
Check: the permission prompt appears once on first launch; declining it leaves the app fully usable; logging a slip re-plans the queue.

- [ ] **Step 7: Commit**

```bash
git add src/domain/notifications.ts src/domain/notifications.test.ts src/notifications/schedule.ts app/index.tsx
git commit -m "feat: pure notification planning with expo-notifications scheduling"
```

---

### Task 18: Release preparation

**Files:**
- Create: `eas.json`
- Create: `docs/privacy-policy.md`
- Create: `docs/play-store-listing.md`
- Modify: `app.json` (icons, splash, notification config, version code)
- Modify: `README.md`

**Interfaces:**
- Consumes: everything.
- Produces: an installable `.aab` and the text assets the Play Console forms require.

- [ ] **Step 1: Write `eas.json`**

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "distribution": "internal"
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "autoIncrement": true
    }
  },
  "submit": { "production": {} }
}
```

- [ ] **Step 2: Complete `app.json`**

Add to the `expo` object:

```json
{
  "icon": "./assets/icon.png",
  "splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#0f3d2e" },
  "android": {
    "package": "com.adzius.smokefree",
    "versionCode": 1,
    "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#0f3d2e" },
    "permissions": ["POST_NOTIFICATIONS"]
  }
}
```

Confirm no networking permissions are requested. `INTERNET` is added by React Native by default for dev; verify the production manifest with `npx expo prebuild --platform android` and inspect `android/app/src/main/AndroidManifest.xml`.

- [ ] **Step 3: Write `docs/privacy-policy.md`**

Play requires a policy URL for every app, even one that collects nothing. Host this alongside lead-engine on Hetzner and put the URL in Play Console.

```markdown
# Privacy Policy — Smoke Free

Last updated: 2026-08-08

## What this app collects

Nothing. Smoke Free has no user accounts, no servers, and makes no network requests.

## What it stores, and where

Your quit date, cigarettes per day, pack price, logged slips, logged smoking periods and daily
check-ins are stored in a database file inside the app's private storage on your own device.
That data is never transmitted anywhere. The developer cannot see it and has no copy of it.

## Sharing

No data is shared with anyone, because none is collected. There is no analytics SDK, no crash
reporting, and no advertising.

## Your control

Settings → Export as JSON gives you a complete copy of your data.
Settings → Delete everything permanently erases it from the device. Uninstalling the app also
removes it. Because there is no cloud copy, deletion is final.

## Notifications

If you grant notification permission, reminders are scheduled locally by your device's operating
system. No push server is involved and no device token is transmitted.

## Children

The app is not directed at children and collects no data from anyone.

## Contact

adzius.lech@gmail.com
```

- [ ] **Step 4: Write `docs/play-store-listing.md`**

```markdown
# Play Store listing

**App name:** Smoke Free
**Short description (max 80 chars):** Track your quit honestly — real recovery milestones, no invented setbacks.

**Full description:**

Smoke Free tracks how long you have gone without a cigarette, what that is doing to your body,
and what to expect next.

- A scrollable recovery timeline, chaptered by phase, anchored on where you are today.
- Every physiological claim is sourced. Two claims that appear in most quit-smoking timelines
  online are deliberately absent, because they could not be traced to a primary source.
- Money saved, cigarettes not smoked, and time not lost, calculated from your own numbers.
- Coping guidance for the phase you are actually in, so you know why you feel the way you feel.
- A timed craving intervention for the moment you want to smoke.
- Honest slip handling. Some recovery markers genuinely restart after one cigarette and this app
  restarts them. The ones driven by years of cumulative exposure do not, and it will not pretend
  otherwise or invent a number of "days of healing lost".

Everything stays on your phone. No account, no servers, no analytics, no ads.

Not medical advice. A GP or a national quitline will do more for your odds than any app.

## Data Safety form answers

- Does your app collect or share any required user data types? **No.**
- Is all user data encrypted in transit? **N/A — no data leaves the device.**
- Do you provide a way for users to request data deletion? **Yes — Settings → Delete everything.**

## Content rating questionnaire

Category: Health & Fitness. Contains no violence, sexual content, profanity or gambling.
References tobacco only in the context of cessation, never promotion.
```

- [ ] **Step 5: Confirm the release gate that applies to this account**

Check Play Console → Dashboard. Personal developer accounts created after 13 November 2023 must
run a closed test with at least 12 testers opted in for 14 continuous days before applying for
production access. Organisation accounts and older personal accounts are exempt. If the gate
applies, build the `preview` profile first and recruit testers now, because the 14 days run in
parallel with nothing else.

- [ ] **Step 6: Build and verify**

```bash
npm test && npm run typecheck
npx eas-cli@latest build --platform android --profile preview
```

Install the resulting APK on a real phone and confirm: onboarding, timeline, SOS, log, settings,
export, delete, and notifications all work with the device in aeroplane mode. Aeroplane mode is
the real acceptance test — anything that breaks offline is a bug.

- [ ] **Step 7: Update `README.md`**

Cover: what the app is, the layering rules, `npm test` / `npm run typecheck` / `npm run android`,
where the spec and plan live, the deliberate content exclusions, and a pointer to the phase-2
sync service as out of scope.

- [ ] **Step 8: Commit**

```bash
git add eas.json app.json docs/privacy-policy.md docs/play-store-listing.md README.md
git commit -m "chore: EAS build profiles, privacy policy and Play Store listing copy"
```

---

## Self-review

**Spec coverage.** Every spec section maps to a task: local-first architecture and layering (1, 9–10); data model (9); derived values including the corrected 20-minute constant (2, 11); milestone content model with `slipBehavior` and deliberate exclusions (4); anchor resolution (3); slip, relapse and danger-window model (3, 6, 7, 14, 15); five phases with tips (5); all five screens (12, 13, 14, 15, 16); notifications (17); Play compliance including the Data Safety and privacy-policy requirements and the 12-tester gate (18); testing strategy (throughout — every domain module has one happy path and at least two edge cases).

**Two spec items resolved here rather than left implicit.** First, `expo-sqlite` cannot load under Vitest, so the spec's "Vitest for the domain and content" is honoured and extended: SQL lives in constants tested with `better-sqlite3` in Node, and the repository binding is verified by running the app. The spec's mention of React Native Testing Library is deliberately not implemented — the domain-purity rule means screens hold no logic worth unit-testing, and adding a second test runner for assertions about `View` nesting would cost more than it returns. Second, the spec did not say which anchor drives phase resolution; Task 7 uses the cumulative anchor, so one cigarette after six weeks does not dump the user back into "The Crash".

**Type consistency.** `slipBehavior` values, `MilestoneStatus`, `PhaseId`, `Anchors.fast` / `.cumulative`, and every `*Minor` field name are used identically from Task 1 through Task 17. `buildTimeline` takes a single `TimelineInput` object everywhere it appears. `CheckinRow` is defined once in `repositories.ts` and imported by both UI consumers.

**No placeholders.** Every code step contains runnable code; every test step contains real assertions with computed expected values.

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-08-08-smoking-tracker.md`.

