# Nicotine Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user quit cigarettes, roll-your-own, heated tobacco, vapes, snus or nicotine pouches, and show each only the costs, counters, wording and milestones the evidence supports for that product.

**Architecture:** A `ProductId` and a `CostModel` join `Settings`. Pure rules in `src/domain/products.ts` decide which milestones apply (`audience`) and which copy variant to use; `buildTimeline` filters and resolves before anything reaches a screen. Storage gains three additive columns in migration v3; old column names stay and are mapped in a pure, Node-tested `settingsMapping.ts`. Screens render what the domain returns and read wording from `src/content/products.ts`.

**Tech Stack:** Expo SDK 57, expo-router, TypeScript strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), expo-sqlite, Vitest + better-sqlite3.

**Spec:** `docs/superpowers/specs/2026-09-28-nicotine-products-design.md`

## Global Constraints

- `src/domain/` is pure: no React, no `expo-*`, no `src/data/` or `src/content/` imports, `now` always a parameter.
- `strict: true`, no `any`, no `@ts-ignore`, no non-null assertions or `as` casts to paper over `noUncheckedIndexedAccess`.
- Money is integer minor units; field names end in `Minor`.
- Every milestone (and every override) carries a `sourceId` that resolves in `src/content/sources.ts`.
- Never render a fabricated "days of healing lost" figure.
- Tests: Vitest, `function_stateUnderTest_expectedBehavior`, strict AAA comments (`// Arrange & Act` allowed).
- Commit messages: no `Co-Authored-By` trailer (user's global instruction overrides the harness).
- `.npmrc` `legacy-peer-deps=true` stays; no dependency changes in this plan.
- Product ids exactly: `cigarettes`, `roll-your-own`, `heated`, `vape`, `snus`, `pouches`.
- Combustible = `cigarettes`, `roll-your-own`. Only combustible products get `minutesNotLost` and the `smoked` audience.
- Years of history ≤ 80.

## Review Focus

1. **Switcher sees a smoke short-term milestone** (heated + cigarette history → `carbon-monoxide`). Expect: never. Pinned in Task 3 `timeline_heatedWithHistory_showsLongTermButNotCarbonMonoxide`.
2. **Vape weekly-cost with `unitsPerDay` edited to a different value** — money must be recomputed from the new rate, not cached. Pinned in Task 2 `computeSavings_vapeRateChanged_recomputesMoneyFromWeeklySpend`.
3. **Product switched in Settings with slips logged** — slips keep their counts and the timeline still resolves (no crash on a vape reading an old count of 5). Pinned in Task 2 `computeSavings_vapeWithMultiUnitSlip_subtractsTheLoggedUnits`.
4. **Row with `product = 'vape'` but NULL `weekly_spend_minor`** (only reachable by a bug or manual edit) — load must fail loudly, not produce NaN money. Pinned in Task 1 `rowToSettings_vapeWithoutWeeklySpend_throws`.
5. **Settings form: switching product to vape leaves pack fields filled** — the saved row must use the weekly model, and switching back must require pack fields. Pinned in Task 5 `parseSetupForm_vapeWithStalePackFields_ignoresThem`.

---

## File map

| File | Responsibility | Task |
|---|---|---|
| `src/data/schema.ts` | migration v3 | 1 |
| `src/data/queries.ts` | settings SQL gains 3 columns | 1 |
| `src/data/settingsMapping.ts` (new) | pure row ↔ `Settings` mapping | 1 |
| `src/data/settingsMapping.test.ts` (new) | mapping tests | 1 |
| `src/data/sql.test.ts` | v3 tests, updated fixture | 1 |
| `src/data/repositories.ts` | uses mapping; renamed slip/period fields | 1 |
| `src/domain/types.ts` | product types, new `Settings`, `Savings`, `Audience`, `TipContent` | 1 |
| `src/domain/testSettings.ts` (new) | shared test fixture | 1 |
| `src/domain/products.ts` (new) | `isCombustible`, `hasSmokingHistory`, `audienceIncludes`, `applicableMilestones`, `pickVariant` | 2 |
| `src/domain/lifetime.ts`, `savings.ts` | product-aware money/lifetime | 2 |
| `src/content/milestones.ts`, `sources.ts` | audience, overrides, new milestones & sources | 3 |
| `src/domain/timeline.ts`, `phases.ts`, `format.ts` | filter, resolve copy, tokens, tips | 3, 4 |
| `src/content/phases.ts`, `products.ts` (new), `sos.ts` | copy variants, product wording | 4 |
| `src/domain/setupForm.ts` (new) | pure onboarding/settings form parsing | 5 |
| `src/ui/ProductPicker.tsx`, `src/ui/UsageFields.tsx` (new) | shared form UI | 6 |
| `app/onboarding.tsx` | wizard | 6 |
| `src/ui/useSubmitGuard.ts` (new), `app/index.tsx`, `src/ui/Hero.tsx`, `src/ui/MilestoneNode.tsx`, `src/ui/ChapterBlock.tsx`, `app/log.tsx`, `app/sos.tsx` | product-aware home & slips | 7 |
| `app/settings.tsx` | product + usage + history editing | 8 |
| `src/content/sources.ts` | citation verification | 9 |
| `STATE.md`, `README.md` | docs | 10 |

---

### Task 1: Storage v3, settings mapping, and the new domain types

The type change breaks every consumer at once, so this task changes types **and** makes every
existing caller compile with mechanical renames. Behaviour for a cigarettes user is unchanged.

**Files:**
- Modify: `src/domain/types.ts`, `src/data/schema.ts`, `src/data/queries.ts`, `src/data/repositories.ts`, `src/data/sql.test.ts`, `src/domain/lifetime.ts`, `src/domain/savings.ts`, every `src/domain/*.test.ts` fixture, `app/*.tsx`, `src/ui/Hero.tsx`
- Create: `src/data/settingsMapping.ts`, `src/data/settingsMapping.test.ts`, `src/domain/testSettings.ts`

**Interfaces:**
- Produces (types.ts):

```ts
export type ProductId = 'cigarettes' | 'roll-your-own' | 'heated' | 'vape' | 'snus' | 'pouches';
export const PRODUCT_IDS: readonly ProductId[] = ['cigarettes', 'roll-your-own', 'heated', 'vape', 'snus', 'pouches'];

export type CostModel =
  | { kind: 'pack'; unitsPerPack: number; packPriceMinor: number }
  | { kind: 'weekly'; weeklySpendMinor: number };

export interface CigaretteHistory { months: number; cigarettesPerDay: number }

export interface Settings {
  quitDate: string;
  product: ProductId;
  unitsPerDay: number;
  cost: CostModel;
  currency: string;
  timezone: string;
  cigaretteHistory: CigaretteHistory | null;
}
// Slip.cigaretteCount → Slip.unitCount
// SmokingPeriod.averageCigarettesPerDay → SmokingPeriod.averageUnitsPerDay
export interface Savings {
  unitsAvoided: number;
  moneySavedMinor: number;
  minutesNotLost: number | null;
  lifetimeCigarettes: number | null;
}
```

- Produces (settingsMapping.ts):

```ts
export interface SettingsRow {
  quit_date: string; cigarettes_per_day: number; cigarettes_per_pack: number;
  pack_price_minor: number; currency: string; timezone: string; smoked_for_months: number;
  product: ProductId; weekly_spend_minor: number | null; prior_cigarettes_per_day: number | null;
}
export function rowToSettings(row: SettingsRow): Settings;
/** Positional parameters for UPSERT_SETTINGS, minus the two trailing timestamps. */
export function settingsToParams(settings: Settings): [string, number, number, number, string, string, number, ProductId, number | null, number | null];
```

- Produces (testSettings.ts): `cigaretteSettings(overrides?: Partial<Settings>): Settings` — quitDate `'2026-06-26T08:00:00+02:00'`, 15/day, pack 20 @ 1100, EUR, Europe/Amsterdam, history `{ months: 96, cigarettesPerDay: 15 }`.

- [ ] **Step 1: Write failing SQL tests for v3** — append to `src/data/sql.test.ts` and update the fixture:

```ts
const insertSettings = (quitDate = '2026-06-26T08:00:00+02:00') =>
  db.prepare(UPSERT_SETTINGS).run(quitDate, 15, 20, 1100, 'EUR', 'Europe/Amsterdam', 96, 'cigarettes', null, null, NOW, NOW);

describe('migration v3', () => {
  it('UPSERT_SETTINGS_vapeRow_roundTripsProductAndWeeklySpend', () => {
    // Arrange
    db.prepare(UPSERT_SETTINGS).run('2026-06-26T08:00:00Z', 15, 1, 0, 'EUR', 'UTC', 120, 'vape', 1500, 12, NOW, NOW);

    // Act
    const row = db.prepare(SELECT_SETTINGS).get() as { product: string; weekly_spend_minor: number; prior_cigarettes_per_day: number };

    // Assert
    expect(row.product).toBe('vape');
    expect(row.weekly_spend_minor).toBe(1500);
    expect(row.prior_cigarettes_per_day).toBe(12);
  });

  it('settings_unknownProduct_isRejectedByCheckConstraint', () => {
    // Arrange & Act
    const act = () => db.prepare(UPSERT_SETTINGS).run('2026-06-26T08:00:00Z', 15, 20, 1100, 'EUR', 'UTC', 0, 'cigars', null, null, NOW, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('settings_negativeWeeklySpend_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(UPSERT_SETTINGS).run('2026-06-26T08:00:00Z', 15, 1, 0, 'EUR', 'UTC', 0, 'vape', -1, null, NOW, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('migrationsToApply_fromVersionTwo_selectsOnlyVersionThree', () => {
    // Arrange & Act
    const pending = migrationsToApply(2);

    // Assert
    expect(pending.map((m) => m.version)).toEqual([3]);
  });

  it('settings_rowWrittenBeforeV3_defaultsToCigarettes', () => {
    // Arrange — a fresh db at v2, a v2-shaped row, then v3
    const legacy = new Database(':memory:');
    for (const migration of MIGRATIONS.filter((m) => m.version <= 2)) legacy.exec(migration.up);
    legacy.prepare(`INSERT INTO settings (id, quit_date, cigarettes_per_day, cigarettes_per_pack, pack_price_minor,
      currency, timezone, created_at, updated_at) VALUES (1, ?, 15, 20, 1100, 'EUR', 'UTC', ?, ?)`).run(NOW, NOW, NOW);

    // Act
    for (const migration of migrationsToApply(2)) legacy.exec(migration.up);
    const row = legacy.prepare(SELECT_SETTINGS).get() as { product: string; weekly_spend_minor: number | null };

    // Assert
    expect(row.product).toBe('cigarettes');
    expect(row.weekly_spend_minor).toBeNull();
  });
});
```

Also update every other `UPSERT_SETTINGS` call in `sql.test.ts` to the 12-parameter shape
(insert `'cigarettes', null, null` before the two timestamps).

- [ ] **Step 2: Run** `npx vitest run src/data/sql.test.ts` — expect FAIL (v3 absent, column count).

- [ ] **Step 3: Add migration v3** to `MIGRATIONS` in `src/data/schema.ts`:

```ts
  {
    version: 3,
    up: `
      -- What the user is quitting. Existing rows default to cigarettes, which is exactly
      -- what they were before this column existed.
      ALTER TABLE settings ADD COLUMN product TEXT NOT NULL DEFAULT 'cigarettes'
        CHECK (product IN ('cigarettes','roll-your-own','heated','vape','snus','pouches'));
      -- Vape cost model. NULL for every pack-priced product.
      ALTER TABLE settings ADD COLUMN weekly_spend_minor INTEGER NULL CHECK (weekly_spend_minor >= 0);
      -- Cigarette rate before switching, for non-combustible products only. For cigarettes
      -- and roll-your-own the history rate IS cigarettes_per_day, so this stays NULL.
      ALTER TABLE settings ADD COLUMN prior_cigarettes_per_day INTEGER NULL
        CHECK (prior_cigarettes_per_day > 0);
    `,
  },
```

Update `queries.ts`:

```ts
export const UPSERT_SETTINGS = `
  INSERT INTO settings (
    id, quit_date, cigarettes_per_day, cigarettes_per_pack, pack_price_minor,
    currency, timezone, smoked_for_months, product, weekly_spend_minor,
    prior_cigarettes_per_day, created_at, updated_at
  )
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (id) DO UPDATE SET
    quit_date                = excluded.quit_date,
    cigarettes_per_day       = excluded.cigarettes_per_day,
    cigarettes_per_pack      = excluded.cigarettes_per_pack,
    pack_price_minor         = excluded.pack_price_minor,
    currency                 = excluded.currency,
    timezone                 = excluded.timezone,
    smoked_for_months        = excluded.smoked_for_months,
    product                  = excluded.product,
    weekly_spend_minor       = excluded.weekly_spend_minor,
    prior_cigarettes_per_day = excluded.prior_cigarettes_per_day,
    updated_at               = excluded.updated_at
`;

export const SELECT_SETTINGS = `
  SELECT quit_date, cigarettes_per_day, cigarettes_per_pack, pack_price_minor,
         currency, timezone, smoked_for_months, product, weekly_spend_minor,
         prior_cigarettes_per_day
  FROM settings WHERE id = 1
`;
```

- [ ] **Step 4: Run** sql tests — expect PASS.

- [ ] **Step 5: Change `src/domain/types.ts`** to the Interfaces block above. Update `lifetime.ts`:

```ts
import { DAYS_PER_MONTH_AVG, type Settings } from './types';

/**
 * Estimated cigarettes smoked before quitting, or null when no cigarette history was given.
 * ESTIMATE — always present it as one: it applies one daily rate across the whole history.
 * For combustible products the rate is the current `unitsPerDay`, so correcting the daily
 * rate corrects this figure. For other products it is the separately answered prior rate.
 */
export function estimateCigarettesBeforeQuitting(settings: Settings): number | null {
  const history = settings.cigaretteHistory;
  if (history === null || history.months <= 0) return null;
  const perDay = settings.product === 'cigarettes' || settings.product === 'roll-your-own'
    ? settings.unitsPerDay
    : history.cigarettesPerDay;
  return Math.round(history.months * DAYS_PER_MONTH_AVG * perDay);
}
```

(Task 2 replaces the inline combustible check with `isCombustible`.)

In `savings.ts` make the minimal rename so it compiles (Task 2 rewrites it): `cigarettesAvoided` → `unitsAvoided`, `averageCigarettesPerDay` → `averageUnitsPerDay`, `slip.cigaretteCount` → `slip.unitCount`, money via `settings.cost` (pack branch as today; weekly: `Math.round(unitsAvoided * weeklySpendMinor / (7 * unitsPerDay))`), `minutesNotLost` unchanged, `lifetimeCigarettes: before === null ? null : before + Math.round(actuallySmoked)`.

- [ ] **Step 6: Write `src/data/settingsMapping.test.ts`:**

```ts
import { describe, expect, it } from 'vitest';
import { rowToSettings, settingsToParams, type SettingsRow } from './settingsMapping';

const row = (overrides: Partial<SettingsRow> = {}): SettingsRow => ({
  quit_date: '2026-06-26T06:00:00.000Z', cigarettes_per_day: 15, cigarettes_per_pack: 20,
  pack_price_minor: 1100, currency: 'EUR', timezone: 'UTC', smoked_for_months: 96,
  product: 'cigarettes', weekly_spend_minor: null, prior_cigarettes_per_day: null, ...overrides,
});

describe('rowToSettings', () => {
  it('rowToSettings_cigarettes_derivesHistoryRateFromDailyRate', () => {
    // Arrange & Act
    const settings = rowToSettings(row());

    // Assert
    expect(settings.cost).toEqual({ kind: 'pack', unitsPerPack: 20, packPriceMinor: 1100 });
    expect(settings.cigaretteHistory).toEqual({ months: 96, cigarettesPerDay: 15 });
  });

  it('rowToSettings_cigarettesWithZeroMonths_hasNoHistory', () => {
    // Arrange & Act
    const settings = rowToSettings(row({ smoked_for_months: 0 }));

    // Assert
    expect(settings.cigaretteHistory).toBeNull();
  });

  it('rowToSettings_vape_usesWeeklyModelAndPriorRate', () => {
    // Arrange & Act
    const settings = rowToSettings(row({ product: 'vape', cigarettes_per_pack: 1, pack_price_minor: 0, weekly_spend_minor: 1500, prior_cigarettes_per_day: 10, smoked_for_months: 60 }));

    // Assert
    expect(settings.cost).toEqual({ kind: 'weekly', weeklySpendMinor: 1500 });
    expect(settings.cigaretteHistory).toEqual({ months: 60, cigarettesPerDay: 10 });
  });

  it('rowToSettings_heatedWithoutPriorRate_hasNoHistory', () => {
    // Arrange & Act
    const settings = rowToSettings(row({ product: 'heated', smoked_for_months: 60, prior_cigarettes_per_day: null }));

    // Assert
    expect(settings.cigaretteHistory).toBeNull();
  });

  it('rowToSettings_vapeWithoutWeeklySpend_throws', () => {
    // Arrange & Act
    const act = () => rowToSettings(row({ product: 'vape', weekly_spend_minor: null }));

    // Assert
    expect(act).toThrow(/weekly_spend_minor/);
  });
});

describe('settingsToParams', () => {
  it('settingsToParams_vape_writesPlaceholderPackColumnsAndWeeklySpend', () => {
    // Arrange
    const settings = rowToSettings(row({ product: 'vape', weekly_spend_minor: 1500, prior_cigarettes_per_day: 10, smoked_for_months: 60 }));

    // Act
    const params = settingsToParams(settings);

    // Assert — quit, perDay, perPack, price, currency, tz, months, product, weekly, prior
    expect(params).toEqual(['2026-06-26T06:00:00.000Z', 15, 1, 0, 'EUR', 'UTC', 60, 'vape', 1500, 10]);
  });

  it('settingsToParams_cigarettes_leavesPriorRateNull', () => {
    // Arrange
    const settings = rowToSettings(row());

    // Act
    const params = settingsToParams(settings);

    // Assert
    expect(params[9]).toBeNull();
    expect(params[6]).toBe(96);
  });
});
```

- [ ] **Step 7: Run** `npx vitest run src/data/settingsMapping.test.ts` — FAIL (module missing).

- [ ] **Step 8: Write `src/data/settingsMapping.ts`:**

```ts
import type { CostModel, ProductId, Settings } from '@/domain/types';

/**
 * Column names predate multi-product support and are deliberately NOT renamed (a SQLite
 * column rename rebuilds the table and buys only tidiness). Read them as:
 *   cigarettes_per_day   → units per day, in the product's unit
 *   cigarettes_per_pack  → units per pack/pouch/can; placeholder 1 for vape
 *   pack_price_minor     → pack price; placeholder 0 for vape
 *   smoked_for_months    → months of CIGARETTE smoking, for every product
 * This file is the only place that knows the mapping. Pure, so it is tested in Node.
 */
export interface SettingsRow {
  quit_date: string;
  cigarettes_per_day: number;
  cigarettes_per_pack: number;
  pack_price_minor: number;
  currency: string;
  timezone: string;
  smoked_for_months: number;
  product: ProductId;
  weekly_spend_minor: number | null;
  prior_cigarettes_per_day: number | null;
}

const VAPE_PLACEHOLDER_PER_PACK = 1;
const VAPE_PLACEHOLDER_PRICE = 0;

function isCombustibleId(product: ProductId): boolean {
  return product === 'cigarettes' || product === 'roll-your-own';
}

export function rowToSettings(row: SettingsRow): Settings {
  let cost: CostModel;
  if (row.product === 'vape') {
    // A vape row without a weekly spend can only come from a bug; NaN money is worse than a
    // loud failure, and useQuitState surfaces the error instead of redirecting to onboarding.
    if (row.weekly_spend_minor === null) throw new Error('vape settings row has no weekly_spend_minor');
    cost = { kind: 'weekly', weeklySpendMinor: row.weekly_spend_minor };
  } else {
    cost = { kind: 'pack', unitsPerPack: row.cigarettes_per_pack, packPriceMinor: row.pack_price_minor };
  }

  let cigaretteHistory: Settings['cigaretteHistory'] = null;
  if (row.smoked_for_months > 0) {
    if (isCombustibleId(row.product)) {
      cigaretteHistory = { months: row.smoked_for_months, cigarettesPerDay: row.cigarettes_per_day };
    } else if (row.prior_cigarettes_per_day !== null) {
      cigaretteHistory = { months: row.smoked_for_months, cigarettesPerDay: row.prior_cigarettes_per_day };
    }
  }

  return {
    quitDate: row.quit_date,
    product: row.product,
    unitsPerDay: row.cigarettes_per_day,
    cost,
    currency: row.currency,
    timezone: row.timezone,
    cigaretteHistory,
  };
}

export function settingsToParams(
  settings: Settings,
): [string, number, number, number, string, string, number, ProductId, number | null, number | null] {
  const perPack = settings.cost.kind === 'pack' ? settings.cost.unitsPerPack : VAPE_PLACEHOLDER_PER_PACK;
  const price = settings.cost.kind === 'pack' ? settings.cost.packPriceMinor : VAPE_PLACEHOLDER_PRICE;
  const weekly = settings.cost.kind === 'weekly' ? settings.cost.weeklySpendMinor : null;
  const history = settings.cigaretteHistory;
  const prior = history !== null && !isCombustibleId(settings.product) ? history.cigarettesPerDay : null;

  return [
    settings.quitDate,
    settings.unitsPerDay,
    perPack,
    price,
    settings.currency,
    settings.timezone,
    history?.months ?? 0,
    settings.product,
    weekly,
    prior,
  ];
}
```

- [ ] **Step 9: Update `repositories.ts`** — delete the local `SettingsRow`, import `rowToSettings`, `settingsToParams`, `SettingsRow` from `./settingsMapping`; `loadQuitState` uses `rowToSettings(settingsRow)`; `saveSettings` runs `db.runAsync(UPSERT_SETTINGS, ...settingsToParams(settings), stamp, stamp)`; rename `cigaretteCount` → `unitCount` and `averageCigarettesPerDay` → `averageUnitsPerDay` in row mapping and in `addSlip` / `startSmokingPeriod` input types. Keep the column comments: add `// cigarette_count stores units of the current product` above `SlipRow`.

- [ ] **Step 10: Create `src/domain/testSettings.ts`:**

```ts
import type { Settings } from './types';

/** Test fixture: a cigarettes quitter matching the numbers the original tests were written against. */
export function cigaretteSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    quitDate: '2026-06-26T08:00:00+02:00',
    product: 'cigarettes',
    unitsPerDay: 15,
    cost: { kind: 'pack', unitsPerPack: 20, packPriceMinor: 1100 },
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    cigaretteHistory: { months: 96, cigarettesPerDay: 15 },
    ...overrides,
  };
}
```

Replace the inline `settings: {...}` literal in `anchors.test.ts`, `streaks.test.ts`, `savings.test.ts`, `timeline.test.ts`, `lifetime.test.ts` with `cigaretteSettings(...)`, translating overrides (`smokedForMonths: X` → `cigaretteHistory: { months: X, cigarettesPerDay: <rate> }`, `cigarettesPerDay: X` → `unitsPerDay: X`). Rename `cigaretteCount` → `unitCount`, `averageCigarettesPerDay` → `averageUnitsPerDay`, `cigarettesAvoided` → `unitsAvoided`, `lifetimeTotal` → `lifetimeCigarettes` across tests. In `lifetime.test.ts` the "0 months returns 0" test becomes "returns null".

- [ ] **Step 11: Mechanical app renames so `npm run typecheck` passes:** `app/onboarding.tsx` builds `{ quitDate, product: 'cigarettes', unitsPerDay, cost: { kind: 'pack', unitsPerPack, packPriceMinor }, currency, timezone, cigaretteHistory: months > 0 ? { months, cigarettesPerDay: unitsPerDay } : null }`; `app/settings.tsx` reads `state.settings.unitsPerDay` and the pack price from `cost` (guard `cost.kind === 'pack'`) and writes the same shape; its lifetime hint renders only when the estimate is non-null. `app/log.tsx`/`app/sos.tsx`: `unitCount`, `averageUnitsPerDay`, `lifetimeCigarettes` (render sentence only when non-null). `src/ui/Hero.tsx`: `unitsAvoided`; render the time tile only when `minutesNotLost !== null`. (Tasks 6–8 replace these screens properly.)

- [ ] **Step 12: Run** `npm test && npm run typecheck` — all PASS.

- [ ] **Step 13: Commit** `git commit -am "feat(data): store the product and its cost model (migration v3)"` (add new files first).

---

### Task 2: Product rules and product-aware savings

**Files:**
- Create: `src/domain/products.ts`, `src/domain/products.test.ts`
- Modify: `src/domain/savings.ts`, `src/domain/savings.test.ts`, `src/domain/lifetime.ts`, `src/domain/types.ts`

**Interfaces:**
- Consumes: Task 1 types.
- Produces:

```ts
// types.ts
export type Audience = 'all' | 'inhaled' | 'smoked' | 'smoking-history' | 'snus' | 'oral' | 'unknown-long-term';
export interface MilestoneOverride { offsetMs: number | null; offsetEndMs: number | null; sourceId: string }
// Milestone gains: audience: Audience; overrides?: Partial<Record<ProductId, MilestoneOverride>>;
export interface CopyVariants<T> { smoke: T; nicotine: T }

// products.ts
export function isCombustible(product: ProductId): boolean;
export function isOral(product: ProductId): boolean;
export function hasSmokingHistory(settings: Settings): boolean;
export function audienceIncludes(audience: Audience, settings: Settings): boolean;
export function applicableMilestones(milestones: Milestone[], settings: Settings): Milestone[];
export function isConservativelyAnchored(milestone: Milestone, settings: Settings): boolean;
export function pickVariant<T>(variants: CopyVariants<T>, settings: Settings): T;

// savings.ts
export function moneyForUnits(units: number, settings: Settings): number;
export function lifetimeAfterSlip(state: QuitState, extraUnits: number, now: Date): number | null;
```

- [ ] **Step 1: Add `Audience`, `MilestoneOverride`, `CopyVariants` to `types.ts`**, and `audience: Audience` + `overrides?: ...` to `Milestone`. Give every existing entry in `src/content/milestones.ts` `audience: 'all'` for now so it compiles (Task 3 sets real values).

- [ ] **Step 2: Write `src/domain/products.test.ts`:**

```ts
import { describe, expect, it } from 'vitest';
import { applicableMilestones, audienceIncludes, hasSmokingHistory, isCombustible, isConservativelyAnchored, pickVariant } from './products';
import { cigaretteSettings } from './testSettings';
import { MS_PER_HOUR, MS_PER_MINUTE, type Audience, type Milestone, type ProductId, type Settings } from './types';

const as = (product: ProductId, withHistory: boolean): Settings =>
  cigaretteSettings({
    product,
    cost: product === 'vape' ? { kind: 'weekly', weeklySpendMinor: 1500 } : { kind: 'pack', unitsPerPack: 20, packPriceMinor: 1000 },
    cigaretteHistory: withHistory ? { months: 60, cigarettesPerDay: 10 } : null,
  });

const milestone = (audience: Audience, extra: Partial<Milestone> = {}): Milestone => ({
  id: `m-${audience}`, title: 't', body: 'b', offsetMs: 20 * MS_PER_MINUTE, offsetEndMs: null,
  slipBehavior: 'restarts', sourceId: 'acs', phaseId: 'crash', audience, ...extra,
});

describe('isCombustible', () => {
  it('isCombustible_eachProduct_trueOnlyForCigarettesAndRollYourOwn', () => {
    // Arrange
    const ids: ProductId[] = ['cigarettes', 'roll-your-own', 'heated', 'vape', 'snus', 'pouches'];

    // Act
    const combustible = ids.filter(isCombustible);

    // Assert
    expect(combustible).toEqual(['cigarettes', 'roll-your-own']);
  });
});

describe('hasSmokingHistory', () => {
  it('hasSmokingHistory_cigarettesWithoutHistory_isTrue', () => {
    // Arrange & Act & Assert
    expect(hasSmokingHistory(as('cigarettes', false))).toBe(true);
  });

  it('hasSmokingHistory_vapeWithoutHistory_isFalse', () => {
    // Arrange & Act & Assert
    expect(hasSmokingHistory(as('vape', false))).toBe(false);
  });

  it('hasSmokingHistory_heatedWithHistory_isTrue', () => {
    // Arrange & Act & Assert
    expect(hasSmokingHistory(as('heated', true))).toBe(true);
  });
});

describe('audienceIncludes', () => {
  // [audience, product, withHistory, expected]
  const table: [Audience, ProductId, boolean, boolean][] = [
    ['all', 'pouches', false, true],
    ['inhaled', 'vape', false, true],
    ['inhaled', 'snus', false, false],
    ['smoked', 'roll-your-own', false, true],
    ['smoked', 'heated', true, false],
    ['smoking-history', 'heated', true, true],
    ['smoking-history', 'vape', false, false],
    ['snus', 'snus', false, true],
    ['snus', 'pouches', false, false],
    ['oral', 'pouches', false, true],
    ['oral', 'heated', false, false],
    ['unknown-long-term', 'vape', false, true],
    ['unknown-long-term', 'vape', true, false],
    ['unknown-long-term', 'cigarettes', false, false],
  ];

  it.each(table)('audienceIncludes_%s_%s_history%s_is%s', (audience, product, withHistory, expected) => {
    // Arrange
    const settings = as(product, withHistory);

    // Act
    const result = audienceIncludes(audience, settings);

    // Assert
    expect(result).toBe(expected);
  });
});

describe('applicableMilestones', () => {
  it('applicableMilestones_overrideForProduct_replacesOffsetAndSource', () => {
    // Arrange
    const m = milestone('inhaled', { overrides: { vape: { offsetMs: MS_PER_HOUR, offsetEndMs: null, sourceId: 'nicotine-hr-acute' } } });

    // Act
    const [result] = applicableMilestones([m], as('vape', false));

    // Assert
    expect(result?.offsetMs).toBe(MS_PER_HOUR);
    expect(result?.sourceId).toBe('nicotine-hr-acute');
  });

  it('applicableMilestones_noOverrideForProduct_keepsDefaults', () => {
    // Arrange
    const m = milestone('inhaled', { overrides: { vape: { offsetMs: MS_PER_HOUR, offsetEndMs: null, sourceId: 'x' } } });

    // Act
    const [result] = applicableMilestones([m], as('cigarettes', false));

    // Assert
    expect(result?.offsetMs).toBe(20 * MS_PER_MINUTE);
  });

  it('applicableMilestones_audienceExcludesProduct_dropsMilestone', () => {
    // Arrange & Act
    const result = applicableMilestones([milestone('smoked')], as('pouches', true));

    // Assert
    expect(result).toEqual([]);
  });
});

describe('isConservativelyAnchored', () => {
  it('isConservativelyAnchored_smokingHistoryForSwitcher_isTrue', () => {
    // Arrange & Act & Assert
    expect(isConservativelyAnchored(milestone('smoking-history'), as('heated', true))).toBe(true);
  });

  it('isConservativelyAnchored_smokingHistoryForSmoker_isFalse', () => {
    // Arrange & Act & Assert
    expect(isConservativelyAnchored(milestone('smoking-history'), as('cigarettes', true))).toBe(false);
  });
});

describe('pickVariant', () => {
  it('pickVariant_combustibleAndNot_picksMatchingVariant', () => {
    // Arrange
    const variants = { smoke: 'CO', nicotine: 'nicotine' };

    // Act & Assert
    expect(pickVariant(variants, as('roll-your-own', false))).toBe('CO');
    expect(pickVariant(variants, as('heated', true))).toBe('nicotine');
  });
});
```

- [ ] **Step 3: Run** `npx vitest run src/domain/products.test.ts` — FAIL.

- [ ] **Step 4: Write `src/domain/products.ts`:**

```ts
import type { Audience, CopyVariants, Milestone, ProductId, Settings } from './types';

/** Burned tobacco. Roll-your-own shares every cigarette claim (FDA, ACS, Laugesen 2009). */
export function isCombustible(product: ProductId): boolean {
  return product === 'cigarettes' || product === 'roll-your-own';
}

export function isOral(product: ProductId): boolean {
  return product === 'snus' || product === 'pouches';
}

/**
 * Whether the long-term smoking-recovery milestones apply: the person either smokes the
 * product being quit, or smoked cigarettes before switching to it.
 */
export function hasSmokingHistory(settings: Settings): boolean {
  return isCombustible(settings.product) || settings.cigaretteHistory !== null;
}

export function audienceIncludes(audience: Audience, settings: Settings): boolean {
  const { product } = settings;
  switch (audience) {
    case 'all':
      return true;
    case 'inhaled':
      return !isOral(product);
    case 'smoked':
      return isCombustible(product);
    case 'smoking-history':
      return hasSmokingHistory(settings);
    case 'snus':
      return product === 'snus';
    case 'oral':
      return isOral(product);
    case 'unknown-long-term':
      return !hasSmokingHistory(settings);
  }
}

/** The milestones this person should see, with any per-product offset and source applied. */
export function applicableMilestones(milestones: Milestone[], settings: Settings): Milestone[] {
  return milestones
    .filter((milestone) => audienceIncludes(milestone.audience, settings))
    .map((milestone) => {
      const override = milestone.overrides?.[settings.product];
      if (!override) return milestone;
      return { ...milestone, offsetMs: override.offsetMs, offsetEndMs: override.offsetEndMs, sourceId: override.sourceId };
    });
}

/**
 * A switcher's smoking-recovery milestones are counted from the final quit date, not from
 * when cigarettes stopped — conservative, and the UI says so.
 */
export function isConservativelyAnchored(milestone: Milestone, settings: Settings): boolean {
  return milestone.audience === 'smoking-history' && !isCombustible(settings.product);
}

/** Copy that names smoke (carbon monoxide, tar) has a nicotine-only twin for other products. */
export function pickVariant<T>(variants: CopyVariants<T>, settings: Settings): T {
  return isCombustible(settings.product) ? variants.smoke : variants.nicotine;
}
```

- [ ] **Step 5: Run** products tests — PASS. Replace the inline combustible check in `lifetime.ts` with `isCombustible(settings.product)`.

- [ ] **Step 6: Add failing savings tests** to `src/domain/savings.test.ts`:

```ts
const vape = (overrides: Partial<Settings> = {}) =>
  cigaretteSettings({ product: 'vape', unitsPerDay: 15, cost: { kind: 'weekly', weeklySpendMinor: 2100 }, cigaretteHistory: null, ...overrides });

it('computeSavings_vapeFortyThreeDays_moneyFromWeeklySpend', () => {
  // Arrange — 43 days × 15 = 645 uses; 645 × 2100 / (7 × 15) = 12_900
  const state: QuitState = { settings: vape(), slips: [], periods: [] };

  // Act
  const result = computeSavings(state, new Date('2026-08-08T08:00:00+02:00'));

  // Assert
  expect(result.unitsAvoided).toBe(645);
  expect(result.moneySavedMinor).toBe(12_900);
  expect(result.minutesNotLost).toBeNull();
  expect(result.lifetimeCigarettes).toBeNull();
});

it('computeSavings_vapeRateChanged_recomputesMoneyFromWeeklySpend', () => {
  // Arrange — same weekly spend, half the rate: money over 43 days is unchanged (it is 43/7 weeks of spend)
  const state: QuitState = { settings: vape({ unitsPerDay: 30 }), slips: [], periods: [] };

  // Act
  const result = computeSavings(state, new Date('2026-08-08T08:00:00+02:00'));

  // Assert
  expect(result.unitsAvoided).toBe(1290);
  expect(result.moneySavedMinor).toBe(12_900);
});

it('computeSavings_vapeWithMultiUnitSlip_subtractsTheLoggedUnits', () => {
  // Arrange — a slip logged as 5 cigarettes before the user switched product to vape
  const state: QuitState = {
    settings: vape(),
    slips: [{ id: 1, occurredAt: '2026-08-01T00:00:00+02:00', unitCount: 5, trigger: null, note: null }],
    periods: [],
  };

  // Act
  const result = computeSavings(state, new Date('2026-08-08T08:00:00+02:00'));

  // Assert
  expect(result.unitsAvoided).toBe(640);
});

it('computeSavings_heatedSwitcherWithSlip_lifetimeIsHistoryOnly', () => {
  // Arrange — 60 months × 30.44 × 10 = 18_264 cigarettes; the stick slip is not a cigarette
  const state: QuitState = {
    settings: cigaretteSettings({ product: 'heated', cigaretteHistory: { months: 60, cigarettesPerDay: 10 } }),
    slips: [{ id: 1, occurredAt: '2026-08-01T00:00:00+02:00', unitCount: 3, trigger: null, note: null }],
    periods: [],
  };

  // Act
  const result = computeSavings(state, new Date('2026-08-08T08:00:00+02:00'));

  // Assert
  expect(result.lifetimeCigarettes).toBe(18_264);
  expect(result.minutesNotLost).toBeNull();
});

it('lifetimeAfterSlip_cigarettes_addsTheNewSlip', () => {
  // Arrange
  const state: QuitState = { settings: cigaretteSettings(), slips: [], periods: [] };

  // Act
  const result = lifetimeAfterSlip(state, 2, new Date('2026-08-08T08:00:00+02:00'));

  // Assert — 96 × 30.44 × 15 = 43_834, + 2
  expect(result).toBe(43_836);
});

it('lifetimeAfterSlip_heatedSwitcher_isNull', () => {
  // Arrange
  const state: QuitState = {
    settings: cigaretteSettings({ product: 'heated', cigaretteHistory: { months: 60, cigarettesPerDay: 10 } }),
    slips: [], periods: [],
  };

  // Act & Assert
  expect(lifetimeAfterSlip(state, 1, new Date('2026-08-08T08:00:00+02:00'))).toBeNull();
});
```

- [ ] **Step 7: Run** — FAIL (`lifetimeAfterSlip` missing; switcher lifetime adds slips).

- [ ] **Step 8: Rewrite `savings.ts`:**

```ts
import { estimateCigarettesBeforeQuitting } from './lifetime';
import { isCombustible } from './products';
import { MINUTES_LOST_PER_CIGARETTE, MS_PER_DAY, type QuitState, type Savings, type Settings, type SmokingPeriod } from './types';

/** Estimated units consumed during logged smoking periods, open periods counted to `now`. */
export function smokedDuringPeriods(periods: SmokingPeriod[], now: Date): number {
  return periods.reduce((total, period) => {
    const start = new Date(period.startedAt).getTime();
    const end = period.endedAt ? new Date(period.endedAt).getTime() : now.getTime();
    const days = Math.max(0, end - start) / MS_PER_DAY;
    return total + days * period.averageUnitsPerDay;
  }, 0);
}

/** Money for `units`, integer arithmetic first and one division last, so nothing drifts. */
export function moneyForUnits(units: number, settings: Settings): number {
  const { cost } = settings;
  return cost.kind === 'pack'
    ? Math.round((units * cost.packPriceMinor) / cost.unitsPerPack)
    : Math.round((units * cost.weeklySpendMinor) / (7 * settings.unitsPerDay));
}

export function computeSavings(state: QuitState, now: Date): Savings {
  const { settings, slips, periods } = state;

  const elapsedDays = Math.max(0, now.getTime() - new Date(settings.quitDate).getTime()) / MS_PER_DAY;
  const wouldHaveUsed = elapsedDays * settings.unitsPerDay;
  const actuallyUsed = slips.reduce((total, slip) => total + slip.unitCount, 0) + smokedDuringPeriods(periods, now);
  const unitsAvoided = Math.max(0, Math.round(wouldHaveUsed - actuallyUsed));

  const combustible = isCombustible(settings.product);
  const before = estimateCigarettesBeforeQuitting(settings);

  return {
    unitsAvoided,
    moneySavedMinor: moneyForUnits(unitsAvoided, settings),
    // The 20-minute figure is measured in cigarettes (Jackson 2025); no equivalent exists for other products.
    minutesNotLost: combustible ? unitsAvoided * MINUTES_LOST_PER_CIGARETTE : null,
    // For a switcher, slips are sticks, pouches or vape sessions — adding them to a cigarette total would mix units.
    lifetimeCigarettes: before === null ? null : combustible ? before + Math.round(actuallyUsed) : before,
  };
}

/**
 * The running lifetime total to quote after logging `extraUnits` more, or null when that
 * sentence would be misleading: no history, or a product whose slips are not cigarettes.
 */
export function lifetimeAfterSlip(state: QuitState, extraUnits: number, now: Date): number | null {
  if (!isCombustible(state.settings.product)) return null;
  const lifetime = computeSavings(state, now).lifetimeCigarettes;
  return lifetime === null ? null : lifetime + extraUnits;
}
```

- [ ] **Step 9: Run** `npm test && npm run typecheck` — PASS.

- [ ] **Step 10: Commit** `feat(domain): product rules and per-product savings`.

---

### Task 3: Milestone audiences, new milestones and sources, timeline filtering

**Files:**
- Modify: `src/content/milestones.ts`, `src/content/sources.ts`, `src/content/content.test.ts`, `src/domain/timeline.ts`, `src/domain/timeline.test.ts`, `src/domain/types.ts`

**Interfaces:**
- Consumes: `applicableMilestones`, `isConservativelyAnchored` (Task 2).
- Produces: `MilestoneState.conservativelyAnchored: boolean`. `buildTimeline` output milestones are already filtered.

- [ ] **Step 1: Add content tests** to `src/content/content.test.ts`:

```ts
import { applicableMilestones, audienceIncludes } from '@/domain/products';
import { cigaretteSettings } from '@/domain/testSettings';
import type { ProductId, Settings } from '@/domain/types';

const PRODUCTS: ProductId[] = ['cigarettes', 'roll-your-own', 'heated', 'vape', 'snus', 'pouches'];
const settingsFor = (product: ProductId, withHistory: boolean): Settings =>
  cigaretteSettings({
    product,
    cost: product === 'vape' ? { kind: 'weekly', weeklySpendMinor: 1500 } : { kind: 'pack', unitsPerPack: 20, packPriceMinor: 1000 },
    cigaretteHistory: withHistory ? { months: 60, cigarettesPerDay: 10 } : null,
  });
const everyProfile = PRODUCTS.flatMap((p) => [settingsFor(p, false), settingsFor(p, true)]);

it('MILESTONES_everyOverride_hasResolvableSourceId', () => {
  // Arrange
  const known = new Set(Object.keys(SOURCES));

  // Act
  const unresolved = MILESTONES.flatMap((m) =>
    Object.values(m.overrides ?? {}).filter((o) => !known.has(o.sourceId)).map(() => m.id));

  // Assert
  expect(unresolved).toEqual([]);
});

it('MILESTONES_everyProfile_hasADatedMilestoneInEachEarlyPhase', () => {
  // Arrange
  const earlyPhases = ['crash', 'fog', 'consolidation'] as const;

  // Act
  const gaps = everyProfile.flatMap((settings) => {
    const visible = applicableMilestones(MILESTONES, settings);
    return earlyPhases
      .filter((phaseId) => !visible.some((m) => m.phaseId === phaseId && m.offsetMs !== null))
      .map((phaseId) => `${settings.product}/${settings.cigaretteHistory ? 'history' : 'none'}/${phaseId}`);
  });

  // Assert
  expect(gaps).toEqual([]);
});

it('MILESTONES_smokedAudience_neverReachesANonCombustibleProduct', () => {
  // Arrange
  const nonCombustible = everyProfile.filter((s) => s.product !== 'cigarettes' && s.product !== 'roll-your-own');

  // Act
  const leaks = nonCombustible.filter((s) => audienceIncludes('smoked', s));

  // Assert
  expect(leaks).toEqual([]);
});

it('MILESTONES_carbonMonoxide_isVisibleOnlyToCombustibleProducts', () => {
  // Arrange & Act
  const seeing = everyProfile
    .filter((s) => applicableMilestones(MILESTONES, s).some((m) => m.id === 'carbon-monoxide'))
    .map((s) => s.product);

  // Assert
  expect([...new Set(seeing)]).toEqual(['cigarettes', 'roll-your-own']);
});

it('MILESTONES_longTermUnknown_appearsExactlyWhenNoSmokingHistory', () => {
  // Arrange & Act
  const seeing = everyProfile
    .filter((s) => applicableMilestones(MILESTONES, s).some((m) => m.id === 'long-term-unknown'))
    .map((s) => `${s.product}/${s.cigaretteHistory ? 'history' : 'none'}`);

  // Assert
  expect(seeing).toEqual(['heated/none', 'vape/none', 'snus/none', 'pouches/none']);
});

it('MILESTONES_bannedOverclaims_areAbsentFromEveryTitleAndBody', () => {
  // Arrange — excluded by the research for this release, see the spec
  const banned = ['95%', 'safer', 'gums grow', 'recession reverses', 'blood pressure normal', 'healing lost'];

  // Act
  const offending = MILESTONES.filter((m) => banned.some((b) => `${m.title} ${m.body}`.toLowerCase().includes(b)));

  // Assert
  expect(offending.map((m) => m.id)).toEqual([]);
});
```

- [ ] **Step 2: Run** `npx vitest run src/content` — FAIL.

- [ ] **Step 3: Add sources** to `src/content/sources.ts` (tier and URL exactly):

```ts
  'benowitz-2009': { id: 'benowitz-2009', label: 'Benowitz et al. — Nicotine chemistry, metabolism, kinetics and biomarkers (Handb Exp Pharmacol, 2009)', url: 'https://pubmed.ncbi.nlm.nih.gov/19184645/', tier: 'a' },
  'hughes-2007': { id: 'hughes-2007', label: 'Hughes — Effects of abstinence from tobacco: valid symptoms and time course (Nicotine Tob Res, 2007)', url: 'https://academic.oup.com/ntr/article-pdf/9/3/315/3842403/9-3-315.pdf', tier: 'a' },
  'hughes-2020': { id: 'hughes-2020', label: 'Hughes et al. — Withdrawal symptoms from e-cigarette abstinence among adult never-smokers and ex-smokers (Nicotine Tob Res, 2020)', url: 'https://pubmed.ncbi.nlm.nih.gov/31352486/', tier: 'a' },
  'nhs-withdrawal': { id: 'nhs-withdrawal', label: 'NHS — Managing nicotine withdrawal symptoms', url: 'https://www.nhs.uk/better-health/quit-smoking/staying-smoke-free/managing-nicotine-withdrawal-symptoms/', tier: 'a' },
  'jaehne-2015': { id: 'jaehne-2015', label: 'Jaehne et al. — How smoking affects sleep: a polysomnographical analysis during smoking and abstinence (Addict Biol, 2015)', url: 'https://pubmed.ncbi.nlm.nih.gov/24797355/', tier: 'a' },
  'kenford-1994': { id: 'kenford-1994', label: 'Kenford et al. — Predicting smoking cessation: who will quit with and without the nicotine patch (JAMA, 1994)', url: 'https://pubmed.ncbi.nlm.nih.gov/8301790/', tier: 'a' },
  'hse-cravings': { id: 'hse-cravings', label: 'HSE Ireland — Cravings and withdrawal symptoms', url: 'https://www2.hse.ie/living-well/quit-smoking/get-help-to-quit/cravings-withdrawal/', tier: 'a' },
  'taylor-2021': { id: 'taylor-2021', label: 'Taylor et al. — Smoking cessation for improving mental health (Cochrane, 2021)', url: 'https://pubmed.ncbi.nlm.nih.gov/33687070/', tier: 'a' },
  'aubin-2012': { id: 'aubin-2012', label: 'Aubin et al. — Weight gain in smokers after quitting cigarettes: meta-analysis (BMJ, 2012)', url: 'https://pubmed.ncbi.nlm.nih.gov/22782848/', tier: 'a' },
  'nicotine-hr-acute': { id: 'nicotine-hr-acute', label: 'Acute heart-rate and blood-pressure effects of nicotine e-cigarettes (J Am Heart Assoc, 2017)', url: 'https://www.ahajournals.org/doi/10.1161/jaha.117.006579', tier: 'a' },
  'af-geijerstam-2025': { id: 'af-geijerstam-2025', label: 'af Geijerstam et al. — Health effects of stopping snus and nicotine pouches (Harm Reduct J, 2025)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12001473/', tier: 'a' },
  'snus-lesions-2026': { id: 'snus-lesions-2026', label: 'Snus-induced oral mucosal lesions and their reversibility after cessation (Clin Oral Investig, 2026)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13499737/', tier: 'a' },
  'larsson-1991': { id: 'larsson-1991', label: 'Larsson, Axéll & Andersson — Reversibility of snuff dippers’ lesions (J Oral Pathol Med, 1991)', url: 'https://pubmed.ncbi.nlm.nih.gov/1890661/', tier: 'a' },
  'heshmati-2025': { id: 'heshmati-2025', label: 'Nicotine pouch pharmacokinetics compared with cigarettes: meta-analysis (Drug Alcohol Depend Rep, 2025)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12617622/', tier: 'a' },
  'ryo-harm': { id: 'ryo-harm', label: 'FDA — Roll-your-own tobacco is not safer than other cigarettes', url: 'https://www.fda.gov/tobacco-products/products-ingredients-components/roll-your-own-tobacco', tier: 'a' },
  'who-htp-2020': { id: 'who-htp-2020', label: 'WHO — Heated tobacco products: information sheet (2020)', url: 'https://www.who.int/publications/i/item/WHO-HEP-HPR-2020.2', tier: 'a' },
  'cochrane-ecig-2025': { id: 'cochrane-ecig-2025', label: 'Lindson et al. — Electronic cigarettes for smoking cessation (Cochrane, 2025)', url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD010216.pub10/full', tier: 'a' },
  'fda-snus-mrtp': { id: 'fda-snus-mrtp', label: 'FDA — General Snus modified-risk tobacco product orders', url: 'https://www.fda.gov/tobacco-products/advertising-and-promotion/swedish-match-usa-inc-modified-risk-tobacco-product-mrtp-applications-general-snus-products', tier: 'a' },
  'fda-zyn-mrtp': { id: 'fda-zyn-mrtp', label: 'FDA — Zyn nicotine pouches modified-risk authorisation', url: 'https://www.fda.gov/tobacco-products/ctp-newsroom/fda-authorizes-20-zyn-nicotine-pouches-be-marketed-specific-modified-risk-claim', tier: 'a' },
```

Change `nicotine-cleared`'s `sourceId` to `'benowitz-2009'`. Keep `co-halflife` (still cited by `carbon-monoxide` copy reference in Settings list).

- [ ] **Step 4: Update `src/content/milestones.ts`.** Add a header comment listing the EXCLUDE list from the spec. Set audiences on existing entries: `heart-rate` → `'inhaled'` with `overrides: { heated: { offsetMs: MS_PER_HOUR, offsetEndMs: null, sourceId: 'nicotine-hr-acute' }, vape: { offsetMs: MS_PER_HOUR, offsetEndMs: null, sourceId: 'nicotine-hr-acute' } }`; `carbon-monoxide`, `taste-smell`, `cough-breathlessness` → `'smoked'`; `nicotine-cleared`, `withdrawal-peak`, `craving-adaptation` → `'all'` (`withdrawal-peak` gets `overrides: { vape: { offsetMs: DAYS(3), offsetEndMs: null, sourceId: 'hughes-2020' } }` and its body appends " Measured in smokers and vapers; for heated tobacco and pouches it is inferred from how nicotine works."); `heart-attack-risk`, `oral-cancer-stroke`, `lung-cancer-halved`, `chd-nonsmoker`, `multi-cancer-nonsmoker` → `'smoking-history'`. Insert new entries in offset order:

```ts
  {
    id: 'first-week',
    title: 'The first week is usually the roughest for sleep',
    body: 'More night waking is a normal part of early withdrawal. It is temporary: sleep is typically settling by the end of the first month.',
    offsetMs: DAYS(7), offsetEndMs: null, slipBehavior: 'restarts', sourceId: 'jaehne-2015', phaseId: 'fog', audience: 'all',
  },
  {
    id: 'oral-heart-rate',
    title: 'Your resting heart rate typically dips this week',
    body: 'People who stopped snus or nicotine pouches had a lower resting pulse after one week. In the same study it drifted back toward its earlier level by week eight, so treat this as a short-term change.',
    offsetMs: DAYS(7), offsetEndMs: null, slipBehavior: 'restarts', sourceId: 'af-geijerstam-2025', phaseId: 'fog', audience: 'oral',
  },
  {
    id: 'two-week-window',
    title: 'Past the highest-risk window',
    body: 'Any use in the first two weeks is the strongest early predictor of going back. Two clean weeks puts that behind you. Measured in smokers; for other products it is inferred.',
    offsetMs: DAYS(14), offsetEndMs: null, slipBehavior: 'restarts', sourceId: 'kenford-1994', phaseId: 'fog', audience: 'all',
  },
  {
    id: 'withdrawal-fades',
    title: 'Most withdrawal symptoms have faded',
    body: 'Irritability, restlessness, poor concentration and low mood peak in week one and usually fade over two to four weeks. For some people a few linger longer, and that is still normal.',
    offsetMs: DAYS(14), offsetEndMs: DAYS(28), slipBehavior: 'restarts', sourceId: 'hughes-2007', phaseId: 'fog', audience: 'all',
  },
  {
    id: 'cravings-rarer',
    title: 'Cravings usually come far less often',
    body: 'Somewhere between week four and week six most people notice cravings have become occasional rather than constant. Each one still lasts only a few minutes.',
    offsetMs: DAYS(28), offsetEndMs: DAYS(42), slipBehavior: 'restarts', sourceId: 'hse-cravings', phaseId: 'consolidation', audience: 'all',
  },
  {
    id: 'snus-mucosa',
    title: 'The lining where you held snus is healing',
    body: 'The white, wrinkled patch where snus sat often heals within weeks of stopping; studies found normal tissue by three to six months. Gum recession is different — it does not grow back — so mention it to your dentist.',
    offsetMs: DAYS(42), offsetEndMs: null, slipBehavior: 'restarts', sourceId: 'snus-lesions-2026', phaseId: 'consolidation', audience: 'snus',
  },
  {
    id: 'mood-lifts',
    title: 'Mood, anxiety and stress tend to be better than if you had kept going',
    body: 'Studies following people for six weeks or more found less anxiety, depression and stress after quitting than in people who carried on. Measured in people who quit smoking.',
    offsetMs: DAYS(42), offsetEndMs: null, slipBehavior: 'cumulative', sourceId: 'taylor-2021', phaseId: 'consolidation', audience: 'all',
  },
  {
    id: 'appetite',
    title: 'Appetite changes settle',
    body: 'A bigger appetite is common after stopping nicotine, and most of any weight change happens in the first three months. It varies widely between people — this is a heads-up, not a forecast.',
    offsetMs: MONTHS(1), offsetEndMs: MONTHS(3), slipBehavior: 'cumulative', sourceId: 'aubin-2012', phaseId: 'consolidation', audience: 'all',
  },
  {
    id: 'long-term-unknown',
    title: 'Long-term effects are not yet known',
    body: 'No health authority publishes a recovery timeline for this product, because it has not been studied for long enough. What is certain is that stopping ends the ongoing exposure — so there are no dated milestones here, only that.',
    offsetMs: null, offsetEndMs: null, slipBehavior: 'qualitative', sourceId: 'who-htp-2020', phaseId: 'long-haul', audience: 'unknown-long-term',
    overrides: {
      vape: { offsetMs: null, offsetEndMs: null, sourceId: 'cochrane-ecig-2025' },
      snus: { offsetMs: null, offsetEndMs: null, sourceId: 'fda-snus-mrtp' },
      pouches: { offsetMs: null, offsetEndMs: null, sourceId: 'fda-zyn-mrtp' },
    },
  },
```

Import `MS_PER_HOUR` at the top.

- [ ] **Step 5: Run** `npx vitest run src/content` — PASS. The banned-phrase test must pass (check `snus-mucosa` body says "does not grow back", not "gums grow back"; adjust copy if it trips).

- [ ] **Step 6: Add timeline tests** to `src/domain/timeline.test.ts`:

```ts
const heatedSwitcher = cigaretteSettings({ product: 'heated', cigaretteHistory: { months: 60, cigarettesPerDay: 10 } });
const vapeNoHistory = cigaretteSettings({ product: 'vape', cost: { kind: 'weekly', weeklySpendMinor: 1500 }, cigaretteHistory: null });
const ids = (vm: TimelineViewModel) => vm.chapters.flatMap((c) => c.milestones.map((s) => s.milestone.id));

it('timeline_heatedWithHistory_showsLongTermButNotCarbonMonoxide', () => {
  // Arrange & Act
  const vm = build({ settings: heatedSwitcher, slips: [], periods: [] });

  // Assert
  expect(ids(vm)).toContain('heart-attack-risk');
  expect(ids(vm)).not.toContain('carbon-monoxide');
  expect(ids(vm)).not.toContain('long-term-unknown');
});

it('timeline_heatedSwitcher_marksLongTermMilestonesConservative', () => {
  // Arrange & Act
  const vm = build({ settings: heatedSwitcher, slips: [], periods: [] });
  const heartAttack = vm.chapters.flatMap((c) => c.milestones).find((s) => s.milestone.id === 'heart-attack-risk');
  const nicotine = vm.chapters.flatMap((c) => c.milestones).find((s) => s.milestone.id === 'nicotine-cleared');

  // Assert
  expect(heartAttack?.conservativelyAnchored).toBe(true);
  expect(nicotine?.conservativelyAnchored).toBe(false);
});

it('timeline_vapeWithoutHistory_showsUnknownLongTermAndNoAcsRiskMilestone', () => {
  // Arrange & Act
  const vm = build({ settings: vapeNoHistory, slips: [], periods: [] });

  // Assert
  expect(ids(vm)).toContain('long-term-unknown');
  expect(ids(vm)).not.toContain('lung-cancer-halved');
});

it('timeline_heated_heartRateMilestoneReachedAfterOneHourNotTwentyMinutes', () => {
  // Arrange — 30 minutes after quitting
  const settings = cigaretteSettings({ product: 'heated', quitDate: '2026-08-08T07:30:00+02:00', cigaretteHistory: null });

  // Act
  const vm = buildTimeline({ state: { settings, slips: [], periods: [] }, milestones: MILESTONES, phases: PHASES, dangerTips: DANGER_WINDOW_TIPS, unit: { one: 'stick', many: 'sticks' }, now: new Date('2026-08-08T08:00:00+02:00') });
  const heart = vm.chapters.flatMap((c) => c.milestones).find((s) => s.milestone.id === 'heart-rate');

  // Assert
  expect(heart?.status).toBe('future');
});

it('timeline_snusVsPouches_onlySnusSeesMucosaMilestone', () => {
  // Arrange
  const snus = cigaretteSettings({ product: 'snus', cigaretteHistory: null });
  const pouches = cigaretteSettings({ product: 'pouches', cigaretteHistory: null });

  // Act & Assert
  expect(ids(build({ settings: snus, slips: [], periods: [] }))).toContain('snus-mucosa');
  expect(ids(build({ settings: pouches, slips: [], periods: [] }))).not.toContain('snus-mucosa');
});
```

`build(state)` is the file's existing helper; extend it to pass `dangerTips: DANGER_WINDOW_TIPS, unit: { one: 'cigarette', many: 'cigarettes' }` (Task 4 adds those inputs — in this task add them to `TimelineInput` as optional-free required fields only in Task 4; here call `buildTimeline` with the existing inputs and add those two args in Task 4). **Implementation note:** for this task, the heated-heart-rate test calls `buildTimeline({ state, milestones, phases, now })`; Task 4 updates the call.

- [ ] **Step 7: Run** — FAIL.

- [ ] **Step 8: Update `buildTimeline`** — first line: `const milestonesForUser = applicableMilestones(milestones, state.settings);` and resolve those; after resolution map states to add `conservativelyAnchored: isConservativelyAnchored(state.milestone, settings)`. Add `conservativelyAnchored: boolean` to `MilestoneState` in `types.ts` and set it `false` in `resolveMilestone` (timeline overwrites). Update `milestones.test.ts` expectations that `toEqual` whole states to include `conservativelyAnchored: false`.

- [ ] **Step 9: Run** `npm test && npm run typecheck` — PASS.

- [ ] **Step 10: Commit** `feat(content): product-specific milestones with sourced audiences`.

---

### Task 4: Copy variants, product content and tip resolution

**Files:**
- Create: `src/content/products.ts`
- Modify: `src/domain/types.ts`, `src/domain/phases.ts`, `src/domain/phases.test.ts`, `src/domain/format.ts`, `src/domain/format.test.ts`, `src/domain/timeline.ts`, `src/domain/timeline.test.ts`, `src/content/phases.ts`, `src/content/sos.ts`, `src/content/content.test.ts`, `app/index.tsx`, `src/ui/ChapterBlock.tsx`

**Interfaces:**
- Produces:

```ts
// types.ts
export interface UnitWords { one: string; many: string }
export interface TipContent { whatsHappening: string; whyYouFeelThisWay: string; howToCope: readonly string[] }
export interface DangerTips { whatsHappening: CopyVariants<string>; whyYouFeelThisWay: string; howToCope: readonly string[] }
// Phase gains: nameNicotine: string | null; whatsHappeningNicotine: string; whatsHappeningOral: string | null; howToCopeSmokeOnly: readonly string[];
// TimelineViewModel gains: currentTips: TipContent; currentTipsAreDangerWindow: boolean;

// format.ts
export function fillUnitTokens(text: string, unit: UnitWords): string;
// phases.ts
export function resolvePhaseCopy(phase: Phase, settings: Settings, unit: UnitWords): Phase;
// timeline.ts: TimelineInput gains dangerTips: DangerTips; unit: UnitWords

// content/products.ts
export interface ProductContent {
  id: ProductId; label: string; hint: string; unit: UnitWords;
  freeWord: string; avoidedLabel: string; cravingButton: string; slipVerb: string;
  relapseTitle: string; countsSlips: boolean;
  perDayLabel: string; perPackLabel: string | null; packPriceLabel: string | null; defaultPerPack: number | null;
}
export const PRODUCT_CONTENT: Record<ProductId, ProductContent>;
export const SLIP_REASSURANCE: CopyVariants<string>;
```

- [ ] **Step 1: Failing tests.** `format.test.ts`:

```ts
it('fillUnitTokens_bothTokens_replacesEveryOccurrence', () => {
  // Arrange & Act
  const result = fillUnitTokens('One {unit} is not {units}. One {unit}.', { one: 'pouch', many: 'pouches' });

  // Assert
  expect(result).toBe('One pouch is not pouches. One pouch.');
});

it('fillUnitTokens_noTokens_returnsTextUnchanged', () => {
  // Arrange & Act & Assert
  expect(fillUnitTokens('plain', { one: 'x', many: 'xs' })).toBe('plain');
});
```

`phases.test.ts`:

```ts
const unit = { one: 'vape', many: 'vapes' };
it('resolvePhaseCopy_vapeInCrash_usesNicotineText', () => {
  // Arrange
  const crash = PHASES[0];
  if (!crash) throw new Error('fixture');

  // Act
  const resolved = resolvePhaseCopy(crash, cigaretteSettings({ product: 'vape', cost: { kind: 'weekly', weeklySpendMinor: 1 }, cigaretteHistory: null }), unit);

  // Assert
  expect(resolved.whatsHappening).toBe(crash.whatsHappeningNicotine);
  expect(resolved.whatsHappening.toLowerCase()).not.toContain('carbon monoxide');
});

it('resolvePhaseCopy_heatedSwitcherInLongHaul_usesSmokeText', () => {
  // Arrange
  const longHaul = PHASES.find((p) => p.id === 'long-haul');
  if (!longHaul) throw new Error('fixture');

  // Act
  const resolved = resolvePhaseCopy(longHaul, cigaretteSettings({ product: 'heated', cigaretteHistory: { months: 12, cigarettesPerDay: 10 } }), unit);

  // Assert
  expect(resolved.whatsHappening).toBe(longHaul.whatsHappening);
});

it('resolvePhaseCopy_pouchesInCrash_usesOralText', () => {
  // Arrange
  const crash = PHASES[0];
  if (!crash || crash.whatsHappeningOral === null) throw new Error('fixture');

  // Act
  const resolved = resolvePhaseCopy(crash, cigaretteSettings({ product: 'pouches', cigaretteHistory: null }), unit);

  // Assert
  expect(resolved.whatsHappening).toBe(crash.whatsHappeningOral);
});

it('resolvePhaseCopy_nonCombustibleFinalPhase_isRenamed', () => {
  // Arrange
  const last = PHASES[PHASES.length - 1];
  if (!last) throw new Error('fixture');

  // Act
  const resolved = resolvePhaseCopy(last, cigaretteSettings({ product: 'vape', cost: { kind: 'weekly', weeklySpendMinor: 1 }, cigaretteHistory: null }), unit);

  // Assert
  expect(resolved.name).toBe('Nicotine-Free');
});

it('resolvePhaseCopy_consolidationForVape_dropsSmokeOnlyTip', () => {
  // Arrange
  const consolidation = PHASES.find((p) => p.id === 'consolidation');
  if (!consolidation) throw new Error('fixture');

  // Act
  const resolved = resolvePhaseCopy(consolidation, cigaretteSettings({ product: 'vape', cost: { kind: 'weekly', weeklySpendMinor: 1 }, cigaretteHistory: null }), unit);

  // Assert
  expect(resolved.howToCope.join(' ')).not.toMatch(/tar|cilia/i);
});
```

(`phases.test.ts` imports `PHASES` from `@/content/phases` — tests may import content.)

`timeline.test.ts`:

```ts
it('timeline_dangerWindowForVape_tipsUseNicotineVariantWithUnitFilled', () => {
  // Arrange
  const settings = cigaretteSettings({ product: 'vape', cost: { kind: 'weekly', weeklySpendMinor: 1500 }, cigaretteHistory: null });
  const state = { settings, slips: [{ id: 1, occurredAt: '2026-08-07T22:00:00+02:00', unitCount: 1, trigger: null, note: null }], periods: [] };

  // Act
  const vm = buildTimeline({ state, milestones: MILESTONES, phases: PHASES, dangerTips: DANGER_WINDOW_TIPS, unit: { one: 'vape', many: 'vapes' }, now: new Date('2026-08-08T08:00:00+02:00') });

  // Assert
  expect(vm.currentTipsAreDangerWindow).toBe(true);
  expect(vm.currentTips.whatsHappening.toLowerCase()).not.toContain('carbon monoxide');
  expect(vm.currentTips.howToCope.join(' ')).not.toContain('{unit}');
});

it('timeline_noDangerWindow_currentTipsComeFromCurrentPhase', () => {
  // Arrange & Act
  const vm = build({ settings: cigaretteSettings(), slips: [], periods: [] });

  // Assert
  expect(vm.currentTipsAreDangerWindow).toBe(false);
  expect(vm.currentTips.whatsHappening).toBe(vm.currentPhase.whatsHappening);
});
```

`content.test.ts`:

```ts
import { PRODUCT_CONTENT, SLIP_REASSURANCE } from './products';
import { SOS_STEPS } from './sos';
import { DANGER_WINDOW_TIPS } from './phases';

it('PRODUCT_CONTENT_everyProduct_hasAnEntryWithMatchingId', () => {
  // Arrange & Act
  const mismatched = PRODUCTS.filter((p) => PRODUCT_CONTENT[p].id !== p);

  // Assert
  expect(mismatched).toEqual([]);
});

it('PRODUCT_CONTENT_packProducts_havePackLabelsAndVapeHasNone', () => {
  // Arrange & Act
  const missing = PRODUCTS.filter((p) => p !== 'vape' && PRODUCT_CONTENT[p].perPackLabel === null);

  // Assert
  expect(missing).toEqual([]);
  expect(PRODUCT_CONTENT.vape.perPackLabel).toBeNull();
});

it('content_unitTokens_onlyUseKnownTokenNames', () => {
  // Arrange
  const texts = [
    ...SOS_STEPS.map((s) => s.instruction), SLIP_REASSURANCE.smoke, SLIP_REASSURANCE.nicotine,
    ...DANGER_WINDOW_TIPS.howToCope, ...PHASES.flatMap((p) => [...p.howToCope, ...p.howToCopeSmokeOnly]),
  ];

  // Act
  const unknown = texts.flatMap((t) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1])).filter((name) => name !== 'unit' && name !== 'units');

  // Assert
  expect(unknown).toEqual([]);
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement.** `format.ts`:

```ts
/** Fills `{unit}` / `{units}` in content copy with the product's words. */
export function fillUnitTokens(text: string, unit: UnitWords): string {
  return text.replaceAll('{units}', unit.many).replaceAll('{unit}', unit.one);
}
```

`phases.ts`:

```ts
const SHORT_TERM_PHASES = new Set<PhaseId>(['crash', 'fog', 'consolidation']);

/**
 * Picks the copy variant for this person. Short-term phases describe smoke-specific recovery
 * (CO, cilia), so they need a combustible product; long-term phases describe smoking-risk
 * curves, which also apply to a switcher with cigarette history.
 */
export function resolvePhaseCopy(phase: Phase, settings: Settings, unit: UnitWords): Phase {
  const smoke = SHORT_TERM_PHASES.has(phase.id) ? isCombustible(settings.product) : hasSmokingHistory(settings);
  const whatsHappening = smoke
    ? phase.whatsHappening
    : isOral(settings.product) && phase.whatsHappeningOral !== null
      ? phase.whatsHappeningOral
      : phase.whatsHappeningNicotine;
  const name = !isCombustible(settings.product) && phase.nameNicotine !== null ? phase.nameNicotine : phase.name;
  const howToCope = [...phase.howToCope, ...(isCombustible(settings.product) ? phase.howToCopeSmokeOnly : [])]
    .map((tip) => fillUnitTokens(tip, unit));
  return { ...phase, name, whatsHappening, howToCope, whyYouFeelThisWay: fillUnitTokens(phase.whyYouFeelThisWay, unit) };
}
```

`timeline.ts`: add `dangerTips: DangerTips; unit: UnitWords` to `TimelineInput`; map `phases` through `resolvePhaseCopy` before resolving the current phase and chapters; compute:

```ts
  const dangerWindow = resolveDangerWindow(state.slips, now);
  const currentTips: TipContent = dangerWindow.active
    ? {
        whatsHappening: pickVariant(dangerTips.whatsHappening, state.settings),
        whyYouFeelThisWay: dangerTips.whyYouFeelThisWay,
        howToCope: dangerTips.howToCope.map((tip) => fillUnitTokens(tip, unit)),
      }
    : { whatsHappening: currentPhase.whatsHappening, whyYouFeelThisWay: currentPhase.whyYouFeelThisWay, howToCope: currentPhase.howToCope };
```

and return `currentTips`, `currentTipsAreDangerWindow: dangerWindow.active`. Move `TipContent` from `ChapterBlock.tsx` to `types.ts`.

`content/phases.ts`: add to each phase — `nameNicotine` (`null` except non-smoker: `'Nicotine-Free'`), `whatsHappeningOral` (`null` except crash), `howToCopeSmokeOnly` (`[]` except consolidation, which moves the cilia/tar tip there), and `whatsHappeningNicotine`:

- crash: `"Nicotine is leaving your body. It has a half-life of about two hours, and within three days it is gone."`
- crash oral: `"Nicotine is leaving your body — within about three days it is gone. Pouches and snus deliver more than most people think: a 4 mg pouch gives roughly nine-tenths of a cigarette’s total nicotine, so this really is quitting nicotine."`
- fog: `"Physical withdrawal is fading. Sleep and concentration are usually the last things to settle."`
- consolidation: `"The chemistry is done. What remains is habit — the places, moods and people you used to pair with nicotine."`
- long-haul: `"Nicotine has been out of your life for months. How quickly long-term risk falls after stopping this product has not been measured yet, but the exposure itself has stopped."`
- non-smoker: `"Years nicotine-free. There is nothing left to manage."`

In `long-haul` howToCope change "There is no version of one cigarette that proves you are in control." → "There is no version of one {unit} that proves you are in control."

`DANGER_WINDOW_TIPS` becomes a `DangerTips`: `whatsHappening: { smoke: <current text>, nicotine: "You logged a slip. The fast-moving markers — nicotine and withdrawal — restarted from it. Everything measured in weeks and months kept going, because one slip barely registers against them." }`; "One cigarette is not a failed quit attempt…" → "One {unit} is not a failed quit attempt…".

`content/sos.ts`: drink step → `'…which is most of what a {unit} was doing.'`. Add:

```ts
export const SLIP_REASSURANCE: CopyVariants<string> = {
  smoke: 'One {unit} is not a failed quit attempt — treating it as one is what turns it into a relapse. Your carbon monoxide and nicotine clocks restart from this. Everything measured in months and years keeps running, because those depend on cumulative exposure and this barely registers against it.',
  nicotine: 'One {unit} is not a failed quit attempt — treating it as one is what turns it into a relapse. Your nicotine clocks restart from this. Everything measured in weeks and months keeps running.',
};
```

Create `src/content/products.ts`:

```ts
import type { ProductId, UnitWords } from '@/domain/types';

export interface ProductContent {
  id: ProductId;
  label: string;
  hint: string;
  unit: UnitWords;
  /** "smoke-free" only where the product is smoked. */
  freeWord: string;
  avoidedLabel: string;
  cravingButton: string;
  slipVerb: string;
  relapseTitle: string;
  /** Vape slips are one session each; there is nothing meaningful to count. */
  countsSlips: boolean;
  perDayLabel: string;
  perPackLabel: string | null;
  packPriceLabel: string | null;
  defaultPerPack: number | null;
}

export const PRODUCT_CONTENT: Record<ProductId, ProductContent> = {
  cigarettes: {
    id: 'cigarettes', label: 'Cigarettes', hint: 'Factory-made', unit: { one: 'cigarette', many: 'cigarettes' },
    freeWord: 'smoke-free', avoidedLabel: 'not smoked', cravingButton: 'I want to smoke', slipVerb: 'I smoked',
    relapseTitle: 'You’re smoking again right now', countsSlips: true,
    perDayLabel: 'Cigarettes per day', perPackLabel: 'Cigarettes per pack', packPriceLabel: 'Price per pack', defaultPerPack: 20,
  },
  'roll-your-own': {
    id: 'roll-your-own', label: 'Roll-your-own', hint: 'Hand-rolled tobacco', unit: { one: 'roll-up', many: 'roll-ups' },
    freeWord: 'smoke-free', avoidedLabel: 'not smoked', cravingButton: 'I want to smoke', slipVerb: 'I smoked',
    relapseTitle: 'You’re smoking again right now', countsSlips: true,
    perDayLabel: 'Roll-ups per day', perPackLabel: 'Roll-ups per pouch of tobacco', packPriceLabel: 'Price per pouch', defaultPerPack: null,
  },
  heated: {
    id: 'heated', label: 'Heated tobacco', hint: 'IQOS, glo and similar', unit: { one: 'stick', many: 'sticks' },
    freeWord: 'nicotine-free', avoidedLabel: 'sticks not used', cravingButton: 'I want a stick', slipVerb: 'I used a stick',
    relapseTitle: 'You’re using heated tobacco again right now', countsSlips: true,
    perDayLabel: 'Sticks per day', perPackLabel: 'Sticks per pack', packPriceLabel: 'Price per pack', defaultPerPack: 20,
  },
  vape: {
    id: 'vape', label: 'Vape', hint: 'E-cigarettes, disposables, pods', unit: { one: 'vape', many: 'vapes' },
    freeWord: 'nicotine-free', avoidedLabel: 'vapes skipped (approx.)', cravingButton: 'I want to vape', slipVerb: 'I vaped',
    relapseTitle: 'You’re vaping again right now', countsSlips: false,
    perDayLabel: 'How often did you vape?', perPackLabel: null, packPriceLabel: null, defaultPerPack: null,
  },
  snus: {
    id: 'snus', label: 'Snus', hint: 'Tobacco pouches', unit: { one: 'pouch', many: 'pouches' },
    freeWord: 'nicotine-free', avoidedLabel: 'pouches not used', cravingButton: 'I want a pouch', slipVerb: 'I used a pouch',
    relapseTitle: 'You’re using snus again right now', countsSlips: true,
    perDayLabel: 'Pouches per day', perPackLabel: 'Pouches per can', packPriceLabel: 'Price per can', defaultPerPack: 20,
  },
  pouches: {
    id: 'pouches', label: 'Nicotine pouches', hint: 'Tobacco-free, e.g. Zyn or Velo', unit: { one: 'pouch', many: 'pouches' },
    freeWord: 'nicotine-free', avoidedLabel: 'pouches not used', cravingButton: 'I want a pouch', slipVerb: 'I used a pouch',
    relapseTitle: 'You’re using pouches again right now', countsSlips: true,
    perDayLabel: 'Pouches per day', perPackLabel: 'Pouches per can', packPriceLabel: 'Price per can', defaultPerPack: 20,
  },
};

/** Onboarding shows snus and tobacco-free pouches as one card, then asks which. */
export const PICKER_CARDS: { key: string; label: string; hint: string; products: ProductId[] }[] = [
  { key: 'cigarettes', label: 'Cigarettes', hint: 'Factory-made', products: ['cigarettes'] },
  { key: 'roll-your-own', label: 'Roll-your-own', hint: 'Hand-rolled tobacco', products: ['roll-your-own'] },
  { key: 'heated', label: 'Heated tobacco', hint: 'IQOS, glo and similar', products: ['heated'] },
  { key: 'vape', label: 'Vape', hint: 'E-cigarettes, disposables, pods', products: ['vape'] },
  { key: 'oral', label: 'Pouches or snus', hint: 'Zyn, Velo, snus', products: ['snus', 'pouches'] },
];

/** "How often" chips for vape, filling an editable uses-per-day number. */
export const VAPE_FREQUENCY_CHIPS: { label: string; usesPerDay: number }[] = [
  { label: 'A few times a day', usesPerDay: 5 },
  { label: 'About every hour', usesPerDay: 15 },
  { label: 'Constantly', usesPerDay: 30 },
];

export { SLIP_REASSURANCE } from './sos';
```

- [ ] **Step 4: Update `app/index.tsx`** — pass `dangerTips: DANGER_WINDOW_TIPS, unit: PRODUCT_CONTENT[state.settings.product].unit` to `buildTimeline`; ChapterBlock gets `tips={chapter.status === 'current' ? timeline.currentTips : null}` and `tipsAreDangerWindow={chapter.status === 'current' && timeline.currentTipsAreDangerWindow}`. Import `TipContent` from `@/domain/types` in `ChapterBlock.tsx`.

- [ ] **Step 5: Run** `npm test && npm run typecheck` — PASS.

- [ ] **Step 6: Commit** `feat(content): product wording and smoke/nicotine copy variants`.

---

### Task 5: Pure setup-form parsing shared by onboarding and settings

**Files:**
- Create: `src/domain/setupForm.ts`, `src/domain/setupForm.test.ts`

**Interfaces:**
- Produces:

```ts
export interface SetupFormValues {
  product: ProductId;
  unitsPerDay: string;
  unitsPerPack: string;
  packPrice: string;
  weeklySpend: string;
  smokedBefore: boolean;       // only read for non-combustible products
  historyYears: string;
  historyMonths: string;
  priorPerDay: string;         // only read for non-combustible products with smokedBefore
}
export interface SetupLabels { perDay: string; perPack: string | null; packPrice: string | null }
export type SetupResult = { ok: true; settings: Settings } | { ok: false; error: string };
export const MAX_HISTORY_YEARS = 80;
export function parseSetupForm(values: SetupFormValues, context: { quitMoment: Date; now: Date; currency: string; timezone: string; labels: SetupLabels }): SetupResult;
export function valuesFromSettings(settings: Settings): SetupFormValues;
export function defaultValues(product: ProductId, defaultPerPack: number | null): SetupFormValues;
```

- [ ] **Step 1: Write `src/domain/setupForm.test.ts`:**

```ts
import { describe, expect, it } from 'vitest';
import { defaultValues, parseSetupForm, valuesFromSettings, type SetupFormValues } from './setupForm';
import { cigaretteSettings } from './testSettings';

const context = {
  quitMoment: new Date('2026-08-01T10:00:00Z'), now: new Date('2026-08-08T10:00:00Z'),
  currency: 'EUR', timezone: 'UTC', labels: { perDay: 'Sticks per day', perPack: 'Sticks per pack', packPrice: 'Price per pack' },
};
const values = (overrides: Partial<SetupFormValues> = {}): SetupFormValues => ({
  product: 'heated', unitsPerDay: '12', unitsPerPack: '20', packPrice: '8,50', weeklySpend: '',
  smokedBefore: false, historyYears: '', historyMonths: '', priorPerDay: '', ...overrides,
});

describe('parseSetupForm', () => {
  it('parseSetupForm_heatedNoHistory_buildsPackSettingsWithNullHistory', () => {
    // Arrange & Act
    const result = parseSetupForm(values(), context);

    // Assert
    expect(result).toEqual({ ok: true, settings: {
      quitDate: '2026-08-01T10:00:00.000Z', product: 'heated', unitsPerDay: 12,
      cost: { kind: 'pack', unitsPerPack: 20, packPriceMinor: 850 }, currency: 'EUR', timezone: 'UTC', cigaretteHistory: null,
    } });
  });

  it('parseSetupForm_heatedSmokedBefore_buildsHistoryFromPriorRate', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ smokedBefore: true, historyYears: '10', historyMonths: '6', priorPerDay: '20' }), context);

    // Assert
    expect(result.ok && result.settings.cigaretteHistory).toEqual({ months: 126, cigarettesPerDay: 20 });
  });

  it('parseSetupForm_heatedSmokedBeforeWithoutRate_isAnError', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ smokedBefore: true, historyYears: '10', priorPerDay: '' }), context);

    // Assert
    expect(result).toEqual({ ok: false, error: 'Cigarettes per day must be a whole number above zero.' });
  });

  it('parseSetupForm_cigarettesWithYears_historyRateIsDailyRate', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ product: 'cigarettes', unitsPerDay: '15', historyYears: '8' }), { ...context, labels: { perDay: 'Cigarettes per day', perPack: 'Cigarettes per pack', packPrice: 'Price per pack' } });

    // Assert
    expect(result.ok && result.settings.cigaretteHistory).toEqual({ months: 96, cigarettesPerDay: 15 });
  });

  it('parseSetupForm_vapeWithStalePackFields_ignoresThem', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ product: 'vape', unitsPerDay: '15', weeklySpend: '21', unitsPerPack: 'garbage', packPrice: 'garbage' }), { ...context, labels: { perDay: 'Uses per day', perPack: null, packPrice: null } });

    // Assert
    expect(result.ok && result.settings.cost).toEqual({ kind: 'weekly', weeklySpendMinor: 2100 });
  });

  it('parseSetupForm_vapeWithoutWeeklySpend_isAnError', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ product: 'vape', weeklySpend: '' }), { ...context, labels: { perDay: 'Uses per day', perPack: null, packPrice: null } });

    // Assert
    expect(result).toEqual({ ok: false, error: 'Weekly spend must look like 15 or 15.50.' });
  });

  it('parseSetupForm_zeroPerDay_errorUsesTheProductLabel', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ unitsPerDay: '0' }), context);

    // Assert
    expect(result).toEqual({ ok: false, error: 'Sticks per day must be a whole number above zero.' });
  });

  it('parseSetupForm_moreThanEightyYears_isAnError', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ product: 'cigarettes', historyYears: '500' }), context);

    // Assert
    expect(result).toEqual({ ok: false, error: 'Years must be 80 or fewer.' });
  });

  it('parseSetupForm_futureQuitMoment_isAnError', () => {
    // Arrange & Act
    const result = parseSetupForm(values(), { ...context, quitMoment: new Date('2026-08-09T00:00:00Z') });

    // Assert
    expect(result).toEqual({ ok: false, error: 'Your quit date cannot be in the future.' });
  });
});

