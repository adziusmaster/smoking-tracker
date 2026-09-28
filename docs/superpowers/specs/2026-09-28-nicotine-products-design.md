# Nicotine Products — Design

**Date:** 2026-09-28
**Status:** Draft, awaiting review
**Part of:** the pre-closed-testing release. This is sub-project 1 of 6 (products → daily
engagement → insights & journal → polish & trust → widget, with Play Store assets alongside).
**Supersedes in part:** `2026-08-08-smoking-tracker-design.md` (the cigarette-only settings,
the milestone set's universal applicability, and the hero figures) and
`2026-08-10-onboarding-inputs-design.md` (the onboarding question set).

## Amendment — citation check (2026-09-28)

`docs/citation-check-2026-09.md` verified every source against its page. It changed the
milestone table below as follows; the code is the record, this note explains why:

- `heart-rate` is `smoked` only (ACS, 20 min). Vapers get a separate `vape-heart-rate` at 1 day
  (Hughes 2020 measured heart rate falling during abstinence). **Heated tobacco gets no heart-rate
  milestone**: the JAHA 2017 paper tested non-users for ~30 minutes and never heated tobacco, so
  `nicotine-hr-acute` was removed. The `inhaled` audience became `vape`.
- `first-week` cites Hughes 2007 (sleep problems peak in week one, fade over 2–4 weeks); the
  Jaehne paper measured only 24–36 h and 3 months.
- `snus-mucosa` cites Larsson 1991 only, at 3 months ("healthy on re-check at 3–6 months"); the
  2026 paper was a 28-day, industry-funded switching study, not cessation, and was dropped.
- `nachr` now points to Cosgrove 2009 (the old PMID was a different paper). `lapse-relapse` now
  points to Perski 2023, which states the ~19-day figure; the NHS page did not.
- Unsupported phrases removed from pre-existing copy: CO "half-life 4–5 hours", cilia/tar
  regrowth, "single biggest cardiovascular payoff", "strongest known predictor", taste and smell
  "at two weeks", insomnia "within 1–2 weeks", and `long-term-unknown`'s "not studied long
  enough" (false for snus).

## Summary

The app today assumes cigarettes. This change lets a user quit one of five products —
**cigarettes, roll-your-own, heated tobacco (IQOS, glo), vapes, and snus or tobacco-free
nicotine pouches** — and shows each of them only what the evidence supports for that product.

The honesty constraint that governs the whole app governs this too: no claim is shown to a
user it has not been shown to apply to. Where a product has no evidence for a milestone, the
milestone is absent, not stretched to fit.

## Goals

- A user who quit any of the five products gets a correct cost model, correct counters, correct
  wording, and a milestone set filtered to what applies to them.
- An ex-smoker who switched to IQOS, a vape or pouches before quitting still gets the long-term
  smoking-recovery milestones, because their cigarette history is what those milestones measure.
- Nothing shown for a non-combustible product borrows a figure measured only in smokers,
  unless labelled as an inference.
- Fill the day-4-to-month-3 gap with sourced milestones that apply to every nicotine product.

## Non-goals

- **Multiple simultaneous products.** One product per quit, plus cigarette history.
- **Cigars, pipes and shisha.** Researched and deferred: their long-term evidence supports only
  undated statements, and shisha's withdrawal milestones apply only to daily users. Adding them
  later is a content change plus one product id each.
- **Nicotine replacement therapy tracking.** NRT is a quit aid, not a product being quit.
- **A "when did you stop cigarettes" date for switchers.** See *Anchoring for switchers*.
- **Visual restyle.** Tracked as its own sub-project; this change uses the current theme.
- **Monetisation.** The app stays free with no ads, no purchases and no donation link. Play
  Billing would add a purchase record and billing libraries to an app whose core claim is that
  it cannot reach a network and collects nothing.

## Products

| Id | Shown as | Burned? | Cost model | Unit (singular / plural) | Slip count |
|---|---|---|---|---|---|
| `cigarettes` | Cigarettes | yes | pack | cigarette / cigarettes | count |
| `roll-your-own` | Roll-your-own | yes | pack (pouch of tobacco) | roll-up / roll-ups | count |
| `heated` | Heated tobacco (IQOS, glo…) | no | pack | stick / sticks | count |
| `vape` | Vape | no | weekly | vape / vapes | fixed at 1 (a session) |
| `snus` | Snus | no | pack (can) | pouch / pouches | count |
| `pouches` | Nicotine pouches | no | pack (can) | pouch / pouches | count |

Onboarding shows **five** cards: snus and tobacco-free pouches share one card ("Pouches or
snus"), followed by a single choice between them. They are separate ids in the domain because
one milestone (mouth-lining recovery) is evidenced for snus only.

**Roll-your-own is treated identically to cigarettes** for every health claim. FDA and ACS both
state hand-rolled cigarettes are no safer; Laugesen 2009 measured equal CO boost and greater
smoke intake. No quit cohort is RYO-specific, so its milestone copy is shared with cigarettes and
the source entry notes the inference from equal exposure.

## Domain model

### Settings

```ts
export type ProductId = 'cigarettes' | 'roll-your-own' | 'heated' | 'vape' | 'snus' | 'pouches';

export type CostModel =
  | { kind: 'pack'; unitsPerPack: number; packPriceMinor: number }
  | { kind: 'weekly'; weeklySpendMinor: number };

export interface Settings {
  quitDate: string;
  product: ProductId;
  unitsPerDay: number;          // cigarettes, sticks, pouches, or vape uses
  cost: CostModel;              // 'weekly' iff product === 'vape'
  currency: string;
  timezone: string;
  /**
   * Cigarette smoking history, or null if none was given.
   * For cigarettes and roll-your-own, cigarettesPerDay is unitsPerDay (derived on load, not
   * stored separately) so correcting the daily rate still corrects the lifetime estimate.
   * For every other product it is the separately answered prior rate.
   */
  cigaretteHistory: { months: number; cigarettesPerDay: number } | null;
}
```

`cigarettesPerDay` / `cigarettesPerPack` / `packPriceMinor` / `smokedForMonths` are removed from
the TypeScript type. `Slip.cigaretteCount` becomes `Slip.unitCount` and
`SmokingPeriod.averageCigarettesPerDay` becomes `averageUnitsPerDay`. Only the TypeScript names
change — see *Storage*.

### Product rules — `src/domain/products.ts`

Pure functions over `ProductId`:

- `isCombustible(product)` — true for `cigarettes`, `roll-your-own`.
- `hasSmokingHistory(settings)` — `isCombustible(product) || cigaretteHistory !== null`.
- `audienceIncludes(audience, settings)` — see *Milestone audience*.

### Savings

A single unit price, kept as a fraction so money stays integer:

| Cost model | Money for `n` units (minor) |
|---|---|
| pack | `round(n × packPriceMinor ÷ unitsPerPack)` |
| weekly | `round(n × weeklySpendMinor ÷ (7 × unitsPerDay))` |

`computeSavings` returns:

```ts
export interface Savings {
  unitsAvoided: number;
  moneySavedMinor: number;
  /** null unless the product is combustible — the 20-minute figure is measured in cigarettes. */
  minutesNotLost: number | null;
  /** Estimated cigarettes smoked in total; null when there is no cigarette history. */
  lifetimeCigarettes: number | null;
}
```

- `unitsAvoided` keeps the existing formula (would-have-used minus slips minus relapse periods,
  clamped at zero), in the product's units.
- `minutesNotLost` is `unitsAvoided × 20` for combustible products and `null` otherwise.
- `lifetimeCigarettes`:
  - combustible product: `history.months × 30.44 × unitsPerDay` plus every slip and relapse
    unit — today's behaviour.
  - non-combustible with history: `history.months × 30.44 × history.cigarettesPerDay` only.
    Slips of the current product are **not** added: they are sticks, pouches or vape sessions,
    and adding them to a cigarette total would mix units.
  - no history: `null`, and nothing is rendered.

Both lifetime figures stay labelled as estimates, as today.

## Milestone audience

Each milestone gains an `audience` and optional per-product offset overrides:

```ts
export type Audience =
  | 'all'               // every nicotine product
  | 'inhaled'           // cigarettes, roll-your-own, heated, vape
  | 'smoked'            // combustible products only
  | 'smoking-history'   // combustible product OR a non-combustible product with cigarette history
  | 'snus'              // snus only
  | 'oral'              // snus and pouches
  | 'unknown-long-term';// non-combustible AND no cigarette history

export interface Milestone {
  // ...existing fields...
  audience: Audience;
  /** Replaces offsetMs/offsetEndMs/sourceId for the listed products. */
  overrides?: Partial<Record<ProductId, { offsetMs: number; offsetEndMs: number | null; sourceId: string }>>;
}
```

`buildTimeline` filters milestones by `audienceIncludes(m.audience, settings)` and applies any
override **before** resolution, so `resolveMilestones`, notifications and `nextMilestone` see only
the applicable, correctly-offset set. Notification scheduling inherits the filter with no change
of its own.

### Anchoring for switchers

For a non-combustible product with cigarette history, `smoking-history` milestones are anchored
on the **cumulative anchor as today** — i.e. the final quit date, not the date cigarettes were
stopped. This is conservative (it can only make a milestone arrive later than it truly did), and
each such milestone shows one extra line:

> Measured in people who quit smoking. Counted from your final quit date, which is conservative
> if you stopped cigarettes earlier.

**Short-term smoke milestones are not shown to switchers.** "Carbon monoxide clears in 24 hours"
happened when they stopped cigarettes; stating it now would be false. That is why the short-term
smoke milestones use `smoked`, not `smoking-history`.

### The milestone set

`R` = restarts (fast anchor), `C` = cumulative, `Q` = qualitative. Sources marked † must be
verified against the page before release (see *Citation verification*).

| Id | Title (abridged) | Offset | Audience | Kind | Source |
|---|---|---|---|---|---|
| `heart-rate` | Heart rate drops toward normal | 20 min; **1 h** for heated, vape | `inhaled` | R | `acs`; override `nicotine-hr-acute` |
| `carbon-monoxide` | Carbon monoxide clears your blood | 24 h | `smoked` | R | `acs` |
| `nicotine-cleared` | Nicotine fully cleared | 3 d | `all` | R | `co-halflife` → replace with `benowitz-2009`† |
| `withdrawal-peak` | The withdrawal peak is behind you | 3 d | `all` | R | `withdrawal-peak`, `hughes-2020` |
| **`first-week`** | Sleep disruption is usually worst in week one | 7 d | `all` | R | `jaehne-2015` |
| **`oral-heart-rate`** | Resting heart rate typically dips this week | 7 d | `oral` | R | `af-geijerstam-2025` |
| **`two-week-window`** | Past the highest-risk window | 14 d | `all` | R | `kenford-1994`† |
| `taste-smell` | Taste, smell and energy improve | 14 d | `smoked` | C | `taste-smell` |
| **`withdrawal-fades`** | Most withdrawal symptoms have faded | 14–28 d | `all` | R | `hughes-2007`, `nhs-withdrawal` |
| **`cravings-rarer`** | Cravings usually come far less often | 28–42 d | `all` | R | `hse-cravings` |
| **`snus-mucosa`** | The lining where you held snus is healing | 6 wk | `snus` | R | `snus-lesions-2026`, `larsson-1991`† |
| **`mood-lifts`** | Mood, anxiety and stress are better than if you had kept going | 6 wk | `all` | C | `taylor-2021` |
| **`appetite`** | Appetite changes settle | 1–3 mo | `all` | C | `aubin-2012` |
| `craving-adaptation` | Craving intensity and receptor adaptation | — | `all` | Q | `nachr` |
| `cough-breathlessness` | Coughing and breathlessness decrease | 1–12 mo | `smoked` | C | `acs` |
| `heart-attack-risk` | Heart attack risk drops sharply | 1–2 y | `smoking-history` | C | `acs` |
| `oral-cancer-stroke` | Mouth, throat and larynx cancer risk halves | 5–10 y | `smoking-history` | C | `acs` |
| `lung-cancer-halved` | Lung cancer risk about half a smoker's | 10 y | `smoking-history` | C | `acs` |
| `chd-nonsmoker` | Coronary heart disease risk close to a non-smoker's | 15 y | `smoking-history` | C | `acs` |
| `multi-cancer-nonsmoker` | Several cancer risks close to a non-smoker's | 20 y | `smoking-history` | C | `acs` |
| **`long-term-unknown`** | Long-term effects are not yet known | — | `unknown-long-term` | Q | `who-htp-2020`, `cochrane-ecig-2025`, `fda-zyn-mrtp` |

**Copy rules for the new milestones:**

- `withdrawal-peak`, `withdrawal-fades`, `cravings-rarer` say, for heated/snus/pouches, that the
  timeline is measured in smokers and vapers and inferred for this product from how nicotine
  works. Implemented as one sentence in the body, not per-product copy.
- `oral-heart-rate` says "this week" and does not promise permanence: the same study found it
  drifted back toward baseline by week 8.
- `snus-mucosa`: "often heals within weeks; studies found normal tissue by 3–6 months." Never
  says gums recover — recession is structural.
- `appetite` is a neutral heads-up, not a benefit: most weight change happens in the first three
  months, with wide individual variation. No kilogram figure in the title.
- `mood-lifts` states it is measured in people who quit smoking.
- `long-term-unknown` states plainly that no health authority publishes a recovery timeline for
  this product, and that stopping removes the ongoing exposure. For snus and pouches it may quote
  the FDA's comparative claim only as "compared with smoking", never as a benefit of quitting.

**Excluded, with reasons kept in the source file header:**
CO milestones for heated, vape, snus and pouches (their CO is already at environmental level);
any dated cancer or heart milestone for non-combustible products without history; lung, cilia
and taste recovery for non-combustible products; "blood pressure improves" for oral products
(af Geijerstam 2025 measured a small rise); "gums grow back"; pancreatic-cancer claims for snus
in either direction; "X% safer" or "95% less harmful"; "one shisha session equals 100
cigarettes".

### Coverage invariant

Every product must see at least one dated milestone in each of the first three phases (crash,
fog, consolidation). The new `all` milestones are what satisfy this for non-combustible products.

## Phase and tip copy

Phase copy that refers to smoke gets a nicotine-only variant:

- `Phase.whatsHappening` stays the smoke version; add `whatsHappeningNicotine`.
- A pure `phaseCopyFor(phase, settings)` picks the variant:
  - `crash`, `fog`, `consolidation`: smoke text iff `isCombustible`.
  - `long-haul`, `non-smoker`: smoke text iff `hasSmokingHistory`.
- The final phase is named from product content: "Non-Smoker" for combustible products,
  "Nicotine-Free" otherwise.
- `DANGER_WINDOW_TIPS.whatsHappening` gets the same variant (it names carbon monoxide).
- For snus and pouches, the crash chapter's nicotine variant carries the exposure note: a 4 mg
  pouch reaches about 90% of a cigarette's total nicotine exposure, so quitting pouches is
  quitting nicotine (Heshmati 2025).

## Product content — `src/content/products.ts`

Static data per product, no logic:

```ts
export interface ProductContent {
  id: ProductId;
  label: string;                 // card title
  hint: string;                  // card subtitle
  unit: { one: string; many: string };
  freeWord: 'smoke-free' | 'nicotine-free';
  avoidedLabel: string;          // hero tile: "not smoked", "sticks not used", "vapes skipped"
  slipVerb: string;              // "I smoked", "I used IQOS", "I vaped", "I used a pouch"
  finalPhaseName: string;
}
```

Content strings that mention the product (`sos.ts` "what a cigarette was doing", slip hints)
use `{unit}` / `{units}` tokens, filled by a pure `fillProductTokens(text, product)` in
`src/domain/`. Screens never branch on product id; they render what the domain returns.

## Screens

### Onboarding

1. **What are you quitting?** Five cards. Choosing "Pouches or snus" shows one follow-up choice:
   snus (tobacco) or tobacco-free pouches.
2. **Usage and cost**, per cost model:
   - pack: `{units} per day`, `{units} per pack` (defaults: 20 cigarettes, 20 sticks, 20 pouches;
     roll-your-own has no default and asks "roll-ups per pouch of tobacco"), pack price.
   - weekly (vape): spend per week, and "how often" as three chips that fill an editable number —
     *a few times a day* (5), *about every hour* (15), *constantly* (30).
3. **History.**
   - Combustible: "How long did you smoke?" (years and months, as today).
   - Otherwise: "Did you smoke cigarettes before?" Yes → years, months and cigarettes per day.
     No → `cigaretteHistory = null`. "Skip" is equivalent to No.
4. **Quit moment** — unchanged `QuitMomentPicker`.

The existing "nothing leaves your device" line stays on step 1.

### Timeline (home)

- Headline: "43 days, 0 hours" + product `freeWord`.
- Hero tiles: money saved, units avoided (with `avoidedLabel`), and time not lost **only when
  non-null**. Two tiles is an acceptable layout; the tile row does not reserve an empty slot.
- Milestone nodes for `smoking-history` milestones shown to a switcher carry the conservative-
  anchoring line.

### Slip logging (`log.tsx`, `sos.tsx`)

- Vape: no count field; a slip is one session.
- Other products: count field labelled with the unit.
- The slip confirmation's lifetime sentence renders only when `lifetimeCigarettes` is non-null
  **and** the product is combustible (for a switcher, a vape slip does not change a cigarette
  total, so the sentence would be misleading).
- This change also extracts the slip-logging code duplicated between the two screens into
  one helper, since both are being edited anyway (listed in `STATE.md` known items).

### Settings

- **Product** can be changed. Changing it swaps the usage/cost fields to the new product's
  shape and requires them before saving. Slips and periods are kept; their counts are reinterpreted
  in the new unit, and the screen says so before saving.
- Usage, cost and cigarette history become editable (they were onboarding-only). This resolves the
  known "not editable after onboarding" gap for these inputs; currency and timezone stay fixed.
- The years input gains an upper bound of 80 (a `STATE.md` known item).

## Storage

Migration **v3**, additive only:

```sql
ALTER TABLE settings ADD COLUMN product TEXT NOT NULL DEFAULT 'cigarettes'
  CHECK (product IN ('cigarettes','roll-your-own','heated','vape','snus','pouches'));
ALTER TABLE settings ADD COLUMN weekly_spend_minor INTEGER NULL CHECK (weekly_spend_minor >= 0);
ALTER TABLE settings ADD COLUMN prior_cigarettes_per_day INTEGER NULL
  CHECK (prior_cigarettes_per_day > 0);
```

- Columns are **not renamed.** `cigarettes_per_day` stores units per day, `slips.cigarette_count`
  stores units, `smoking_periods.average_cigarettes_per_day` stores units per day. Renaming a
  column in SQLite means rebuilding the table, which buys only tidiness. The mapping lives in
  `repositories.ts` with a comment at each column.
- `smoked_for_months` stores **cigarette** smoking months for every product (for combustible
  products that is the current product's history, as today).
- For `vape`, the pack columns hold placeholders that satisfy their existing CHECKs
  (`cigarettes_per_pack = 1`, `pack_price_minor = 0`) and are ignored on load. The repository is
  the only place this is known.
- `cigaretteHistory` is loaded as: combustible → `{ months: smoked_for_months, cigarettesPerDay:
  cigarettes_per_day }` when `smoked_for_months > 0`, else null; non-combustible →
  `{ months, cigarettesPerDay: prior_cigarettes_per_day }` when both are present, else null.
- `exportAll` includes the new columns.

There are zero installs, so no data migration is needed beyond the column defaults, which make
any pre-existing row a cigarettes row with unchanged behaviour.

## New sources

Added to `src/content/sources.ts`, tier in brackets. † = cited from memory or a search snippet
and must be verified before release.

| Id | Source | Tier |
|---|---|---|
| `benowitz-2009` | Benowitz et al., Nicotine chemistry, metabolism, kinetics — Handb Exp Pharmacol 2009 † | a |
| `hughes-2007` | Hughes, Effects of abstinence from tobacco: valid symptoms and time course — NTR 2007 | a |
| `hughes-2020` | Hughes et al., Withdrawal symptoms from e-cigarette abstinence — NTR 2020 | a |
| `nhs-withdrawal` | NHS — Managing nicotine withdrawal symptoms | a |
| `jaehne-2015` | Jaehne et al., Sleep changes in smokers before, during and after cessation — Addict Biol 2015 | a |
| `kenford-1994` | Kenford et al., Predicting smoking cessation — JAMA 1994 † | a |
| `hse-cravings` | HSE Ireland — Cravings and withdrawal | a |
| `taylor-2021` | Taylor et al., Smoking cessation for improving mental health — Cochrane 2021 | a |
| `aubin-2012` | Aubin et al., Weight gain in smokers after quitting — BMJ 2012 | a |
| `nicotine-hr-acute` | Acute heart-rate effects of nicotine e-cigarettes — JAHA 2017 | a |
| `af-geijerstam-2025` | af Geijerstam et al., Cessation of snus and nicotine pouches — Harm Reduct J 2025 | a |
| `snus-lesions-2026` | Snus-induced mucosal lesions and reversibility — Clin Oral Invest 2026 | a |
| `larsson-1991` | Larsson, Axell & Andersson, Reversibility of snuff dippers' lesions — J Oral Pathol Med 1991 † | a |
| `heshmati-2025` | Heshmati et al., Nicotine pouch pharmacokinetics meta-analysis — DAD Reports 2025 | a |
| `ryo-harm` | FDA — Roll-your-own tobacco; Laugesen et al., BMC Public Health 2009 | a |
| `who-htp-2020` | WHO — Heated tobacco products information sheet 2020 | a |
| `cochrane-ecig-2025` | Hartmann-Boyce et al., Electronic cigarettes for smoking cessation — Cochrane 2025 | a |
| `fda-zyn-mrtp` | FDA — Zyn modified-risk authorisation, 2026 | a |

URLs are those recorded in the research notes for this spec and are copied into `sources.ts`
during implementation.

### Citation verification

A dedicated implementation task, done before the release build: open every URL in
`sources.ts`, confirm it resolves, that the page supports the exact milestone wording that cites
it, and that the tier is right. Any source that fails is fixed or its milestone is removed. A
milestone is never kept on an unverified citation.

## Testing

Vitest, strict AAA, `function_stateUnderTest_expectedBehavior`.

- **`products.test.ts`** — `isCombustible` and `hasSmokingHistory` for all six ids;
  `audienceIncludes` truth table for every `Audience` × product × history.
- **`savings.test.ts`** — pack and weekly money in integer minor units; weekly with a slip;
  `minutesNotLost` null for every non-combustible product; `lifetimeCigarettes` null without
  history, history-only for a switcher (slips not added), today's value for cigarettes.
- **`timeline.test.ts`** — the heated override yields a 1 h heart-rate milestone; a vape user with
  no history sees `long-term-unknown` and no `acs` milestone; a heated user with history sees
  `heart-attack-risk` but not `carbon-monoxide`; snus sees `snus-mucosa`, pouches does not.
- **`content.test.ts`** —
  - every milestone has an `audience`; every `sourceId` and every override `sourceId` resolves;
  - coverage invariant: each product (with and without history) has ≥ 1 dated milestone in
    crash, fog and consolidation;
  - no milestone with audience `smoked` is visible to any non-combustible product, with or
    without history;
  - every product has a `ProductContent` entry and every `{unit}` token in content resolves.
- **`phases.test.ts`** — `phaseCopyFor` picks the nicotine variant for a vape user in crash, and the
  smoke variant for a heated user with history in long-haul.
- **`sql.test.ts`** (better-sqlite3) — v3 applies on a v2 database; the product CHECK rejects an
  unknown id; `weekly_spend_minor` and `prior_cigarettes_per_day` accept NULL and reject negatives;
  re-running migrations selects nothing.

## Open items for later sub-projects

- **App name.** "Smoke Free" reads oddly for a vaper or pouch user. The display name can change
  before publishing (the package name cannot). Decide in the Play Store assets sub-project.
- **Hero third tile** for non-combustible products is left empty here. The daily-engagement
  sub-project is the natural place to fill it (e.g. cravings beaten).
