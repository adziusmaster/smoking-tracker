# Smoking Tracker — Design

**Date:** 2026-08-08
**Status:** Approved

## Summary

An Android app that tracks a quit-smoking attempt. It stores a quit date, cigarette
price and daily consumption, then derives everything else from those facts plus the
clock: time smoke-free, money saved, cigarettes not smoked, which bodily recovery
milestones have been reached, which is in progress, and what to expect next. Recovery
milestones and coping guidance are presented as a single scrollable, phase-chaptered
timeline anchored on the user's current position.

Slips and relapses are first-class. The app models what a cigarette actually undoes —
which is much less than most quit apps claim — and responds to a slip with an
evidence-based intervention rather than a fabricated penalty.

## Goals

- Answer "how long have I gone?" and "what is happening in my body right now?" instantly, offline.
- Explain *why the user feels the way they feel* at their current stage, and what to do about it.
- Record slips and relapses honestly, adjusting only the figures that genuinely change.
- Intervene during the measured window of highest relapse risk.
- Ship to Google Play as a real product.

## Non-goals

- No user accounts, no cloud storage, no analytics, no ads, no social features in v1.
- No iOS build in v1 (Expo keeps the door open; it is not a v1 target).
- No tracking of vaping, NRT, or other nicotine sources — cigarettes only.
- Not a medical device and not medical advice. The app carries a disclaimer and links to real cessation services.

## Key decisions

### Local-first, no backend in v1

The app runs entirely on the device. SQLite is the source of truth; there are no
network calls at runtime.

Three reasons, in order of weight:

1. **Offline is a correctness requirement, not a nicety.** The app is opened in the
   moment someone is deciding whether to buy a pack. That happens in basements, on
   trains, and abroad with roaming off. A timeline that needs a server fails precisely
   when it matters most.
2. **Storing health data off-device makes the operator a GDPR data controller** over a
   special category of personal data, in the EU. "Collects nothing, never leaves your
   device" is both a cheaper Play submission and a genuine selling point for a
   quit-smoking app.
3. The data is four settings and a short event log. It does not need a database server.

Cloud backup is deferred to phase 2 (see below) rather than dropped, because a user who
loses their phone loses a 240-day streak, and that is a real product concern.

### Expo / React Native, not a wrapped web app

Play Store distributes an Android App Bundle that runs on the device; a Docker container
or Postgres instance cannot be shipped to it. Expo with EAS Build produces the `.aab`
directly. Native was chosen over a Capacitor or PWA wrapper primarily for **local
notifications**, which carry the danger-window intervention and are awkward and
unreliable in a webview.

### Milestone and tip content is static data in the bundle

Not database rows and not fetched at runtime. The content never changes, must work
offline, and benefits from being version-controlled, diff-reviewable and unit-testable.

### This project does not follow the repository's .NET standards

The global C#/hexagonal/xUnit standards do not apply to a TypeScript project. A
`smoking-tracker/CLAUDE.md` establishes the equivalents: strict TypeScript with `any`
banned, Vitest, the same `Method_StateUnderTest_ExpectedBehavior` test naming, the same
strict AAA structure, and a domain-purity rule (see Architecture). The phase-2 sync
service is C# and *does* follow the global standards.

## Architecture

```
smoking-tracker/
  app/                    # Expo Router screens — thin, presentational
  src/
    domain/               # PURE. No React, no SQLite, no I/O, no Date.now()
      elapsed.ts
      savings.ts
      milestones.ts       # milestone state resolution
      phases.ts           # phase resolution + danger window
      slips.ts            # anchor calculation
      types.ts
    content/              # STATIC data, no logic
      milestones.ts
      phases.ts
      sources.ts
    data/                 # SQLite repositories — the only module that touches storage
    notifications/        # expo-notifications scheduling
  docs/
```

**The domain-purity rule:** every module in `src/domain/` is a pure function of its
arguments. `now` is always passed in, never read from the system clock. Nothing in
`domain/` may import from `data/`, `app/`, or React. This is what makes an app whose
entire output is a function of time trivially testable — a test sets `now` to day 43,
adds a slip on day 40, and asserts the exact resulting state.

Data flows one way: `data/` loads stored facts → `domain/` computes a view model from
those facts plus `now` → `app/` renders it. Screens contain no arithmetic.

## Data model (SQLite)

