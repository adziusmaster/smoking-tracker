# STATE — Cleared

Resume point. Last updated 2026-09-28.

`main` is green and pushed at 1.3.0 (versionCode 8, AAB built, to upload to closed testing);
1.2.0 (versionCode 7) is the build currently in closed testing.

| | |
| --- | --- |
| Repo | `adziusmaster/smoking-tracker` (private) |
| Branch | `main` = 1.3.0 (Better SOS merged and pushed 2026-09-28) |
| Tests | 353 passing |
| Schema | version 6 (v3: product columns; v4: `craving_events`; v5: `slips.product`; v6: `preferences`, `game_records`, `craving_events.strength_start/_end`) |
| Typecheck | clean |
| `expo-doctor` | 20/21 — the same patch drift, see Known items |
| App name | **Cleared** (launcher); Play title **Cleared: Quit Smoking & Vaping** — renamed 2026-09-28 because "Smoke Free" is an established Play app |
| Package name | `com.adziusmaster.smokefree` — kept on purpose (invisible to users; changing it means a new Play app, a new key, and wiped local data). DB file stays `smokefree.db`. |
| EAS project | `@adrzej-dev/smoking-tracker` · `b8ec62ea-af25-4199-99e4-b3fbf9962e00` |
| Last `versionCode` | 8 (1.3.0, built locally 2026-09-28 → `builds/cleared-1.3.0.aab`; EAS-managed, `appVersionSource: remote`) |

## Better SOS (1.3.0, merged 2026-09-28)

Spec `docs/superpowers/specs/2026-09-28-better-sos-design.md`, plan `docs/superpowers/plans/2026-09-28-better-sos.md`.
Bubble pop with a burst animation, pop sound (`assets/sounds/pop.wav`, synthesised by
`scripts/make-pop.py`) and vibration; sound/vibration switches in Settings plus a mute chip in SOS;
breathing with phase colours, countdown and outline ring; best scores for all three games; block
drop with next piece, ghost, levels, scoring, ±2 kicks, hold-to-drop, line flash; "How strong is
it?" at SOS start and end; "Your reason" (onboarding step 3 + Settings, shown in SOS); Log →
Cravings (beaten count, strength trend, time of day, slip triggers).

