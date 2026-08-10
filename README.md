# Smoke Free

A local-first, offline quit-smoking tracker for Android, built with Expo SDK 57 and
`expo-router`. It tracks how long you have gone without a cigarette, what that is doing
to your body according to sourced medical literature, and what to expect next — money
saved, cigarettes not smoked, time not lost, a phase-based coping timeline, and a timed
craving intervention (SOS). There is no account, no server, and no network call anywhere
in the app. See `docs/privacy-policy.md` for the policy this claim is backed by.

## Architecture and layering

The codebase is split into four layers with a strict one-way dependency rule:

- **`src/domain/`** — pure functions and types. No React, no `expo-*` imports, no
  `src/data/` imports, no I/O. `now: Date` is always passed in as a parameter; nothing
  in this layer calls `Date.now()` or bare `new Date()`. This is what makes the whole
  layer testable in Node without a device or emulator. It computes elapsed time,
  anchors (fast vs. cumulative, so a single slip doesn't reset markers that are driven
  by years of cumulative exposure), milestone status, phase resolution, savings, and
  notification schedules.
- **`src/content/`** — static data only, no logic: milestone definitions, phase copy,
  SOS script, and the source citations every milestone's `sourceId` resolves against.
- **`src/data/`** — SQL lives as exported string constants (`schema.ts`, `queries.ts`),
  plus a thin `expo-sqlite` binding (`db.ts`, `repositories.ts`). The SQL constants are
  tested in Node using `better-sqlite3`, because `expo-sqlite` is a native module and
  cannot run under Vitest — the constants are identical SQL, so this exercises the real
  queries against a real (in-memory) SQLite engine. The `expo-sqlite` binding itself is
  verified by running the app on a device or emulator, not by a unit test.
- **`app/`** — screens. They render view models handed to them by the domain layer and
  contain no arithmetic of their own; if a screen needs a number, the domain layer
  computed it.

## Commands

```bash
npm test          # vitest run — domain, content and SQL-constant tests
npm run typecheck  # tsc --noEmit, strict mode, no `any`
npm start          # expo start
npm run android    # expo start --android
```

81 tests currently pass across 11 files.

## Spec and plan

- Design spec: `docs/superpowers/specs/2026-08-08-smoking-tracker-design.md`
- Implementation plan (18 tasks): `docs/superpowers/plans/2026-08-08-smoking-tracker.md`

## Content honesty

Every physiological claim in the recovery timeline carries a `sourceId` that resolves
in `src/content/sources.ts`. Two claims that appear in almost every quit-smoking
timeline online — "48 hours: nerve endings start to regrow" and "72 hours: bronchial
tubes relax and lung capacity increases" — are deliberately excluded. They do not
appear in the American Cancer Society or CDC timelines and could not be traced to a
primary source, so rather than include them with a caveat, they are left out entirely.

The app also refuses to invent a "days of healing lost" figure when a slip occurs.
Markers driven by a single exposure event (e.g. carbon monoxide half-life) restart on
a slip; markers driven by cumulative years of exposure (e.g. cancer-risk reduction) do
not, and the app does not fabricate a number to describe what was lost in between.

## Release

- `eas.json` defines a `preview` profile (internal APK) and a `production` profile
  (app bundle, auto-incrementing version code).
- `docs/privacy-policy.md` and `docs/play-store-listing.md` are the text Play Console
  requires for the Data Safety section and store listing.
- Building (`eas build`) and submitting (`eas submit`) require an authenticated Expo
  account and are not run as part of this repository's automated checks.

### A note on the INTERNET permission

`app.json` blocks `android.permission.INTERNET` deliberately (`android.blockedPermissions`),
so the shipped app physically cannot open a network socket — anyone can inspect the APK and
verify it cannot phone home. The app's own code makes no network requests: no fetch, XHR or
WebSocket anywhere in `src/` or `app/`. `Linking.openURL` hands off to the browser process and
`expo-sharing` hands off to the share intent, so neither needs this app to hold the permission.

**Consequence:** Android gates even loopback sockets on this permission, and Metro serves the
JS bundle over a socket. On-device debugging (`npm run android` against a real device) may fail
to load the bundle while this permission is blocked. If you hit a bundle-loading failure on a
real device, that is why — not a Metro bug.

**Workaround:** temporarily remove the `blockedPermissions` line, run your debug session, then
restore it before building a release. This is a deliberate, permanent choice, not something to
convert into an environment-conditional `app.config.js`.

**If phase-2 cloud backup is ever built**, this line must be removed — the app will need real
network access then.

The removal is expressed as `tools:node="remove"` in the generated native manifest
(`android/app/src/main/AndroidManifest.xml` after `expo prebuild`). This has **not** been
confirmed against a real Gradle build in this environment — verify it on the first actual EAS
build before finalising the Data Safety form.

## Out of scope for v1

Cloud backup and multi-device sync are explicitly out of scope for this release. All
data lives in a single SQLite database file in the app's private storage; the only way
to get data out is Settings → Export as JSON, and the only way to move to a new device
is to re-import manually. A phase-2 sync service is expected to add an optional,
opt-in backend for this later, but v1 ships local-only by design, not by omission —
it is the feature that backs the "collects nothing, never leaves your device" claim in
the privacy policy and store listing.
