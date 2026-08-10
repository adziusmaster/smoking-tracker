# Onboarding Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let someone enter the exact date and time they quit, ask how long they smoked instead of how many cigarettes they smoked, derive the lifetime total from that, and finally render it where the original spec promised.

**Architecture:** The stored quit date is already a full ISO timestamp, so change 1 is input-only. Change 2 replaces one settings column with another via migration v2 (back-filling so tester data survives) and moves the lifetime arithmetic into a pure domain function. Display is wired into the two slip-confirmation surfaces.

**Tech Stack:** Expo SDK 57, TypeScript strict, expo-sqlite, `@react-native-community/datetimepicker` (new), Vitest, better-sqlite3.

**Source spec:** `docs/superpowers/specs/2026-08-10-onboarding-inputs-design.md`

## Global Constraints

- **`src/domain/` is PURE:** no React, no `expo-*`, no `src/data/` imports, no I/O. `now: Date` is always a parameter — `Date.now()` and argless `new Date()` are forbidden there.
- **No `any`, no casts, no `!`.** strict TS with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- **TIMESTAMP INVARIANT:** every stored timestamp is `someDate.toISOString()` — UTC, ending `Z`. Never an offset-bearing string; the `smoking_periods` CHECK compares timestamps as TEXT lexicographically and is only sound under that one format.
- **The lifetime total is an ESTIMATE and must be labelled so** wherever displayed and at the point of input. The app must never present it as a count of cigarettes actually smoked. This is the same rule that forbids inventing a healing penalty.
- **`30.44`** is the mean days-per-month constant; reuse the existing convention, do not introduce a second definition of a month.
- **Money is integer minor units;** field names end in `Minor`.
- **Test naming** `function_stateUnderTest_expectedBehavior`, strict AAA with literal `// Arrange` / `// Act` / `// Assert` comments — a combined `// Arrange & Act` is permitted where a test has no distinct arrange step.
- **`lifetime_baseline` is NOT dropped** from the schema, only superseded and commented as such.
- **Never** add a `Co-Authored-By` trailer or any "Generated with Claude" line to a commit message.
- **Do not** run `git init` or change git config. Repo identity is already `adziusmaster / adzius.lech@gmail.com`.

## File Structure

| Path | Change |
| --- | --- |
| `src/domain/types.ts` | `Settings.lifetimeBaseline` → `smokedForMonths`; add `MS_PER_MONTH_AVG` |
| `src/domain/lifetime.ts` | **new** — the pre-quit estimate, pure |
| `src/domain/savings.ts` | `lifetimeTotal` now calls the new function |
| `src/domain/format.ts` | add `formatCount` for thousands grouping |
| `src/data/schema.ts` | migration v2 + superseded comment on `lifetime_baseline` |
| `src/data/queries.ts` | swap the column in `UPSERT_SETTINGS` / `SELECT_SETTINGS` |
| `src/data/repositories.ts` | row mapping for the renamed field |
| `src/ui/QuitMomentPicker.tsx` | **new** — date + time rows, shared by both screens |
| `app/onboarding.tsx` | picker replaces "days ago"; years/months replace lifetime cigarettes |
| `app/settings.tsx` | gains the quit-moment editor; shows the estimated total |
| `app/sos.tsx` | shows the estimated total on the slip path |
| `app/log.tsx` | shows the estimated total in the slip status line |

---

### Task 1: Domain — the lifetime estimate

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/domain/lifetime.ts`
- Test: `src/domain/lifetime.test.ts`
- Modify: `src/domain/savings.ts`
- Modify: `src/domain/savings.test.ts`, `src/domain/anchors.test.ts`, `src/domain/streaks.test.ts`, `src/domain/timeline.test.ts` (fixtures)

**Interfaces:**
- Consumes: `Settings`, `QuitState` from `./types`.
- Produces: `MS_PER_MONTH_AVG` (number) and `DAYS_PER_MONTH_AVG = 30.44` from `./types`; `estimateCigarettesBeforeQuitting(settings: Settings): number` from `./lifetime`.

- [ ] **Step 1: Rename the field and add the month constant in `src/domain/types.ts`**

Replace the `lifetimeBaseline` line in `Settings`:

```ts
export interface Settings {
  quitDate: string;            // always `date.toISOString()` — UTC, ending 'Z'
  cigarettesPerDay: number;
  cigarettesPerPack: number;
  packPriceMinor: number;      // integer minor units
  currency: string;            // ISO 4217
  timezone: string;            // IANA
  /**
   * How long the user smoked before quitting, in whole months. 0 if not given.
   * The lifetime cigarette total is DERIVED from this and cigarettesPerDay — see
   * src/domain/lifetime.ts — so correcting the daily rate corrects the total.
   */
  smokedForMonths: number;
}
```

And add next to the other duration constants at the bottom of the file:

```ts
/** Mean days per month. The same figure src/content/phases.ts uses for MONTHS(). */
export const DAYS_PER_MONTH_AVG = 30.44;
```

- [ ] **Step 2: Write the failing test**

`src/domain/lifetime.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { estimateCigarettesBeforeQuitting } from './lifetime';
import type { Settings } from './types';

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  quitDate: '2026-06-26T06:00:00.000Z',
  cigarettesPerDay: 15,
  cigarettesPerPack: 20,
  packPriceMinor: 1100,
  currency: 'EUR',
  timezone: 'Europe/Amsterdam',
  smokedForMonths: 0,
  ...overrides,
});