**expo-audio is locked down:** plugin options `recordAudioAndroid/enableBackgroundPlayback/
enableBackgroundRecording: false`, and `RECORD_AUDIO`, `FOREGROUND_SERVICE`,
`FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `FOREGROUND_SERVICE_MICROPHONE` in `blockedPermissions`.
Its default plugin adds those — re-check the built APK permissions (`aapt2 dump permissions`)
after any expo-audio upgrade. `MODIFY_AUDIO_SETTINGS` (normal permission) stays.

## Handover — where we stopped (2026-09-29)

**State:** `main` = 1.3.0, pushed. `builds/cleared-1.3.0.aab` (versionCode 8) is built and verified
(no INTERNET / RECORD_AUDIO / FOREGROUND_SERVICE; `android.permission.DUMP` in the manifest is
profileinstaller's receiver protection, also in 1.2.0 — not a requested permission). Release notes:
`store-assets/release-notes-1.3.0.md` (Play text 444/500). The owner tested the dev build on the
phone and approved it. 1.2.0 (versionCode 7) is what closed testers currently have.

**Next, in this order:**

1. **Upload 1.3.0 to closed testing** (owner does this in Play Console; paste the Play text from
   the release notes). Confirm whether it went up before doing anything else.
2. **Privacy policy: list what 1.3.0 added.** `docs/privacy-policy.md` ("What it stores, and
   where", line ~14) doesn't yet mention craving strength ratings, "your reason", best game
   scores, or the sound/vibration settings. All on-device only, so Data Safety answers are
   unchanged — the list just needs completing. Update both `docs/privacy-policy.md` and
   `../lech-digital/projects/cleared/privacy/index.html`; pushing that repo's `main` publishes
   it, so ask the owner first.
3. **Next release (1.3.1 or 1.4.0): R8 + deobfuscation file** — the Play warning "There is no
   deobfuscation file associated with this App Bundle". Add `expo-build-properties` (config-only)
   with `android.enableMinifyInReleaseBuilds` and `android.enableShrinkResourcesInReleaseBuilds`
   true; `npm ci`; build the **dev variant first** and walk every screen on the phone (R8 can
   strip reflection-used RN code — only visible at runtime: SOS games, audio, SQLite, share/export,
   notifications); then the production AAB, and upload
   `android/app/build/outputs/mapping/release/mapping.txt` with it (keep a copy in `builds/`).
   Keep this release free of features so any crash is attributable to R8.
4. **Open-source licences page** in Settings (see Known items). Before open testing.
5. **Store listing refresh before open testing:** screenshots don't show the new games,
   breathing colours, or Log → Cravings. Store screenshots may use flattering example data (the
   owner asked for "23 cravings beaten" in shot 1); the app itself never fabricates numbers.
6. **Deferred minors from the Better SOS review** (none visible enough to block):
   - preference saves (`setSound`/`setVibration`/`setReason`) have no `.catch` — a failed save
     leaves the switch showing the new state; `useFeedback` `seekTo` rejection unhandled;
   - bubble pop writes the record on every pop once past the best (throttle / save on unmount);
   - onboarding saves the reason outside the settings write (wrap both in a transaction);
   - Settings keeps the untrimmed reason in state after saving;
   - BreatheGuide JS clock vs `Animated.loop` drift over long sessions (measure on device).
7. **Expo patch drift** (`expo-doctor` check fails): update all Expo patch versions together in a
   release of their own, retest on the phone. `expo-asset` is pinned at 57.0.9 on purpose (the
   version inside 1.3.0).

**How the owner likes to work** (also see the global CLAUDE.md): builds are local (no EAS cloud
credits); phone testing uses the **dev variant** (`APP_VARIANT=dev`, package `.dev`) so the Play
install is never touched; on install, Play Protect may prompt — the owner taps "Don't send";
commits by `adziusmaster`, never a Co-Authored-By line; merge/push/AAB only on the owner's OK.
Icons are drawn in-house as small SVGs (`src/ui/kit/SpeakerIcon.tsx`) rather than pulling in an
icon set — the owner asked for that to avoid another licence to credit.

## Roadmap (owner-decided 2026-09-28; free, no ads, no purchases — deliberate)

Done: nicotine products · Clear Air design system + icon · SOS activities · store assets and the
Cleared rename · Better SOS (games, records, strength, reason, craving insights on Log).
Still open, each its own spec → plan → build:

1. **Something new every day** — daily card, savings goal (the "reason" part shipped in 1.3.0).
2. **Journal** (insights partly shipped in 1.3.0: Log → Cravings).
3. **Notification preferences + backup/restore to file.**
4. **Home-screen widget** (native module — riskiest, so last).

## Release blockers and gates

- **Closed testing: 12 testers, 14 continuous days.** Confirmed to apply — personal account
  created after 13 Nov 2023. This is the critical path; nothing else takes 14 days. Internal
  testing does **not** count toward it. Recruit ~15 for margin; dropping below 12 risks
  restarting the clock.
- **Play Console was locked until 12 Aug 2026.**
- Privacy policy is live and required by Play: <https://lechdigital.nl/projects/cleared/privacy/>
  Source: `../lech-digital/projects/cleared/privacy/index.html` (GitHub Pages; pushing `main`
  deploys). Keep it in sync with `docs/privacy-policy.md`. The old
  `adziusmaster.github.io/smokefree-privacy/` page is superseded and no longer linked.
- Data Safety answers: collects nothing, shares nothing, deletion in-app. **Verified against
  the built artifact**, not just the source.
- Store listing copy: `docs/play-store-listing.md`. Graphics: `store-assets/`.

## Decisions already made — do not relitigate

- **`INTERNET` is blocked deliberately** (`app.json` → `android.blockedPermissions`), so the
  shipped app physically cannot open a socket. Consequence: on-device debugging against Metro
  may fail to load the bundle, because Android gates even loopback sockets on that permission.
  See the README note. **This also rules out `expo-updates` / EAS Update** — every change,
  including a one-word copy fix, is a full build and store submission. That trade was made
  twice, knowingly.
- **`SYSTEM_ALERT_WINDOW` is blocked** — it came from React Native's debug manifest, the app
  never draws over other apps, and it is a permission Play scrutinises.
- **Not a PWA/TWA.** Meeting Bingo is a PWABuilder TWA, which is why its deploys are just a
  hosting push. Converting this app would sacrifice local notifications and offline SQLite —
  the two reasons native was chosen.
- **Expo package patch drift is a deliberate hold.** `expo-doctor` reports 19/20: six packages
  one *patch* behind SDK 57 (upstream releases). The current tree produced a verified,
  permission-checked artifact, and this dependency tree has already broken one EAS build.
  Do not upgrade casually before a release.
- **`lifetime_baseline` is retained, not dropped.** Superseded by `smoked_for_months`.
- **No lifetime cigarette total after a slip** (owner's call, 2026-09-28: "an abstract number that
  says nothing"). The slip screen and Log confirmation no longer show it; the pre-quit estimate in
  Settings remains. `Savings.lifetimeCigarettes` is still computed and tested but not shown.
- **The lifetime total is an estimate and must always be labelled one.** It applies the
  current daily rate retroactively and overestimates for most people. Two distinct figures
  exist and must not share a label: the **pre-quit estimate** (Settings) and the **running
  lifetime total** (slip confirmation). They differ once anything is logged.

## Known items, none blocking

- **expo-doctor:** `expo-asset` is now a direct dependency pinned to 57.0.9 (the version inside the
  1.3.0 AAB; expo-audio needs it as a peer). The patch-drift check still fails as before — update
  the Expo patch versions together in a release of their own, then retest on the phone.

- **Open-source notices screen, before open testing:** every shipped library (React Native, Expo,
  react-native-svg, …) is MIT/BSD/ISC-style and the fonts are SIL OFL; their notices should ship
  with the app. Add a small "Open-source licences" page reachable from Settings. Icons are drawn
  in-house (`src/ui/kit/SpeakerIcon.tsx`), not taken from an icon set.

- **Changing product in Settings reinterprets logged slips** in the new unit (a slip of 5
  cigarettes becomes 5 pouches). The screen warns before saving; nothing is converted.
- **Theme once stayed dark after the phone switched back to light** (2026-09-28, right after a
  fresh install): the SOS screen rendered dark until the app was force-stopped. Not reproduced in
  five attempts (foreground, background via Home and via Back, fresh SOS mount). If it recurs, note
  the exact steps; `useColorScheme` is the only source of the scheme (`src/ui/theme.ts`).
- **Heated tobacco has no heart-rate milestone** — deliberately; no study measures it. See the
  spec's amendment note.
- **Settings save can claim success after a failed refresh.** `useQuitState().reload()` catches
  its own errors, so the "Saved, but couldn't refresh" branch in `app/settings.tsx` never runs.
  Fix by having `reload` report success; it needs a hook test harness this repo does not have.
- **The upload-key reset (below) status is unknown** as of 2026-09-28 — check Play Console.

- **`expo-doctor` 19/20** — the patch drift above.
- **`longestStreak` reads 0** if the only smoking period starts on the quit date, so Hero
  shows "your best run was 0 minutes". Accurate but graceless for someone who relapsed the
  same day they quit.
- **Chapter header after a slip** reads "The Crash — Behind you" with a green tick while every
  milestone inside it reads "Ahead of you". Semantically correct — the phase tracks sustained
  abstinence, the milestones track the last cigarette — but it reads as a contradiction.
- **Double-tap protection is UI-only.** `INSERT_SLIP` has no DB-level uniqueness guard; both
  slip paths use `src/ui/useSubmitGuard.ts`. Repeat slips are legitimate,
  so a DB constraint would be wrong.
- **`app/log.tsx` loads state twice per slip** (`reload()` then `loadQuitState`).
- **`milestone_events.reached_at` goes stale** if the quit date is edited in Settings
  (`UPSERT_MILESTONE_EVENT` is `DO NOTHING`). Unobservable today because nothing reads that
  table; becomes a bug the moment something does.
- **Migration v2's back-fill will never fire.** With zero installs, no row will ever hold a
  `lifetime_baseline > 0`. It stays as a safety net for a case that can no longer arise.
- **The migration's transaction wiring is unverified by tests.** `src/data/db.ts` imports
  native `expo-sqlite` and cannot run under Vitest. The *selection* logic is a pure tested
  helper (`migrationsToApply`); the `withTransactionAsync` wrapping rests on code review.

## Design system notes

- **Colours come only from `src/content/palette.ts`.** Screens use `makeStyles((t) => …)` from
  `src/ui/theme.ts`; there is no static theme object, so a light-only style cannot compile.
  `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" app src/ui` should return nothing.