**`settings`** — single row.
`quit_date` (ISO 8601 with offset), `cigarettes_per_day`, `cigarettes_per_pack`
(default 20), `pack_price` (integer minor units), `currency` (default EUR),
`timezone`, `created_at`, `updated_at`.

**`slips`** — a lapse that did not become a return to smoking.
`id`, `occurred_at`, `cigarette_count`, `trigger` (nullable enum: alcohol, stress,
social, boredom, routine, other), `note` (nullable), `created_at`.

**`smoking_periods`** — a full relapse with a start and, once recovered, an end.
`id`, `started_at`, `ended_at` (nullable — null means currently smoking),
`average_cigarettes_per_day`, `note`, `created_at`.

**`milestone_events`** — which milestone was reached when.
`id`, `milestone_id`, `reached_at`, `notified_at` (nullable).
Persisted so notifications never re-fire and the timeline shows real dates.

**`craving_checkins`** — the daily log.
`id`, `logged_on` (date, unique), `craving_intensity` (1–5), `mood` (1–5), `note`.

Storing *events* rather than computed counters means the entire display is derived.
Correcting a mistyped quit date recomputes everything instead of leaving stale numbers.

## Derived values

Let `elapsed_days = now − quit_date` (the *original* quit date, not either anchor), and

```
avoided = (cigarettes_per_day × elapsed_days)
          − Σ slip cigarette counts
          − Σ (relapse period duration in days × that period's average per day)
```

Counting from the original quit date rather than an anchor is deliberate: cigarettes
avoided and money saved are lifetime totals and should never fall to zero because of a
slip. A slip subtracts exactly the cigarettes smoked, nothing more. `avoided` is clamped
at zero.

| Value | Formula |
| --- | --- |
| Time smoke-free | `now − effective anchor`, rendered as days + hours |
| Cigarettes not smoked | `avoided` |
| Money saved | `avoided ÷ cigarettes_per_pack × pack_price` |
| Time not lost | `avoided × 20 minutes` |
| Lifetime cigarette total | user-supplied baseline + all logged slips and relapse cigarettes |

**Time not lost** uses the current best estimate of ~20 minutes of life expectancy per
cigarette (Jackson et al., *Addiction*, 2025), superseding the 11-minute BMJ 2000
figure. It is labelled in-app as a population-average estimate, not a personal
prediction, and phrased as *time not lost* rather than *life regained*, because that is
what the underlying study measures.

## Milestone content model

Each milestone record carries:
`id`, `title`, `body`, `offset` (duration from anchor; null only when `slipBehavior` is
`qualitative`), `offsetEnd` (nullable, for ranged milestones such as "1–12 months"),
`slipBehavior`, `sourceId`.

A `qualitative` milestone has no offset and therefore no position on the timeline. It
renders inside its phase chapter as narrative rather than as a dated node.

`slipBehavior` is the field that makes the setback model honest:

- **`restarts`** — the clock genuinely restarts from the last cigarette, because the
  underlying physiological measure does.
- **`cumulative`** — driven by total lifetime exposure; a single slip does not move it.
  Only a sustained smoking period interrupts it.
- **`qualitative`** — described in words, given no number and no progress bar, because
  the research does not support one.

### Milestone set

| Milestone | Offset | slipBehavior | Source |
| --- | --- | --- | --- |
| Heart rate drops toward normal | 20 min | restarts | ACS |
| Blood carbon monoxide returns to normal | 24 h | restarts | ACS; CO half-life 4–5 h |
| Nicotine fully cleared from bloodstream | 3 days | restarts | ACS; nicotine t½ ~2 h, cotinine ~16–20 h |
| Withdrawal peak passed | 3 days | restarts | withdrawal peaks ~day 3 |
| Taste, smell and energy improve | 2 weeks | cumulative | general (tier B) |
| Coughing and breathlessness decrease | 1–12 months | cumulative | ACS |
| Heart attack risk drops sharply | 1–2 years | cumulative | ACS |
| Mouth, throat and larynx cancer risk halves; stroke risk falls | 5–10 years | cumulative | ACS |
| Lung cancer risk about half that of a smoker | 10 years | cumulative | ACS |
| Coronary heart disease risk close to a non-smoker's | 15 years | cumulative | ACS |
| Several cancer risks close to a non-smoker's | 20 years | cumulative | ACS |
| Craving intensity and receptor adaptation | — | qualitative | PET evidence of upregulation; no reliable normalisation timeline |

