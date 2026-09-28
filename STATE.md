# STATE — Cleared

Resume point. Last updated 2026-09-28.

`main` is green and pushed. The app is feature-complete for v1 and nothing is published yet —
**there are zero installs anywhere**, which matters for several decisions below.

| | |
| --- | --- |
| Repo | `adziusmaster/smoking-tracker` (private) |
| Branch | `feat/nicotine-products` (multi-product support, not yet merged); `main` is the v1 cigarettes-only app |
| Tests | 295 passing across 24 files |
| Schema | version 5 (v3: product columns; v4: `craving_events`; v5: `slips.product`) |
| Typecheck | clean |
| `expo-doctor` | 20/21 — the same patch drift, see Known items |
| App name | **Cleared** (launcher); Play title **Cleared: Quit Smoking & Vaping** — renamed 2026-09-28 because "Smoke Free" is an established Play app |
| Package name | `com.adziusmaster.smokefree` — kept on purpose (invisible to users; changing it means a new Play app, a new key, and wiped local data). DB file stays `smokefree.db`. |
| EAS project | `@adrzej-dev/smoking-tracker` · `b8ec62ea-af25-4199-99e4-b3fbf9962e00` |
| Last `versionCode` | 4 (EAS-managed, `appVersionSource: remote`) |

## Release roadmap (decided 2026-09-28)

The owner chose to **build everything before closed testing** (the 14-day clock starts at the
end). Sub-projects, each with its own spec → plan → build:

1. **Nicotine products** — done on `feat/nicotine-products`: cigarettes, roll-your-own, heated,
   vape, snus, pouches; product-filtered, citation-checked milestones
   (`docs/citation-check-2026-09.md`).
2. **Design system + new icon** — done on `feat/design-system`: "Clear Air" light/dark palettes
   (`src/content/palette.ts`, contrast-tested), bundled Fraunces + Manrope, component kit in
   `src/ui/kit/`, every screen restyled, tally-mark icon. Directions page:
   <https://claude.ai/artifact/M1zLbZ1ATW5hTk5g2g1bLo>.
3. **SOS activities** — done on `feat/sos-games`: delay, then breathing / block drop (cites
   Skorka-Brown 2015) / memory pairs / bubble pop / 5-4-3-2-1 / water, a five-minute bar, and
   "cravings beaten" on home. Game rules are pure and tested in `src/domain/games/`.
   Craving/slip buttons are product-neutral ("I’m having a craving" / "I slipped"); a slip records
   what was used (`slips.product`, null = own product). Any slip restarts the fast clocks; only
   own-product slips reduce "units not used"; cigarette/roll-up slips add to the lifetime total.
   Repository functions now run in Node via `src/data/testDb.ts`.
4. **Something new every day** — daily card, savings goal, reasons.
4. **Insights & journal.**
5. **Notification preferences + backup/restore to file.**
6. **Home-screen widget** (native module — riskiest for EAS builds, so last).
7. **Store assets** — new display name (**"Smoke Free" collides with an established Play app**),
   listing (draft: `store-assets/listing-draft.md`), icon, feature graphic, captioned device
   screenshots built the way PurePrep/CoreChoice do it.

The app is free, no ads, no purchases — a deliberate decision, not a TODO.

## Do these next, in this order

1. **Install and test the APK.** Built from `main`, `versionCode 4`, permissions verified:
   <https://expo.dev/accounts/adrzej-dev/projects/smoking-tracker/builds/c3a528d3-6319-42fd-b676-a5ae6e1ef967>

   Worth exercising, most likely to reveal something first:
   - Onboarding backdated to a specific date **and** a distinct time (e.g. 21:30) — check the
     timeline's hours figure matches. Date and time are merged by separate code paths.
   - Years/months question, then check Settings shows a consistent "estimated cigarettes
     smoked before you quit".
   - Log a slip: the day counter must NOT reset, and the estimated **lifetime total** must be
     higher than the Settings figure. They are deliberately different numbers.
   - Edit the quit date in Settings: every figure should recalculate while cigarettes-per-day
     and pack price survive.
   - Aeroplane mode, then repeat all of it. The manifest proves the app *cannot* reach a
     network; only running it proves every screen is happy without one.
   - Notifications: grant permission and confirm one arrives. Blocking `SYSTEM_ALERT_WINDOW`
     is the change most likely to have disturbed this.

2. **Finish the upload-key reset in Play Console.** Play expects an upload certificate nobody
   holds the private half of (`23:5D:81:87:9A:54:E7:0B:E2:C3:ED:54:71:28:89:FF:68:14:FB:BB` —
   almost certainly generated during app setup). Reset it to the EAS-managed key:

   - Play Console → Test and release → Setup → App integrity → **Request upload key reset**
   - Certificate to register: `~/Downloads/eas-upload-certificate.pem`
   - SHA-1 `B8:9B:23:03:C3:F5:C1:66:BB:A0:35:05:64:6E:33:8F:04:36:B1:34`
   - SHA-256 `56:88:E3:A0:57:19:1F:7D:72:5C:92:30:A2:29:D0:EC:E8:5A:45:72:36:9F:65:BC:E7:C8:56:18:CA:08:3A:BF`

   Google approves in a day or two. No production release exists, so this is low risk.
   The keystore is held encrypted by EAS — there is no local file to lose.

3. **Build a production AAB.** The `versionCode 4` AAB was cancelled, so this needs one build:

   ```
   npx eas-cli@latest build --platform android --profile production --non-interactive
   ```

   **Build credits are limited** — do not fire off speculative builds. Verify locally first
   (`npm test`, `npm run typecheck`, `npx expo-doctor@latest`, `npx expo export --platform android`).

4. **After building, re-verify the artifact's permissions.** `INTERNET` and
   `SYSTEM_ALERT_WINDOW` must both be absent. Note the two formats differ:
   **AAB** manifests are protobuf with UTF-8 strings (`base/manifest/AndroidManifest.xml`);
   **APK** manifests are binary AXML with UTF-16LE. Scanning with the wrong encoding returns
   zero strings, which looks exactly like "permission absent" — always assert a known string
   (the package name) resolves, or a failed parse reads as an all-clear.

5. **Upload to internal testing**, install, walk the app. Then **start closed testing.**

6. **Retake screenshots on the device.** `store-assets/screenshots/` holds four captured from
   a browser (423×751, in spec, usable). Real-device shots render fonts and shadows as users
   see them. A fifth showing the **danger-window state** after a slip is the clearest visual
   argument for what makes this app different.

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