- **Fonts are embedded at build time** by the `expo-font` config plugin (`app.json`); family names
  are the TTF basenames in `assets/fonts/`. No `useFonts`, no runtime fetch — the blocked
  `INTERNET` permission is unaffected.
- **Icons are generated**, never hand-edited: `node store-assets/icon/build.mjs` (needs Google
  Chrome) renders every variant and fails unless each PNG is 32-bit RGBA. Chrome writes opaque
  screenshots as 24-bit RGB; the script re-encodes them.
- **The feature graphic and store screenshots still use the old green** — sub-project 7.
- No `react-native-svg` / `expo-linear-gradient` by design: the SOS ring and the hero depth are
  plain Views.

## Release builds: `eas build --local` (no credits, no queue)

The Play AAB is built on this Mac with EAS's own pipeline. It fetches the EAS-managed upload key
and bumps the remote versionCode, exactly like a cloud build, but costs no build credit:

```
JAVA_HOME=$HOME/Library/Java/JavaVirtualMachines/jdk-17.0.20+8/Contents/Home \
ANDROID_HOME=$HOME/android-sdk \
npx eas-cli build --platform android --profile production --local --output builds/cleared-<version>.aab
```

Commit first (it builds from git). Bump `version` in `app.json` for each release; versionCode is
remote-managed (`appVersionSource: remote`) and increments by itself. Cloud builds 5 and 6 were
cancelled, so their numbers are spent.