**Deliberately excluded.** Two claims that appear in almost every quit-smoking timeline
online — "48 hours: nerve endings start to regrow" and "72 hours: bronchial tubes relax
and lung capacity increases" — are absent from the American Cancer Society and CDC
timelines and could not be traced to a primary source. They are excluded rather than
included with a caveat. Milestones sourced only to general health-media articles are
tagged tier B and phrased more tentatively than the ACS-sourced ones.

Every milestone is attributable. `sources.ts` holds the citations, and the timeline
exposes them, because an app that tells someone what is happening inside their body
should be able to say who says so.

## Anchor resolution

Two anchors are computed, and each milestone reads the one matching its `slipBehavior`:

- **Fast anchor** (for `restarts`): the most recent nicotine intake — the latest of all
  slip timestamps and relapse period ends. Falls back to `quit_date`.
- **Cumulative anchor** (for `cumulative`): the end of the most recent completed
  relapse period, else `quit_date`. Slips do not move it.

The cumulative anchor moves to the *end* of a relapse period because every
risk-reduction figure in the literature is measured from sustained cessation. The
original quit date is always retained, so the app can show "you reached 84 days once" —
evidence the user can do it, not evidence they failed.

## Slip and relapse model

**A slip** (smoked a few cigarettes, still quit) restarts the fast clocks from that
timestamp and leaves the cumulative clocks running. Its real cost is shown exactly:
those cigarettes come off `avoided`, and their pro-rata cost comes off money saved.
Arithmetic, not moralising.

**A relapse** is a `smoking_periods` row. While `ended_at` is null the app is in a
distinct "currently smoking" state that shows the previous best streak and offers a
one-tap restart rather than counters.

**The danger window.** After any slip the app enters a 19-day elevated-risk state,
because a single lapse is the strongest predictor of full relapse and the measured
average lapse-to-relapse transition is about 19 days. In this state the timeline marks
the window, tip content switches to relapse-prevention specifically rather than general
withdrawal advice, and check-in notifications become more frequent. This is the
best-evidenced intervention in the app and the part most competitors omit.

**Hard constraint — no fabricated setbacks.** The app must never display an invented
"days of healing lost" figure. Where the science supports a reset, it resets precisely
and says so plainly. Where it does not, the app states that healing continued, because
it did. Lying to someone who has just slipped is how a slip becomes a relapse. The
honest weight is carried by the lifetime cigarette counter instead: *"that slip added 4
to your lifetime total of 43,800."* True, sobering, not punitive.

## Phases

Five phases, each carrying `whatsHappening`, `whyYouFeelThisWay`, and `howToCope[]`.

| Phase | Range | Character |
| --- | --- | --- |
| The Crash | 0–72 h | Nicotine clearing. Irritability, headache, mood swings; cravings peak around day 3. Coping: the 4 Ds (delay, deep breathe, drink water, distract), avoid alcohol and trigger settings, know that this is the worst it gets. |
| The Fog | day 3 – week 4 | Physical withdrawal fading; sleep disruption, appetite change, poor concentration dominate. Withdrawal insomnia typically resolves in 1–2 weeks; symptoms fade over 3–4 weeks. Coping: sleep routine, no late caffeine, exercise, hydration. |
| Consolidation | month 1–6 | Chemistry is done; cravings are now situational and cue-driven, lasting 3–5 minutes whether fed or not. The risk is complacency — "I could handle just one now" is a symptom, not a plan. |
| The Long Haul | year 1–5 | Identity has shifted. Ambush cravings tied to stress, grief and alcohol remain possible. |
| Non-Smoker | 10 years+ | Statistically close to someone who never smoked on several major risks. |

The danger-window tip set overlays and overrides the current phase's tips while active.

## Screens

1. **Onboarding** — quit date (defaults to now, backdating allowed), cigarettes per day,
   pack price and currency, cigarettes per pack, optional lifetime baseline. Explains up
   front that nothing leaves the device.
2. **Timeline** (home) — now-anchored and phase-chaptered, one continuous scroll. Opens
   at the user's current phase: past chapters collapsed to one-line receipts with the
   dates they were hit, the active milestone expanded with a progress bar, future
   chapters dimmed with projected dates. The hero shows time smoke-free, money saved,
   cigarettes avoided and time not lost. Each chapter carries its own "why you feel this
   way" and "how to cope" content, so the tips live where they are relevant instead of
   on a separate screen.
