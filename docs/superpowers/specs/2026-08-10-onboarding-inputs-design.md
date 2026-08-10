# Onboarding Inputs — Design

**Date:** 2026-08-10
**Status:** Approved
**Supersedes parts of:** `2026-08-08-smoking-tracker-design.md` (onboarding fields, `Settings` shape)

## Summary

Two changes to how a quit attempt is set up, plus the display that was specified but never
built.

1. The quit date becomes an actual date **and time**, chosen with a native picker, instead of
   a "how many days ago?" number. The same editor is added to Settings.
2. The lifetime-cigarettes question is replaced by "how long did you smoke?" in years and
   months. The lifetime total is derived from that duration and the daily rate.
3. The lifetime total is rendered in the slip confirmation, which the original spec promised
   and the implementation never delivered.

## The gap this fixes

`lifetimeTotal` is computed in `src/domain/savings.ts`, typed in `TimelineViewModel`, and
covered by tests — but it is **not referenced anywhere in `app/` or `src/ui/`**. Onboarding
collects `lifetimeBaseline`, stores it, and no screen ever shows the result. The original
spec argued the counter should carry the honest weight after a slip (*"that slip added 4 to
your lifetime total of 43,800"*); that display was never wired up, so the field has been
collecting an unused number since Task 12.

Replacing the input without wiring the output would have polished a dead end. Hence the
third change.

## Goals

- Let someone say exactly when they quit, to the hour, without arithmetic.
- Ask a question people can actually answer about their smoking history.
- Show the derived total where it does useful work.
- Preserve existing tester data through the schema change.

## Non-goals

- No change to the honest-setback model, anchors, milestones, phases, or notifications.
- No new stats on the timeline hero.
- `lifetime_baseline` is not dropped from the schema, only superseded.
- No attempt to model a smoking rate that varied over time (see Honesty constraint).

## 1. Quit date and time

The single "How many days ago did you quit?" field is replaced by two tappable rows showing
the current selection, each opening a native picker via
`@react-native-community/datetimepicker`:

- **Date** — `mode="date"`, `maximumDate` = now.
- **Time** — `mode="time"`.

Both default to the current date and time, so someone quitting right now taps through
without editing anything. `maximumDate` makes a future quit date unreachable rather than
merely clamped downstream by `elapsedSince`.

**Storage is unchanged.** `Settings.quitDate` is already a full ISO 8601 timestamp written as
`.toISOString()`. Only the input changes. The TIMESTAMP INVARIANT documented in
`src/data/repositories.ts` continues to hold: every stored timestamp is UTC, ending `Z`.

**Settings gains the same editor.** Today Settings edits only cigarettes-per-day and pack
price, though the original spec claims it edits every input. Every figure in the app derives
from the quit date, making it the most damaging possible typo, and the picker component
already exists once this task is done. The Settings save path already spreads
`...state.settings` and overrides named fields, so adding `quitDate` to that override is
safe and cannot clobber the rest of the row.

## 2. How long you smoked

Onboarding asks for **years** and **months** as two numeric fields, replacing the optional
lifetime-cigarettes question. Both default to empty and are treated as 0 when blank, so the
field remains skippable.

The two inputs are combined into a single stored value:

```
smokedForMonths = (years × 12) + months
```

Months are **not** capped at 11. Someone who types 18 months gets 18, and the arithmetic is
identical to 1 year 6 months — there is no reason to reject an answer whose meaning is
unambiguous. Both fields reject anything that is not a non-negative whole number, reusing
`parsePositiveInt` / `parseNonNegativeInt` from `src/domain/parse.ts`.

## 3. Derivation

A new pure function in `src/domain/` computes the pre-quit estimate:

```
lifetimeBefore = round(smokedForMonths × 30.44 × cigarettesPerDay)
lifetimeTotal  = lifetimeBefore + Σ slip cigarettes + Σ relapse-period cigarettes
```

`30.44` is the mean days-per-month constant already used by `src/content/phases.ts` and
`src/content/milestones.ts`; reusing it keeps one definition of a month in the codebase.

`computeSavings` currently reads `settings.lifetimeBaseline` directly. It changes to call the
new function, so the derivation lives in one place and `savings.ts` keeps its single
responsibility.

## 4. Display

The total appears in the **slip confirmation only**:

- `app/sos.tsx`, on the slip-logging path.
- `app/log.tsx`, in the status line after a slip is logged.

Wording: *"That brings your estimated lifetime total to 43,803."*

The figure is thousands-grouped. `src/domain/format.ts` has no plain-integer formatter today,
so one is added there alongside the existing formatters — pure, tested, and reused by both
screens rather than each calling `toLocaleString` with its own options.

It is deliberately **not** added to the timeline hero, which already carries three stats;
a fourth crowds the most-read element in the app.

## 5. Honesty constraint

Multiplying the *current* daily rate across an entire smoking history **overestimates** for
most people, who smoked less when they started. The number is therefore an estimate, and
this is a hard requirement rather than a copy preference:

- The word **"estimated"** appears wherever the total is displayed.
- The onboarding field says the total is an estimate based on the daily rate given.
- The app must not present the figure as a count of cigarettes actually smoked.

This exists for the same reason the app refuses to invent a healing penalty: a derived number
presented as a measured one is the failure mode this product is built to avoid.

## 6. Schema — migration v2

`MIGRATIONS` gains a second entry. This is the first time the runner in `src/data/db.ts` will
apply a migration to an existing database, and it will do so on tester devices that already
hold real data, so it must add and back-fill without loss.

```sql
ALTER TABLE settings ADD COLUMN smoked_for_months INTEGER NOT NULL DEFAULT 0;

UPDATE settings
   SET smoked_for_months = CAST(
         ROUND(lifetime_baseline / (cigarettes_per_day * 30.44)) AS INTEGER)
 WHERE lifetime_baseline > 0;
```

The back-fill inverts the derivation so an existing tester's answer survives in the new
shape. `lifetime_baseline` is left in place and commented as superseded — dropping a column
is a destructive change that buys only tidiness.

`SCHEMA_VERSION` becomes 2. `migrateDbIfNeeded` already applies only migrations with
`version > user_version` and is idempotent, so a fresh install runs v1 then v2, and an
existing v1 database runs only v2.

## 7. Type and query changes

- `Settings.lifetimeBaseline: number` → `Settings.smokedForMonths: number`.
- `UPSERT_SETTINGS` and `SELECT_SETTINGS` swap `lifetime_baseline` for `smoked_for_months`.
  Bind order must be re-checked against the placeholder order — this is the mistake class
  that typechecks cleanly and corrupts data silently.
- `repositories.ts` row mapping updated for the renamed column.
- Test fixtures across `src/domain/*.test.ts` updated from `lifetimeBaseline` to
  `smokedForMonths`.

## 8. Testing

**Domain.** The new estimate function: zero months returns zero; a whole number of years
produces the expected count; changing `cigarettesPerDay` changes the result (proving the
derivation is live rather than frozen at onboarding); the result is a non-negative integer.

**Savings.** `lifetimeTotal` still adds slip and relapse cigarettes on top of the estimate,
and still accrues past the point where `cigarettesAvoided` clamps at zero.

**SQL, via better-sqlite3.** Apply v1, insert a settings row with a `lifetime_baseline`, then
apply v2 and assert: the column exists; the back-fill arithmetic is correct; and the
pre-existing row's other fields are untouched. This is the load-bearing test — it is the only
thing standing between a tester's data and a silent loss.

**Migration selection.** Idempotence is a property of the *selection*, not of the SQL: v2's
`ALTER TABLE` throws `duplicate column name` if replayed. `migrateDbIfNeeded` therefore cannot
be re-run safely on its own, and `db.ts` cannot be loaded under Vitest at all because
`expo-sqlite` is native. The rule is instead extracted into a pure exported helper,
`migrationsToApply(current)` in `src/data/schema.ts`, which `db.ts` calls; tests cover it
directly: from 0 it selects v1 then v2 in ascending order, from 1 only v2, and from
`SCHEMA_VERSION` it selects nothing — applied against a real in-memory database, leaving both
schema and data byte-identical. A companion test replays v2 with the guard bypassed and asserts
the `duplicate column name` failure, so the guard is demonstrably load-bearing rather than
decorative.

Because that failure mode would be a permanent, unrecoverable launch failure if the version
bump were ever lost, `migrateDbIfNeeded` runs the selected migrations *and* the
`PRAGMA user_version` bump inside one `db.withTransactionAsync`, so a database can never be
left with the new column and an old `user_version`. `PRAGMA foreign_keys = ON` stays outside
the transaction — it is connection-level. That wiring rests on code review, not on a test.

**Screens** are not unit-tested, per the standing decision that React Native cannot load
under Vitest. Verification is `npm run typecheck`, the full suite, a successful
`npx expo export --platform android`, and an on-device pass.

## 9. Release considerations

- `@react-native-community/datetimepicker` is a native dependency, so this requires a new
  EAS build; a JS-only update would not pick it up.
- The permission list must be re-verified after the build. The picker should add nothing, but
  "should" is not evidence, and the `INTERNET` and `SYSTEM_ALERT_WINDOW` blocks must both
  still hold.
- Install the new build over an existing one rather than a clean install, to exercise the v2
  migration against real v1 data.