## Testing on the phone: the dev app

The Play build (closed testing) is on the owner's phone with their real data. Local builds are
signed differently and can neither update it nor be allowed to wipe it, so **local test builds are
the dev variant**: package `com.adziusmaster.smokefree.dev`, name "Cleared (dev)", installed side by
side with its own throwaway data.

```
APP_VARIANT=dev npx expo prebuild --platform android --clean --no-install && git checkout -- package.json
echo "sdk.dir=$HOME/android-sdk" > android/local.properties
cd android && NODE_ENV=production ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/release/app-release.apk
```

Never uninstall `com.adziusmaster.smokefree` from the phone. Release AABs are built without
`APP_VARIANT` (see above), so they keep the real package.

## Local Android builds (no EAS credits)

The Android SDK lives in `~/android-sdk` (no sudo); NDK 27.1 was added there with `sdkmanager`.

```
export JAVA_HOME=$HOME/Library/Java/JavaVirtualMachines/jdk-17.0.20+8/Contents/Home ANDROID_HOME=$HOME/android-sdk
npx expo prebuild --platform android --no-install && git checkout -- package.json   # prebuild edits the android script
echo "sdk.dir=$HOME/android-sdk" > android/local.properties
cd android && NODE_ENV=production ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/release/app-release.apk
```

Local release APKs are signed with the debug keystore, so reinstalling keeps data; a Play/EAS build
has a different signature and forces an uninstall. If `adb install` stalls, it is Play Protect's
"send for a security check" prompt on the phone — tap "Don't send". `android/` is generated and
git-ignored.

## Environment gotchas that cost real time

- **This machine's SSH key authenticates as the WORK account** (`Andrzej-Lech`). Private repos
  under `adziusmaster` must push over **HTTPS** with the `gh` credential helper. `gh repo create
  --source=. --push` sets up an SSH remote and fails. Fix, scoped per repo:

  ```
  git remote set-url origin https://github.com/adziusmaster/<repo>.git
  git config --local credential.https://github.com.helper '!gh auth git-credential'
  ```

- **`.npmrc` has `legacy-peer-deps=true` and must stay.** The committed `package-lock.json` was
  generated under it. **EAS Build runs `npm ci`** — a lock that `npm install` accepts while
  `npm ci` rejects has already broken one build. After any dependency change, run `npm ci`
  locally before committing.
- **`appVersionSource: remote` keys `versionCode` to the package name.** Renaming the package
  reset the counter. Check what Play shows rather than assuming the next number.
- **`expo-file-system`** uses the class API (`new File(Paths.cache, name)`); the function-based
  API moved to `expo-file-system/legacy` in SDK 54+.
- **Top-level `splash` was removed from the Expo config schema** in SDK 54+ — it lives in the
  `expo-splash-screen` plugin. `expo-doctor` catches this; it would have failed the first build.
- **`metro.config.js` exists only to preview the app in a browser** (wasm assetExt for
  expo-sqlite's web build). Not needed for Android. `npm install --no-save react-dom@<react's
  version> react-native-web @expo/metro-runtime` in ONE command — installing them separately
  prunes the earlier ones.

## Where the design record lives

- `docs/superpowers/specs/2026-08-08-smoking-tracker-design.md` — original design
- `docs/superpowers/specs/2026-08-10-onboarding-inputs-design.md` — supersedes parts of it
- `docs/superpowers/plans/` — the matching implementation plans (18 tasks, then 6)
- `README.md` — layering rules and commands
- `CLAUDE.md` — project conventions (these override the repo's global .NET standards)