3. **Craving SOS** — reachable from anywhere. Runs a timed intervention built on the
   fact that a craving peaks and passes in 3–5 minutes: a countdown, one coping action
   at a time, and an honest exit that records either "it passed" or a slip. No shaming
   on the slip path.
4. **Log** — record a slip (count, trigger, note) or start/end a smoking period; daily
   craving and mood check-in; a chart of craving intensity over time with trigger
   breakdown.
5. **Settings** — edit every input, notification preferences, export all data as JSON,
   delete everything, sources and citations, medical disclaimer, and links to real
   cessation services.

## Notifications

Local only, via `expo-notifications`. Milestone-reached alerts (deduplicated through
`milestone_events.notified_at`), a daily check-in prompt at a user-chosen time, and
increased-frequency supportive check-ins during an active danger window. All
individually switchable, and the app is fully usable with every one of them off.

## Play Store compliance

- **Data Safety:** declares no collection and no sharing. This must stay true in v1.
- **Privacy policy:** required by Play for all apps regardless of collection. A static
  page hosted alongside lead-engine on Hetzner.
- **Content rating** questionnaire completed; the app concerns smoking cessation, not
  tobacco promotion.
- **Health claims:** every physiological statement is attributable to a cited source,
  which is what keeps the app clear of misleading-health-claim policy.
- **Release path:** confirm whether the existing developer account is subject to the
  12-testers-for-14-days closed-testing requirement (personal accounts created after
  13 November 2023) or exempt (organisation accounts and older personal accounts). This
  determines whether "finished" and "published" are two weeks apart.

## Testing

Vitest for the domain and content, React Native Testing Library for screens. Strict
AAA with `// Arrange` / `// Act` / `// Assert`, and
`function_stateUnderTest_expectedBehavior` naming.

The domain layer carries the weight, and its purity makes the interesting cases cheap:

- Milestone state at a fixed `now` for each `slipBehavior`, including exactly on a boundary.
- A slip resets the fast anchor and leaves the cumulative anchor untouched.
- A completed relapse period moves the cumulative anchor to its end date.
- An open relapse period produces the currently-smoking state.
- Danger window active on day 18 after a slip, inactive on day 20.
- `avoided` never goes negative, even with absurd slip counts or a backdated quit date.
- Money and time-not-lost arithmetic in integer minor units, no floating-point drift.
- DST transitions and a timezone change do not shift day counts.

Content data gets a schema test: every milestone has a valid `slipBehavior` and a
`sourceId` that resolves, and every phase covers a contiguous range with no gaps.

## Phase 2 — cloud backup (separate spec)

An ASP.NET Core minimal-API container deployed beside lead-engine on Hetzner, providing
opt-in, pseudonymous backup and restore. The device stays the source of truth and the
app stays fully functional with the feature off. It follows the repository's .NET
standards. Bringing it in requires a privacy policy update, a revised Data Safety
declaration covering health data, a lawful basis, and a deletion path — which is exactly
why it is not in v1.

## Sources

- American Cancer Society — Health Benefits of Quitting Smoking Over Time: https://www.cancer.org/cancer/risk-prevention/tobacco/benefits-of-quitting-smoking-over-time.html
- Jackson et al., "The price of a cigarette: 20 minutes of life?", *Addiction*, 2025: https://onlinelibrary.wiley.com/doi/10.1111/add.16757
- Shaw, Mitchell & Dorling, "Time for a smoke? One cigarette reduces your life by 11 minutes", *BMJ*, 2000 (superseded): https://pubmed.ncbi.nlm.nih.gov/10617536/
- NHS — Getting back on track after a smoking relapse: https://www.nhs.uk/better-health/quit-smoking/staying-smoke-free/get-back-on-track-after-a-smoking-relapse/
- Cleveland Clinic — Nicotine Withdrawal: https://my.clevelandclinic.org/health/diseases/21587-nicotine-withdrawal
- Healthline — How long does nicotine stay in your system (CO and cotinine half-lives): https://www.healthline.com/health/quit-smoking/how-long-does-nicotine-stay-in-your-system
- Cosgrove et al., "Smoking upregulates α4β2* nicotinic acetylcholine receptors in the human brain", 2007: https://pubmed.ncbi.nlm.nih.gov/17997038/