describe('valuesFromSettings', () => {
  it('valuesFromSettings_roundTripsThroughParse', () => {
    // Arrange
    const settings = cigaretteSettings({ quitDate: '2026-08-01T10:00:00.000Z', timezone: 'UTC' });

    // Act
    const result = parseSetupForm(valuesFromSettings(settings), { ...context, labels: { perDay: 'Cigarettes per day', perPack: 'Cigarettes per pack', packPrice: 'Price per pack' } });

    // Assert
    expect(result).toEqual({ ok: true, settings });
  });

  it('defaultValues_rollYourOwn_leavesPerPackBlank', () => {
    // Arrange & Act & Assert
    expect(defaultValues('roll-your-own', null).unitsPerPack).toBe('');
  });
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Write `src/domain/setupForm.ts`:**

```ts
import { parseMinorUnits, parseNonNegativeInt, parsePositiveInt } from './parse';
import { isCombustible } from './products';
import type { CigaretteHistory, CostModel, ProductId, Settings } from './types';

export const MAX_HISTORY_YEARS = 80;

export interface SetupFormValues {
  product: ProductId;
  unitsPerDay: string;
  unitsPerPack: string;
  packPrice: string;
  weeklySpend: string;
  smokedBefore: boolean;
  historyYears: string;
  historyMonths: string;
  priorPerDay: string;
}

export interface SetupLabels { perDay: string; perPack: string | null; packPrice: string | null }

export type SetupResult = { ok: true; settings: Settings } | { ok: false; error: string };

const fail = (error: string): SetupResult => ({ ok: false, error });

/**
 * The one place onboarding and Settings turn typed text into Settings, so both accept and
 * reject exactly the same input. Fields that do not belong to the chosen product are ignored,
 * which is what lets a user switch product without clearing the old fields first.
 */
export function parseSetupForm(
  values: SetupFormValues,
  context: { quitMoment: Date; now: Date; currency: string; timezone: string; labels: SetupLabels },
): SetupResult {
  const { labels } = context;
  const unitsPerDay = parsePositiveInt(values.unitsPerDay);
  if (unitsPerDay === null) return fail(`${labels.perDay} must be a whole number above zero.`);

  let cost: CostModel;
  if (values.product === 'vape') {
    const weeklySpendMinor = parseMinorUnits(values.weeklySpend);
    if (weeklySpendMinor === null) return fail('Weekly spend must look like 15 or 15.50.');
    cost = { kind: 'weekly', weeklySpendMinor };
  } else {
    const unitsPerPack = parsePositiveInt(values.unitsPerPack);
    if (unitsPerPack === null) return fail(`${labels.perPack ?? 'Per pack'} must be a whole number above zero.`);
    const packPriceMinor = parseMinorUnits(values.packPrice);
    if (packPriceMinor === null) return fail(`${labels.packPrice ?? 'Price'} must look like 11 or 11.50.`);
    cost = { kind: 'pack', unitsPerPack, packPriceMinor };
  }

  const combustible = isCombustible(values.product);
  let cigaretteHistory: CigaretteHistory | null = null;
  if (combustible || values.smokedBefore) {
    // Blank means "not given"; a non-empty unreadable value is an error, never a silent zero.
    const years = values.historyYears.trim() === '' ? 0 : parseNonNegativeInt(values.historyYears);
    const months = values.historyMonths.trim() === '' ? 0 : parseNonNegativeInt(values.historyMonths);
    if (years === null) return fail('Years must be a whole number, or left blank.');
    if (months === null) return fail('Months must be a whole number, or left blank.');
    if (years > MAX_HISTORY_YEARS) return fail(`Years must be ${MAX_HISTORY_YEARS} or fewer.`);
    const totalMonths = years * 12 + months;

    if (combustible) {
      cigaretteHistory = totalMonths > 0 ? { months: totalMonths, cigarettesPerDay: unitsPerDay } : null;
    } else {
      const priorPerDay = parsePositiveInt(values.priorPerDay);
      if (priorPerDay === null) return fail('Cigarettes per day must be a whole number above zero.');
      if (totalMonths === 0) return fail('How long did you smoke? Enter years, months, or both.');
      cigaretteHistory = { months: totalMonths, cigarettesPerDay: priorPerDay };
    }
  }

  if (context.quitMoment.getTime() > context.now.getTime()) return fail('Your quit date cannot be in the future.');

  return {
    ok: true,
    settings: {
      quitDate: context.quitMoment.toISOString(),
      product: values.product,
      unitsPerDay,
      cost,
      currency: context.currency,
      timezone: context.timezone,
      cigaretteHistory,
    },
  };
}

const money = (minor: number) => (minor / 100).toFixed(2);

export function valuesFromSettings(settings: Settings): SetupFormValues {
  const history = settings.cigaretteHistory;
  return {
    product: settings.product,
    unitsPerDay: String(settings.unitsPerDay),
    unitsPerPack: settings.cost.kind === 'pack' ? String(settings.cost.unitsPerPack) : '',
    packPrice: settings.cost.kind === 'pack' ? money(settings.cost.packPriceMinor) : '',
    weeklySpend: settings.cost.kind === 'weekly' ? money(settings.cost.weeklySpendMinor) : '',
    smokedBefore: history !== null && !isCombustible(settings.product),
    historyYears: history ? String(Math.floor(history.months / 12)) : '',
    historyMonths: history ? String(history.months % 12) : '',
    priorPerDay: history && !isCombustible(settings.product) ? String(history.cigarettesPerDay) : '',
  };
}

export function defaultValues(product: ProductId, defaultPerPack: number | null): SetupFormValues {
  return {
    product,
    unitsPerDay: '',
    unitsPerPack: defaultPerPack === null ? '' : String(defaultPerPack),
    packPrice: '',
    weeklySpend: '',
    smokedBefore: false,
    historyYears: '',
    historyMonths: '',
    priorPerDay: '',
  };
}
```

Note on the round-trip test: `valuesFromSettings` of the fixture gives `historyYears: '8'`, `historyMonths: '0'` → 96 months ✓, and `'11.00'` → 1100 ✓.

- [ ] **Step 4: Run** `npx vitest run src/domain/setupForm.test.ts` — PASS.

- [ ] **Step 5: Commit** `feat(domain): shared setup-form parsing for every product`.

---

### Task 6: Onboarding wizard with the product picker

**Files:**
- Create: `src/ui/ProductPicker.tsx`, `src/ui/UsageFields.tsx`
- Modify: `app/onboarding.tsx`

**Interfaces:**
- Consumes: `PICKER_CARDS`, `PRODUCT_CONTENT`, `VAPE_FREQUENCY_CHIPS` (Task 4); `parseSetupForm`, `defaultValues`, `SetupFormValues` (Task 5).
- Produces:

```tsx
export function ProductPicker(props: { value: ProductId | null; onChange: (product: ProductId) => void }): JSX.Element;
export function UsageFields(props: { values: SetupFormValues; onChange: (next: SetupFormValues) => void }): JSX.Element;
// UsageFields renders: per-day (or vape frequency chips + number), pack fields or weekly spend, and the history block.
```

- [ ] **Step 1: `src/ui/ProductPicker.tsx`** — renders `PICKER_CARDS` as large pressable cards (label + hint, selected state uses `theme.color.heroBg` border 2px and `doneBg` fill). When the selected product is `snus` or `pouches`, or the oral card is tapped, shows a second row of two chips: "Snus (tobacco)" → `snus`, "Tobacco-free pouches" → `pouches`. Tapping the oral card with no oral product selected selects `pouches` by default. `accessibilityRole="radio"` and `accessibilityState={{ selected }}` on every card.

- [ ] **Step 2: `src/ui/UsageFields.tsx`** — reads `PRODUCT_CONTENT[values.product]`:
  - per-day field labelled `perDayLabel`; for vape, first a chip row from `VAPE_FREQUENCY_CHIPS` whose press sets `unitsPerDay` to the chip's number, and the field below is labelled "Uses per day (edit if you like)".
  - pack products: `perPackLabel` and `packPriceLabel (€)` fields; vape: "Spend per week (€)".
  - history: combustible → "How long did you smoke? (optional)" years + months, hint "Used only for an estimate of your lifetime cigarette total. Leave blank to skip."; otherwise a Yes/No chip pair "Did you smoke cigarettes before?" and, on Yes, years + months + "Cigarettes per day back then", hint "This decides whether the long-term smoking-recovery milestones apply to you."
  - Every `TextInput` has `accessibilityLabel` equal to its visible label. Reuse the existing input styles from onboarding (move them into this file).

- [ ] **Step 3: Rewrite `app/onboarding.tsx`** as a 4-step wizard (`step: 0 | 1 | 2 | 3` state): 0 = "What are you quitting?" + `ProductPicker` + the "Everything stays on this phone…" line; 1 = usage & cost (`UsageFields` minus history — pass a `section: 'usage' | 'history'` prop to `UsageFields` so it renders one section); 2 = history section; 3 = quit moment (`QuitMomentPicker`). A header shows "Step N of 4". "Next" validates only that a product is chosen on step 0; the final "Start tracking" calls `parseSetupForm(values, { quitMoment, now: new Date(), currency: 'EUR', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, labels })` with `labels` from `PRODUCT_CONTENT`, shows `error` on failure, else `saveSettings` then `router.replace('/')`. Choosing a product resets values with `defaultValues(product, content.defaultPerPack)` only when the product actually changes. "Back" on steps 1–3. The disclaimer stays at the bottom of step 3. Add `section` prop to the `UsageFields` interface: `section: 'usage' | 'history'`.

- [ ] **Step 4: Verify** `npm run typecheck`; then `npx expo export --platform android` builds without error.

- [ ] **Step 5: Commit** `feat(onboarding): choose what you are quitting`.

---

### Task 7: Product-aware home, slips and the shared submit guard

**Files:**
- Create: `src/ui/useSubmitGuard.ts`
- Modify: `app/index.tsx`, `src/ui/Hero.tsx`, `src/ui/MilestoneNode.tsx`, `app/log.tsx`, `app/sos.tsx`

**Interfaces:**
- Produces:

```ts
/** Double-tap-safe async submit: the ref is checked and set before any await. */
export function useSubmitGuard(): { submitting: boolean; run: (task: () => Promise<void>) => Promise<void> };
```

- [ ] **Step 1: Write `src/ui/useSubmitGuard.ts`:**

```ts
import { useCallback, useRef, useState } from 'react';

/**
 * The ref is the correctness guard: it is checked and set synchronously before any await, so
 * two taps in the same tick cannot both run the task (two slip rows would restart the fast
 * clocks twice and charge savings twice). `submitting` only drives the disabled styling and
 * may lag a render behind the ref.
 */
export function useSubmitGuard(): { submitting: boolean; run: (task: () => Promise<void>) => Promise<void> } {
  const busy = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const run = useCallback(async (task: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    try {
      await task();
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submitting, run };
}
```

- [ ] **Step 2: `Hero.tsx`** — new props `freeWord: string`, `avoidedLabel: string`, `relapseTitle: string`; subtitle `{freeWord} · {phaseName}`; tiles: money, `formatCount(unitsAvoided)` + `avoidedLabel`, and time-not-lost only when `minutesNotLost !== null`. Smoking-state title uses `relapseTitle`; body replaces "smoke-free" wording with "Your best run was …".

- [ ] **Step 3: `MilestoneNode.tsx`** — when `state.conservativelyAnchored`, render under the body: "Measured in people who quit smoking. Counted from your final quit date, which is conservative if you stopped cigarettes earlier." (style `badge`-sized, `textFaint`).

- [ ] **Step 4: `app/index.tsx`** — `const content = PRODUCT_CONTENT[state.settings.product];` pass Hero props; SOS button text `content.cravingButton`.

- [ ] **Step 5: `app/sos.tsx`** — use `useSubmitGuard`; slip screen body `fillUnitTokens(pickVariant(SLIP_REASSURANCE, settings), content.unit)`; lifetime sentence from `lifetimeAfterSlip(state, count, new Date())` (render only when non-null); count field only when `content.countsSlips` (label "How many {units}?"), else count is 1; step instructions pass through `fillUnitTokens(step.instruction, content.unit)`; the "I smoked" link reads `content.slipVerb`. While `state` is null (still loading), fall back to cigarettes content.

- [ ] **Step 6: `app/log.tsx`** — use `useSubmitGuard` for all three submits; slip hint "A few {units}, still quit. This subtracts exactly what you used — nothing more." (filled); count field only when `countsSlips`; success text lifetime via `lifetimeAfterSlip(refreshed, 0, new Date())`; relapse section title "I’ve gone back to it", hint "Not a slip — a return to regular use. Roughly how many {units} a day?" (for vape: "Roughly how many times a day?"), accessibility label from the same text.

- [ ] **Step 7: Verify** `npm test && npm run typecheck && npx expo export --platform android`.

- [ ] **Step 8: Commit** `feat(ui): product wording on home, SOS and log; one submit guard`.

---

### Task 8: Settings — change product, edit usage and history

**Files:**
- Modify: `app/settings.tsx`

**Interfaces:**
- Consumes: `ProductPicker`, `UsageFields` (Task 6), `parseSetupForm`, `valuesFromSettings`, `defaultValues` (Task 5), `estimateCigarettesBeforeQuitting` (Task 1).

- [ ] **Step 1:** Replace the per-day/price inputs with: `ProductPicker`, `UsageFields section="usage"`, `UsageFields section="history"`, then `QuitMomentPicker`. Form state `values: SetupFormValues | null`, seeded from `valuesFromSettings(state.settings)` in an effect keyed on a stable string of the stored settings (`JSON.stringify(state.settings)`), so it re-seeds after load and after save but never while typing. Changing product in the picker keeps shared fields (`unitsPerDay`, history) and fills pack defaults via `defaultValues` only for fields that are blank.

- [ ] **Step 2:** When `values.product !== state.settings.product && state.slips.length > 0`, show above Save: "You have {n} logged slip(s). They will be counted as {units} from now on." Save uses `parseSetupForm` with `currency`/`timezone` from the stored settings; on success `saveSettings`, then `reload()` in its own try so a reload failure reports "Saved, but couldn’t refresh — reopen Settings to see the new figures." instead of claiming the write failed (fixes a `STATE.md` known item).

- [ ] **Step 3:** Lifetime hint renders only when `estimateCigarettesBeforeQuitting(state.settings)` is non-null; text "Estimated cigarettes you smoked before quitting: N. Worked out from your daily rate and how long you smoked — an estimate, not a count."

- [ ] **Step 4: Verify** `npm test && npm run typecheck && npx expo export --platform android`.

- [ ] **Step 5: Commit** `feat(settings): change product and edit usage and history`.

---

### Task 9: Citation verification

**Files:**
- Modify: `src/content/sources.ts`, `src/content/milestones.ts` (only if a claim fails)
- Create: `docs/citation-check-2026-09.md`

- [ ] **Step 1:** For every entry in `SOURCES`, fetch the URL (WebFetch). Record in `docs/citation-check-2026-09.md` a table: id · resolves (y/n) · supports the exact claim that cites it (y/n/partial) · tier ok · action.
- [ ] **Step 2:** Priority: `benowitz-2009`, `kenford-1994`, `larsson-1991` (all cited from memory), then every new source, then the existing ones.
- [ ] **Step 3:** Fix any wrong URL or label. If a source does not support its milestone wording, reword the milestone to what the source says; if nothing supports it, remove the milestone and note it. Never keep a milestone on an unverified citation — if a page cannot be fetched (403/captcha), find an alternative authoritative URL for the same paper (PubMed/PMC/DOI) and verify that.
- [ ] **Step 4:** `npm test` — PASS. Commit `docs: verify every citation behind the milestones`.

---

### Task 10: Docs and final verification

**Files:**
- Modify: `STATE.md`, `README.md` (only where it states cigarettes-only)

- [ ] **Step 1:** `STATE.md`: update tests count, schema version 3, remove the fixed known items (years bound, duplicated slip logging, settings save/reload message, not-editable inputs), add "Products shipped" line and the sub-project roadmap (design system & icon next).
- [ ] **Step 2:** Run the full local gate: `npm test`, `npm run typecheck`, `npx expo-doctor@latest` (expect the known 19/20), `npx expo export --platform android`. Record results.
- [ ] **Step 3:** Commit `docs: state after multi-product support`.