describe('estimateCigarettesBeforeQuitting', () => {
  it('estimateCigarettesBeforeQuitting_zeroMonths_returnsZero', () => {
    // Arrange
    const input = settings({ smokedForMonths: 0 });

    // Act
    const result = estimateCigarettesBeforeQuitting(input);

    // Assert
    expect(result).toBe(0);
  });

  it('estimateCigarettesBeforeQuitting_twelveYearsAtFifteenADay_returnsRoundedEstimate', () => {
    // Arrange — 144 months x 30.44 days x 15/day = 65_750.4
    const input = settings({ smokedForMonths: 144, cigarettesPerDay: 15 });

    // Act
    const result = estimateCigarettesBeforeQuitting(input);

    // Assert
    expect(result).toBe(65_750);
  });

  it('estimateCigarettesBeforeQuitting_higherDailyRate_producesHigherEstimate', () => {
    // Arrange — proves the estimate is live, not frozen at onboarding
    const light = settings({ smokedForMonths: 120, cigarettesPerDay: 5 });
    const heavy = settings({ smokedForMonths: 120, cigarettesPerDay: 25 });

    // Act
    const lightResult = estimateCigarettesBeforeQuitting(light);
    const heavyResult = estimateCigarettesBeforeQuitting(heavy);

    // Assert
    expect(heavyResult).toBe(lightResult * 5);
  });

  it('estimateCigarettesBeforeQuitting_partialMonths_returnsAWholeNumber', () => {
    // Arrange
    const input = settings({ smokedForMonths: 7, cigarettesPerDay: 13 });

    // Act
    const result = estimateCigarettesBeforeQuitting(input);

    // Assert
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npm test -- src/domain/lifetime.test.ts`
Expected: FAIL — cannot resolve `./lifetime`.

- [ ] **Step 4: Implement `src/domain/lifetime.ts`**

```ts
import { DAYS_PER_MONTH_AVG, type Settings } from './types';

/**
 * How many cigarettes the user probably smoked before quitting.
 *
 * This is an ESTIMATE and must always be presented as one. It applies the user's CURRENT
 * daily rate across their whole smoking history, which overestimates for most people —
 * almost nobody started at the rate they finished on. We ask "how long did you smoke?"
 * because that is a question people can answer; "how many cigarettes have you smoked?"
 * is not.
 */
export function estimateCigarettesBeforeQuitting(settings: Settings): number {
  const days = Math.max(0, settings.smokedForMonths) * DAYS_PER_MONTH_AVG;
  return Math.round(days * settings.cigarettesPerDay);
}
```

- [ ] **Step 5: Point `savings.ts` at it**

In `src/domain/savings.ts`, add the import:

```ts
import { estimateCigarettesBeforeQuitting } from './lifetime';
```

and replace the `lifetimeTotal` line in the returned object:

```ts
    lifetimeTotal: estimateCigarettesBeforeQuitting(settings) + Math.round(actuallySmoked),
```

- [ ] **Step 6: Update every test fixture that names the old field**

Four test files construct a `Settings`. In each, replace `lifetimeBaseline: <n>` with `smokedForMonths: <n>`:

- `src/domain/anchors.test.ts` — `lifetimeBaseline: 0` → `smokedForMonths: 0`
- `src/domain/streaks.test.ts` — `lifetimeBaseline: 0` → `smokedForMonths: 0`
- `src/domain/savings.test.ts` — `lifetimeBaseline: 43_800` → `smokedForMonths: 96`
- `src/domain/timeline.test.ts` — `lifetimeBaseline: 43_800` → `smokedForMonths: 96`

Then fix the three `lifetimeTotal` assertions in `src/domain/savings.test.ts`. With
`smokedForMonths: 96` and `cigarettesPerDay: 15`, the estimate is
`round(96 × 30.44 × 15) = 43_834`. So:

- `expect(result.lifetimeTotal).toBe(43_800)` → `toBe(43_834)`
- `expect(result.lifetimeTotal).toBe(43_803)` → `toBe(43_837)` (the 3-cigarette slip)
- `expect(result.lifetimeTotal).toBe(44_000)` → `toBe(44_034)` (the 200-cigarette relapse)

Verify each of those numbers by running the arithmetic yourself before editing — if one
disagrees, report it rather than pasting whatever the test run produced.

- [ ] **Step 7: Run the suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: all green. `npm run typecheck` will also surface `app/onboarding.tsx` still
referencing `lifetimeBaseline` — that is expected and is fixed in Task 4. If typecheck fails
ONLY on `app/` files, proceed; if it fails anywhere in `src/`, fix it here.

- [ ] **Step 8: Commit**

```bash
git add src/domain
git commit -m "feat: derive the lifetime cigarette total from months smoked"
```

---

### Task 2: Migration v2 and the queries

**Files:**
- Modify: `src/data/schema.ts`
- Modify: `src/data/queries.ts`
- Modify: `src/data/repositories.ts`
- Test: `src/data/sql.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 at runtime; the column name must match `Settings.smokedForMonths`.
- Produces: `MIGRATIONS` with a version-2 entry; `SCHEMA_VERSION === 2`; `UPSERT_SETTINGS` and `SELECT_SETTINGS` reading `smoked_for_months`.

This is the load-bearing task. It is the first time `migrateDbIfNeeded` applies a second
migration, and it will run on tester devices that already hold real data. A mistake here
silently destroys someone's quit history.

- [ ] **Step 1: Add migration v2 to `src/data/schema.ts`**

Append a second entry to the `MIGRATIONS` array, after the existing `version: 1` object:

```ts
  {
    version: 2,
    up: `
      ALTER TABLE settings ADD COLUMN smoked_for_months INTEGER NOT NULL DEFAULT 0;

      -- Invert the old derivation so an existing answer survives the change of shape:
      -- lifetime_baseline was a raw cigarette count, smoked_for_months is a duration.
      UPDATE settings
         SET smoked_for_months = CAST(
               ROUND(lifetime_baseline / (cigarettes_per_day * 30.44)) AS INTEGER)
       WHERE lifetime_baseline > 0;
    `,
  },
```

Also mark the old column superseded, in the `version: 1` DDL:

```
        lifetime_baseline    INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_baseline >= 0),
```

becomes

```
        -- Superseded by smoked_for_months (migration v2). Retained because dropping a
        -- column is destructive and buys only tidiness. Nothing reads this.
        lifetime_baseline    INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_baseline >= 0),
```

- [ ] **Step 2: Swap the column in `src/data/queries.ts`**

In `UPSERT_SETTINGS`, replace `lifetime_baseline` with `smoked_for_months` in BOTH the column
list and the `DO UPDATE SET` clause. The placeholder count stays at 9 and the order is
unchanged — `smoked_for_months` occupies the same position `lifetime_baseline` did.

In `SELECT_SETTINGS`, replace `lifetime_baseline` with `smoked_for_months`.

**Check the bind order against the placeholders after editing.** Both are strings-and-numbers
in the same position, so a transposition typechecks cleanly and corrupts data silently. Count
the `?` marks and match them to the column list literally.

- [ ] **Step 3: Update the row mapping in `src/data/repositories.ts`**

In the `SettingsRow` interface, `lifetime_baseline: number` becomes `smoked_for_months: number`.

In `loadQuitState`, `lifetimeBaseline: settingsRow.lifetime_baseline` becomes
`smokedForMonths: settingsRow.smoked_for_months`.

In `saveSettings`, the bind argument `settings.lifetimeBaseline` becomes
`settings.smokedForMonths`. It stays in the same position in the argument list.

- [ ] **Step 4: Write the migration tests**

Append to `src/data/sql.test.ts`. Note the existing `beforeEach` applies ALL migrations, so
these tests apply migrations selectively to their own database.

```ts
describe('migration v2', () => {
  it('MIGRATIONS_appliedToAV1Database_addsSmokedForMonthsAndBackfillsIt', () => {
    // Arrange — a v1 database holding a real lifetime_baseline, as a tester's would
    const old = new Database(':memory:');
    const v1 = MIGRATIONS.find((m) => m.version === 1);
    old.exec(v1?.up ?? '');
    old.prepare(
      `INSERT INTO settings (id, quit_date, cigarettes_per_day, cigarettes_per_pack,
         pack_price_minor, currency, timezone, lifetime_baseline, created_at, updated_at)
       VALUES (1, ?, 15, 20, 1100, 'EUR', 'Europe/Amsterdam', 43800, ?, ?)`,
    ).run('2026-06-26T06:00:00.000Z', NOW, NOW);

    // Act
    const v2 = MIGRATIONS.find((m) => m.version === 2);
    old.exec(v2?.up ?? '');
    const row = old.prepare('SELECT smoked_for_months, quit_date, cigarettes_per_day FROM settings WHERE id = 1')
      .get() as { smoked_for_months: number; quit_date: string; cigarettes_per_day: number };

    // Assert — 43800 / (15 x 30.44) = 95.9... rounds to 96
    expect(row.smoked_for_months).toBe(96);
    expect(row.quit_date).toBe('2026-06-26T06:00:00.000Z');
    expect(row.cigarettes_per_day).toBe(15);
  });

  it('MIGRATIONS_appliedToAV1DatabaseWithNoBaseline_leavesSmokedForMonthsZero', () => {
    // Arrange
    const old = new Database(':memory:');
    old.exec(MIGRATIONS.find((m) => m.version === 1)?.up ?? '');
    old.prepare(
      `INSERT INTO settings (id, quit_date, cigarettes_per_day, cigarettes_per_pack,
         pack_price_minor, currency, timezone, lifetime_baseline, created_at, updated_at)
       VALUES (1, ?, 15, 20, 1100, 'EUR', 'UTC', 0, ?, ?)`,
    ).run('2026-06-26T06:00:00.000Z', NOW, NOW);

    // Act
    old.exec(MIGRATIONS.find((m) => m.version === 2)?.up ?? '');
    const row = old.prepare('SELECT smoked_for_months FROM settings WHERE id = 1').get() as { smoked_for_months: number };

    // Assert
    expect(row.smoked_for_months).toBe(0);
  });

  it('SCHEMA_VERSION_afterAddingV2_isTwo', () => {
    // Arrange & Act & Assert
    expect(SCHEMA_VERSION).toBe(2);
  });

  it('MIGRATIONS_freshDatabase_hasSmokedForMonthsColumn', () => {
    // Arrange & Act — the suite's beforeEach already applied every migration
    const cols = db.prepare("SELECT name FROM pragma_table_info('settings')").all() as { name: string }[];

    // Assert
    expect(cols.map((c) => c.name)).toContain('smoked_for_months');
  });
});
```

Add `SCHEMA_VERSION` to the existing import from `./schema` at the top of the file.

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/data/sql.test.ts && npm run typecheck`
Expected: all passing. Typecheck may still fail on `app/` files — that is Task 4.

- [ ] **Step 6: Prove the migration test is not vacuous**

Temporarily change the back-fill divisor in `src/data/schema.ts` from
`(cigarettes_per_day * 30.44)` to `(cigarettes_per_day * 30)` and re-run:

Run: `npm test -- src/data/sql.test.ts`
Expected: FAIL on `MIGRATIONS_appliedToAV1Database_addsSmokedForMonthsAndBackfillsIt`
(43800 / 450 = 97.33 → 97, not 96).

Then temporarily delete the whole `UPDATE settings` statement from the v2 migration and re-run:
Expected: FAIL on the same test, with `smoked_for_months` 0 instead of 96.

Restore both, confirm green, and verify with `git diff` that neither temporary change remains
staged or committed.

- [ ] **Step 7: Commit**

```bash
git add src/data
git commit -m "feat: migration v2 replaces lifetime_baseline with smoked_for_months

Back-fills by inverting the old derivation so an existing tester's answer
survives. The old column is retained and marked superseded; dropping a column
is destructive and buys only tidiness."
```

---

### Task 3: The count formatter and the quit-moment picker

**Files:**
- Modify: `src/domain/format.ts`
- Modify: `src/domain/format.test.ts`
- Create: `src/ui/QuitMomentPicker.tsx`
- Modify: `package.json`, `package-lock.json` (new dependency)

**Interfaces:**
- Consumes: `theme` from `@/ui/theme`.
- Produces: `formatCount(value: number): string` from `@/domain/format`; and from `@/ui/QuitMomentPicker` a default-exported component with props `{ value: Date; onChange: (next: Date) => void; maximumDate?: Date }`.

- [ ] **Step 1: Install the picker**

```bash
npx expo install @react-native-community/datetimepicker
```

If npm resolution fails, this project needs `--legacy-peer-deps` — it is already set in
`.npmrc`, so the install should simply work. Do NOT delete or edit `.npmrc`: the committed
`package-lock.json` is generated under that setting, and changing it breaks `npm ci` on EAS.

After installing, run `npm ci` once to confirm the lock is still installable — that is exactly
what EAS Build runs, and a lock that `npm install` accepts but `npm ci` rejects has already
broken one build on this project.

- [ ] **Step 2: Write the failing formatter test**

Append to `src/domain/format.test.ts`:

```ts
import { formatCount } from './format';

describe('formatCount', () => {
  it('formatCount_fiveFigureNumber_groupsThousands', () => {
    // Arrange & Act
    const result = formatCount(43_834);

    // Assert
    expect(result).toBe('43,834');
  });

  it('formatCount_zero_rendersZero', () => {
    // Arrange & Act
    const result = formatCount(0);

    // Assert
    expect(result).toBe('0');
  });

  it('formatCount_underOneThousand_hasNoSeparator', () => {
    // Arrange & Act
    const result = formatCount(645);

    // Assert
    expect(result).toBe('645');
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npm test -- src/domain/format.test.ts`
Expected: FAIL — `formatCount` is not exported.

- [ ] **Step 4: Implement `formatCount` in `src/domain/format.ts`**

```ts
/**
 * A cigarette count with thousands separators. Fixed to en-GB rather than the device
 * locale so the grouping character is stable and testable — the surrounding copy is
 * English anyway.
 */
export function formatCount(value: number): string {
  return value.toLocaleString('en-GB');
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/domain/format.test.ts`
Expected: PASS.

- [ ] **Step 6: Write `src/ui/QuitMomentPicker.tsx`**

```tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from './theme';

/**
 * Two tappable rows — a date and a time — that together choose one moment. Android shows
 * these as separate dialogs, so the component holds which one is open. `value` is the
 * single source of truth; the parent owns it.
 */
export default function QuitMomentPicker(props: {
  value: Date;
  onChange: (next: Date) => void;
  maximumDate?: Date;
}) {
  const [open, setOpen] = useState<'none' | 'date' | 'time'>('none');

  const dateLabel = props.value.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  const timeLabel = props.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  /** Merge only the part the user just picked, so choosing a date cannot reset the time. */
  const applyDate = (picked: Date) => {
    const next = new Date(props.value);
    next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    props.onChange(next);
  };

  const applyTime = (picked: Date) => {
    const next = new Date(props.value);
    next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    props.onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.row} onPress={() => setOpen('date')} accessibilityRole="button">
        <Text style={styles.rowLabel}>Date</Text>
        <Text style={styles.rowValue}>{dateLabel}</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => setOpen('time')} accessibilityRole="button">
        <Text style={styles.rowLabel}>Time</Text>
        <Text style={styles.rowValue}>{timeLabel}</Text>
      </Pressable>

      {open === 'date' ? (
        <DateTimePicker
          mode="date"
          value={props.value}
          maximumDate={props.maximumDate}
          onChange={(event, picked) => {
            setOpen('none');
            if (event.type === 'set' && picked) applyDate(picked);
          }}
        />
      ) : null}

      {open === 'time' ? (
        <DateTimePicker
          mode="time"
          value={props.value}
          onChange={(event, picked) => {
            setOpen('none');
            if (event.type === 'set' && picked) applyTime(picked);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.space.md, paddingVertical: theme.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.color.border,
  },
  rowLabel: { fontSize: theme.font.small, color: theme.color.textMuted },
  rowValue: { fontSize: theme.font.body, fontWeight: '600', color: theme.color.text },
});
```

Note `event.type === 'set'`: on Android the picker fires with `dismissed` when cancelled, and
applying the value then would silently overwrite the user's choice with the default.

- [ ] **Step 7: Typecheck and bundle**

Run: `npm run typecheck && npx expo export --platform android`
Expected: typecheck clean apart from `app/` files still using `lifetimeBaseline` (Task 4);
export succeeds. Delete `dist/` afterwards.

- [ ] **Step 8: Commit**

```bash
git add src/domain/format.ts src/domain/format.test.ts src/ui/QuitMomentPicker.tsx package.json package-lock.json
git commit -m "feat: add count formatter and a reusable quit-moment picker"
```

---

### Task 4: Onboarding

**Files:**
- Modify: `app/onboarding.tsx`

**Interfaces:**
- Consumes: `QuitMomentPicker` (default export) from `@/ui/QuitMomentPicker`; `parseNonNegativeInt`, `parsePositiveInt`, `parseMinorUnits` from `@/domain/parse`; `saveSettings` from `@/data/repositories`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Replace the "days ago" field with the picker**

Remove the `daysAgo` state and its `Field`. Add:

```tsx
const [quitMoment, setQuitMoment] = useState(() => new Date());
```

and render it where the days-ago field was, above cigarettes-per-day:

```tsx
<View style={styles.field}>
  <Text style={styles.label}>When did you quit?</Text>
  <Text style={styles.hint}>Defaults to right now. Tap to change either part.</Text>
  <QuitMomentPicker value={quitMoment} onChange={setQuitMoment} maximumDate={new Date()} />
</View>
```

- [ ] **Step 2: Replace the lifetime-cigarettes field with years and months**

Remove the `baseline` state and its `Field`. Add:

```tsx
const [years, setYears] = useState('');
const [months, setMonths] = useState('');
```

and render, where the lifetime field was:

```tsx
<View style={styles.field}>
  <Text style={styles.label}>How long did you smoke? (optional)</Text>
  <Text style={styles.hint}>
    Used only for an estimated lifetime total, worked out from the daily rate above. Leave
    blank to skip.
  </Text>
  <View style={styles.duo}>
    <TextInput
      style={[styles.input, styles.duoInput]}
      value={years}
      onChangeText={setYears}
      keyboardType="number-pad"
      placeholder="years"
      accessibilityLabel="Years smoked"
    />
    <TextInput
      style={[styles.input, styles.duoInput]}
      value={months}
      onChangeText={setMonths}
      keyboardType="number-pad"
      placeholder="months"
      accessibilityLabel="Additional months smoked"
    />
  </View>
</View>
```

Add to the stylesheet:

```ts
  duo: { flexDirection: 'row', gap: theme.space.sm },
  duoInput: { flex: 1 },
```

- [ ] **Step 3: Rewrite the submit handler**

Replace the body of `submit` with:

```tsx
  const submit = async () => {
    const cigarettesPerDay = parsePositiveInt(perDay);
    const cigarettesPerPack = parsePositiveInt(perPack);
    const packPriceMinor = parseMinorUnits(price);

    if (cigarettesPerDay === null) return setError('Cigarettes per day must be a whole number above zero.');
    if (cigarettesPerPack === null) return setError('Cigarettes per pack must be a whole number above zero.');
    if (packPriceMinor === null) return setError('Pack price must look like 11 or 11.50.');

    // Blank means "not given", which is 0 — but a non-empty unreadable value is an error
    // rather than a silent zero, so a typo cannot quietly become a wrong lifetime total.
    const yearsValue = years.trim() === '' ? 0 : parseNonNegativeInt(years);
    const monthsValue = months.trim() === '' ? 0 : parseNonNegativeInt(months);
    if (yearsValue === null) return setError('Years smoked must be a whole number, or left blank.');
    if (monthsValue === null) return setError('Months smoked must be a whole number, or left blank.');

    const now = new Date();
    if (quitMoment.getTime() > now.getTime()) return setError('Your quit date cannot be in the future.');

    setError(null);
    await saveSettings(
      db,
      {
        quitDate: quitMoment.toISOString(),
        cigarettesPerDay,
        cigarettesPerPack,
        packPriceMinor,
        currency: 'EUR',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        smokedForMonths: yearsValue * 12 + monthsValue,
      },
      now,
    );

    router.replace('/');
  };
```

Keep the existing `try/catch` wrapper around the write if one is present, and its error
message — do not remove error handling that is already there.

- [ ] **Step 4: Typecheck, test, bundle**

Run: `npm run typecheck && npm test && npx expo export --platform android`
Expected: typecheck now fully clean (no `app/` errors remain), 100%+ of tests passing,
export succeeds. Delete `dist/`.

- [ ] **Step 5: Commit**

```bash
git add app/onboarding.tsx
git commit -m "feat: pick an exact quit moment and ask how long you smoked"
```

---

### Task 5: Settings, and the display the spec promised

**Files:**
- Modify: `app/settings.tsx`
- Modify: `app/sos.tsx`
- Modify: `app/log.tsx`

**Interfaces:**
- Consumes: `QuitMomentPicker`; `formatCount` from `@/domain/format`; `estimateCigarettesBeforeQuitting` from `@/domain/lifetime`; `computeSavings` from `@/domain/savings`; `useQuitState`.
- Produces: nothing.

- [ ] **Step 1: Add the quit-moment editor to Settings**

Alongside the existing `perDay` / `price` state, add:

```tsx
const [quitMoment, setQuitMoment] = useState<Date | null>(null);
```

Extend the effect that seeds the inputs from loaded state so it also seeds this:

```tsx
setQuitMoment(new Date(state.settings.quitDate));
```

Render it inside the "Your numbers" section, above cigarettes-per-day, only once state is
loaded (the section is already gated on `state`):

```tsx
<Text style={styles.label}>When you quit</Text>
{quitMoment ? (
  <QuitMomentPicker value={quitMoment} onChange={setQuitMoment} maximumDate={new Date()} />
) : null}
```

In `save`, include it in the spread override and guard the future case:

```tsx
    if (quitMoment !== null && quitMoment.getTime() > Date.now()) {
      return setStatus('Your quit date cannot be in the future.');
    }

    await saveSettings(
      db,
      {
        ...state.settings,
        cigarettesPerDay,
        packPriceMinor,
        ...(quitMoment ? { quitDate: quitMoment.toISOString() } : {}),
      },
      new Date(),
    );
```

The spread of `...state.settings` is what preserves `currency`, `timezone`,
`cigarettesPerPack` and `smokedForMonths`. Do not replace it with a freshly constructed
object — that is how a quit date gets silently wiped.

- [ ] **Step 2: Show the estimated total in Settings**

Under the save button, add a read-only line so the user can see what their duration answer
produced:

```tsx
{state ? (
  <Text style={styles.hint}>
    Estimated lifetime total: {formatCount(estimateCigarettesBeforeQuitting(state.settings))} cigarettes
    before you quit, worked out from your daily rate. An estimate, not a count.
  </Text>
) : null}
```

- [ ] **Step 3: Show the total on the SOS slip path**

In `app/sos.tsx`, the slip screen already explains which clocks restart. Below that
paragraph, add:

```tsx
{lifetimeAfterSlip !== null ? (
  <Text style={styles.body}>
    That brings your estimated lifetime total to {formatCount(lifetimeAfterSlip)}.
  </Text>
) : null}
```

Compute it from loaded state and the count the user has typed, above the return:

```tsx
const parsedCount = parseNonNegativeInt(count) ?? 1;
const lifetimeAfterSlip = state
  ? computeSavings(state, new Date()).lifetimeTotal + Math.max(1, parsedCount)
  : null;
```

This needs `useQuitState` in `app/sos.tsx`, which it does not currently use — add
`const { state } = useQuitState();`. Do NOT add a redirect on `state === null` here; this
screen is reached from a working timeline, and redirecting to onboarding can UPSERT over an
existing settings row.

- [ ] **Step 4: Show the total in the log screen's slip status**

In `app/log.tsx`, `submitSlip` sets a status message. Extend it so the number appears after
the write, when the reloaded state is available:

```tsx
      await reload();
      const refreshed = await loadQuitState(db);
      const total = refreshed ? computeSavings(refreshed, new Date()).lifetimeTotal : null;
      setStatus(
        total === null
          ? 'Slip logged. Your fast clocks restarted; the long ones did not.'
          : `Slip logged. Your fast clocks restarted; the long ones did not. That brings your estimated lifetime total to ${formatCount(total)}.`,
      );
```

Add `loadQuitState` to the existing import from `@/data/repositories`. Do not change the
first sentence — it is load-bearing copy stating the honest-setback promise.

- [ ] **Step 5: Typecheck, test, bundle**

Run: `npm run typecheck && npm test && npx expo export --platform android`
Expected: all clean; export succeeds. Delete `dist/`.

- [ ] **Step 6: Commit**

```bash
git add app/settings.tsx app/sos.tsx app/log.tsx
git commit -m "feat: edit the quit moment in Settings and show the estimated lifetime total

Wires up a figure the original spec promised after a slip but never rendered."
```

---

### Task 6: Build and verify the artifact

**Files:**
- Modify: `docs/superpowers/specs/2026-08-08-smoking-tracker-design.md` (correct the superseded onboarding/Settings description)
- Modify: `README.md` if it describes the onboarding fields

**Interfaces:**
- Consumes: everything.
- Produces: a verified AAB.

- [ ] **Step 1: Correct the superseded parts of the original spec**

The original design document describes onboarding as asking for "days ago" and an "optional
lifetime baseline", and describes `Settings` with `lifetime_baseline`. Update those passages
to match reality and add a line pointing at
`docs/superpowers/specs/2026-08-10-onboarding-inputs-design.md`. Do not rewrite the rest of
the document — it is the record of the original design.

While there, fix the known drift noted during the final review: that spec still describes
`notified_at` as the notification-suppression mechanism, which was removed before merge.

- [ ] **Step 2: Full local verification**

Run: `npm test && npm run typecheck && npx expo-doctor@latest`
Expected: all tests green, typecheck clean, 20/20 doctor checks. Delete `dist/` if present.

- [ ] **Step 3: Commit the documentation fix**

```bash
git add docs README.md
git commit -m "docs: mark the original onboarding and Settings design superseded"
```

- [ ] **Step 4: Build the AAB**

```bash
npx eas-cli@latest build --platform android --profile production --non-interactive
```

`appVersionSource` is `remote`, so `versionCode` increments automatically. Record the
resulting artifact URL.

- [ ] **Step 5: Verify the built artifact's permissions**

The picker is a native dependency, so the manifest must be re-checked. Download the AAB,
extract `base/manifest/AndroidManifest.xml`, and scan its strings — AAB manifests are
protobuf with UTF-8 strings, so scan for UTF-8, not UTF-16:

```bash
python3 - <path-to>/AndroidManifest.xml <<'PY'
import sys, re
data = open(sys.argv[1], 'rb').read()
strs = sorted({m.group().decode('utf-8','replace') for m in re.finditer(rb'[\x20-\x7e]{5,}', data)})
print("INTERNET absent?           ", not any('INTERNET' in s.upper() for s in strs))
print("SYSTEM_ALERT_WINDOW absent?", not any('SYSTEM_ALERT_WINDOW' in s for s in strs))
print("package ok?                ", any('com.adziusmaster.smokefree' in s for s in strs))
print("total strings:", len(strs))
PY
```

All three must be `True`, and `total strings` must be non-zero — a zero count means the parse
failed and the absences are meaningless rather than reassuring.

- [ ] **Step 6: Report what needs a device**

The v2 migration and the picker cannot be verified from a build artifact. State plainly in
your report that these require installing the new build **over an existing installation**
(not a clean install) to exercise the migration against real v1 data, and that the following
need a human on a phone:

- the date and time pickers open and the chosen moment is what the timeline counts from
- an existing install's quit history survives the upgrade
- the estimated lifetime total appears after logging a slip
- editing the quit date in Settings updates every figure and does not wipe other settings

---

## Self-review

**Spec coverage.** Section 1 quit date/time → Task 3 (component) and Task 4 (onboarding), with the Settings editor in Task 5. Section 2 years/months input → Task 4. Section 3 derivation → Task 1. Section 4 display → Task 5, both surfaces. Section 5 honesty constraint → the word "estimate" appears in the onboarding hint (Task 4 Step 2), the Settings line (Task 5 Step 2), and both slip messages (Task 5 Steps 3–4). Section 6 migration → Task 2, with a vacuity check. Section 7 type and query changes → Tasks 1 and 2, with the bind-order warning called out. Section 8 testing → Tasks 1, 2, 3. Section 9 release → Task 6.

**Type consistency.** `smokedForMonths` (camelCase) and `smoked_for_months` (snake_case) are used consistently on their respective sides of `repositories.ts`. `estimateCigarettesBeforeQuitting(settings)` takes a whole `Settings` in Task 1 and is called that way in Tasks 5. `formatCount(value)` is defined in Task 3 and used in Task 5. `QuitMomentPicker` is a default export with `{ value, onChange, maximumDate }` in Task 3 and consumed with exactly those props in Tasks 4 and 5.

**One thing deliberately left to the implementer.** Task 5 Step 3 reads `state` in `app/sos.tsx` for the first time. If `useQuitState` there causes a visible loading flash on a screen that must appear instantly, prefer showing the slip form without the total over delaying the screen — the craving intervention appearing fast matters more than the number.

**No placeholders.** Every code step contains runnable code; every test step contains real assertions with values derived by hand (43_834, 43_837, 44_034, 96, 65_750).

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-08-10-onboarding-inputs.md`.
