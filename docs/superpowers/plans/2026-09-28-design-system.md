# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole app onto a light/dark "Clear Air" token system with bundled Fraunces + Manrope, shared components, and a new tally-mark icon.

**Architecture:** Palettes are static data (`src/content/palette.ts`) checked for WCAG contrast by a pure helper (`src/domain/contrast.ts`). `src/ui/theme.ts` turns them into a runtime `Theme` via `useColorScheme`, and `makeStyles` memoises one `StyleSheet` per scheme. Screens compose `src/ui/kit/*`. Fonts are embedded at build time by the `expo-font` config plugin. Icons are rendered from one SVG with headless Chrome.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript strict, Vitest, expo-font (config plugin), system Chrome for asset rendering.

**Spec:** `docs/superpowers/specs/2026-09-28-design-system-design.md`

## Global Constraints

- No behaviour changes: every screen shows the same content and runs the same handlers.
- No new native modules except `expo-font` at `~57.0.1`; no `react-native-svg`, no `expo-linear-gradient`.
- No runtime network; fonts are files in `assets/fonts/`.
- `src/domain/` stays pure; `src/content/` is data only.
- strict TS, no `any`, no `@ts-ignore`; tests `function_stateUnderTest_expectedBehavior` + AAA.
- After any dependency change: `npm ci` must succeed before committing (`.npmrc` `legacy-peer-deps=true` stays).
- Commits authored by the repo's configured user (adziusmaster); no `Co-Authored-By`.
- Font family names are the TTF basenames: `Fraunces_600SemiBold`, `Manrope_400Regular`, `Manrope_500Medium`, `Manrope_600SemiBold`, `Manrope_700Bold`.

## Review Focus

1. **Dark mode leftovers** — a hard-coded colour (e.g. `'#fff'`, `rgba(...)` literal) that is invisible in one scheme. Expect every colour from `t.color`. Pinned by the Task 8 grep gate.
2. **Scheme change while the app is open** — styles must update (no module-level `StyleSheet` capturing the light palette). Pinned by removing the static `theme` export in Task 6 (typecheck fails on any leftover).
3. **Placeholder / selection / cursor colours on TextInput** in dark mode — must be themed. Pinned in `Field` (Task 3).
4. **Large system font size** — hero number and tiles must wrap or shrink, not clip. `StatTile` uses `numberOfLines={1}` + `adjustsFontSizeToFit`.
5. **Icon PNGs not 32-bit RGBA** — Play rejects them. Pinned by the build script's IHDR assertion (Task 7).

---

### Task 1: Palettes and contrast

**Files:** Create `src/domain/contrast.ts`, `src/domain/contrast.test.ts`, `src/content/palette.ts`, `src/content/palette.test.ts`.

**Interfaces — Produces:**

```ts
// src/domain/contrast.ts
export function relativeLuminance(hex: string): number;   // '#RRGGBB'
export function contrastRatio(a: string, b: string): number;
// src/content/palette.ts
export interface Palette { /* keys exactly as the spec's Tokens block */ }
export const PALETTES: { light: Palette; dark: Palette };
```

- [ ] **Step 1: tests** — `contrast.test.ts`: `contrastRatio_blackOnWhite_is21`, `contrastRatio_sameColour_is1`, `contrastRatio_isSymmetric`, `relativeLuminance_invalidHex_throws`. `palette.test.ts`: `PALETTES_bothSchemes_defineTheSameKeys`, `PALETTES_everySolidValue_isSixDigitHex` (except `heroTile`, which is `rgba(...)`), and one `it.each` over `[scheme, fg, bg, minimum]` for every pair listed in the spec's Testing section.
- [ ] **Step 2:** run `npx vitest run src/domain/contrast.test.ts src/content/palette.test.ts` → FAIL (modules missing).
- [ ] **Step 3:** implement `contrast.ts` (WCAG 2.x: sRGB channel `c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`, `L = .2126R+.7152G+.0722B`, ratio `(Lmax+.05)/(Lmin+.05)`; throw on non-`#RRGGBB`) and `palette.ts` with the spec's table values verbatim.
- [ ] **Step 4:** run → PASS. Commit `feat(ui): Clear Air light and dark palettes with contrast tests`.

### Task 2: Runtime theme, fonts, app shell

**Files:** Modify `src/ui/theme.ts`, `app/_layout.tsx`, `app.json`, `package.json`, `package-lock.json`. Create `assets/fonts/*.ttf`, `assets/fonts/OFL.txt`.

**Interfaces — Produces:**

```ts
export type Scheme = 'light' | 'dark';
export interface Theme {
  scheme: Scheme;
  color: Palette;
  space: { xs: 4; sm: 8; md: 12; lg: 16; xl: 24; xxl: 32 };
  radius: { sm: 8; md: 12; lg: 20; pill: 999 };
  font: { display: 34; title: 22; heading: 17; body: 15; small: 13; tiny: 11; micro: 9 };
  family: { display: 'Fraunces_600SemiBold'; body: 'Manrope_400Regular'; medium: 'Manrope_500Medium'; semi: 'Manrope_600SemiBold'; bold: 'Manrope_700Bold' };
}
export function themeFor(scheme: Scheme): Theme;
export function useTheme(): Theme;
export function makeStyles<T>(factory: (t: Theme) => T): () => T;
/** Legacy light-only export, deleted in Task 6. */
export const theme: LegacyTheme;
```

- [ ] **Step 1:** copy the five TTFs from `@expo-google-fonts/fraunces@0.4.1` / `@expo-google-fonts/manrope@0.4.2` (`npm pack` into the scratchpad) to `assets/fonts/`, plus `LICENSE_FONT` as `assets/fonts/OFL.txt`.
- [ ] **Step 2:** `npx expo install expo-font` (must resolve `~57.0.1`), then add the plugin to `app.json`: `["expo-font", { "fonts": ["./assets/fonts/Fraunces_600SemiBold.ttf", "./assets/fonts/Manrope_400Regular.ttf", "./assets/fonts/Manrope_500Medium.ttf", "./assets/fonts/Manrope_600SemiBold.ttf", "./assets/fonts/Manrope_700Bold.ttf"] }]`. Run `npm ci` and confirm success.
- [ ] **Step 3:** rewrite `theme.ts`: `themeFor` builds from `PALETTES`; `useTheme` = `themeFor(useColorScheme() === 'dark' ? 'dark' : 'light')` memoised; `makeStyles` returns a hook that caches `{ light?: T; dark?: T }` in a closure and returns `cache[scheme] ??= factory(themeFor(scheme))`. Keep the old object as `theme` (legacy) so screens still compile.
- [ ] **Step 4:** `_layout.tsx`: `useTheme()`; `Loading` and `Stack contentStyle` use `t.color.bg`; add `<StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />` from `expo-status-bar`. `app.json`: `android.backgroundColor` `#F2F6F7`; splash plugin `backgroundColor` `#F2F6F7` and `dark: { backgroundColor: '#0A1418' }` (keep existing image keys).
- [ ] **Step 5:** `npm test && npm run typecheck && npx expo-doctor@latest` (known drift only) → commit `feat(ui): runtime light/dark theme and bundled Fraunces + Manrope`.

### Task 3: Component kit

**Files:** Create `src/ui/kit/{Screen,Type,Button,Card,Chip,Field,StatTile,ProgressBar,ProgressRing,index}.tsx`.

**Interfaces — Produces:**

```tsx
Screen({ children, scroll?: boolean /* default true */, padded?: boolean, footer?: ReactNode })
Title / Heading / Body / Label / Caption ({ children, tone?: 'ink'|'muted'|'faint'|'accent'|'danger'|'onHero', style?, numberOfLines? })
Button({ label, onPress, variant?: 'primary'|'secondary'|'quiet'|'danger', disabled?, accessibilityLabel? })
Card({ children, tone?: 'plain'|'now'|'done'|'danger', style? })
Chip({ label, selected, onPress, role?: 'radio'|'checkbox' })
Field({ label, hint?, value, onChangeText, keyboardType?, placeholder?, accessibilityLabel? })
StatTile({ value, label })
ProgressBar({ progress /* 0..1 */, accessibilityLabel })
ProgressRing({ progress /* 0..1 */, size, thickness, children })
```

- [ ] **Step 1:** implement each with `makeStyles`. Rules: `Title` uses `family.display`; others `family.body`/`semi`/`bold`; `Button` min height 48, `accessibilityRole="button"`, `accessibilityState={{ disabled }}`; `Chip` `accessibilityRole={role ?? 'radio'}` + `accessibilityState={{ selected }}`; `Field` sets `placeholderTextColor={t.color.faint}`, `selectionColor={t.color.accent}`, `cursorColor={t.color.accent}`; `StatTile` value `numberOfLines={1} adjustsFontSizeToFit`; `ProgressBar` `accessibilityRole="progressbar"` with `accessibilityValue={{ min: 0, max: 100, now }}`; `ProgressRing` = track ring (bordered circle in `line`) + two half-disc masks rotated by `progress` (right half covers 0–50%, left half 50–100%), centre disc in `bg`, children centred. `Screen` wraps `SafeAreaView`-style insets via `useSafeAreaInsets`, bg `t.color.bg`, gutter `t.space.lg`, and renders `footer` pinned at the bottom (used for the SOS button).
- [ ] **Step 2:** `npm run typecheck` → commit `feat(ui): shared component kit`.

### Task 4: Home

**Files:** Modify `src/ui/Hero.tsx`, `src/ui/ChapterBlock.tsx`, `src/ui/MilestoneNode.tsx`, `app/index.tsx`.

- [ ] **Step 1:** `Hero`: card radius `lg`, fill `heroTo`, clipped `heroFrom` disc (absolute, 220×220, top −90, left −70, radius 110); big number `Title` size `display` `onHero`; sub `Caption onHero`; `StatTile`s. Smoking state uses a `danger` `Card`.
- [ ] **Step 2:** `ChapterBlock`: header badge 24×24 `radius.sm` (`accent` current / `doneLine` past / `line` future), name in `family.display` `heading`; tips in a `Card tone="plain"` with `Label` eyebrows (`achieve` normally, `danger` in danger window).
- [ ] **Step 3:** `MilestoneNode`: `Card` tone `now` for in-progress, `done` for reached, plain + `opacity .6` for future; status line `Caption` uppercase; `ProgressBar`; source line `Caption faint` resolving `SOURCES[milestone.sourceId]?.label` (new: visible sources per spec); conservative note `Caption`. Compact past row keeps the tick in `accent`.
- [ ] **Step 4:** `index.tsx`: `Screen` with `footer` = full-width pill `Button`-like Pressable using `sos`/`onSos`; top links `Label accent`; danger banner = `Card tone="danger"`; error/loading states on the kit.
- [ ] **Step 5:** typecheck + export → commit `feat(ui): restyle the timeline`.

### Task 5: SOS, Log, chart

**Files:** Modify `app/sos.tsx`, `app/log.tsx`, `src/ui/CravingChart.tsx`.

- [ ] **Step 1:** SOS running: step `Caption`, `Title`, `ProgressRing` (size 200, thickness 12, progress = `remaining / step.seconds`) with seconds in `family.display` 56 `accentText`; instruction `Body muted`; "It passed" `Button primary`; slip `Button quiet` with `content.slipVerb`. Passed/slipped screens on `Screen` + kit; trigger chips → `Chip role="radio"`.
- [ ] **Step 2:** Log: sections with `Heading`; `Field`s; trigger and scale chips → `Chip` (closes the accessibility minor); buttons `Button` (`secondary` for relapse toggle); status text tone ok=`accent` / error=`danger`.
- [ ] **Step 3:** `CravingChart`: bars `achieve`, axis `Caption faint`, via `makeStyles`.
- [ ] **Step 4:** typecheck + export → commit `feat(ui): restyle SOS and log`.

### Task 6: Onboarding, Settings, form parts; delete the legacy theme

**Files:** Modify `app/onboarding.tsx`, `app/settings.tsx`, `src/ui/ProductPicker.tsx`, `src/ui/UsageFields.tsx`, `src/ui/QuitMomentPicker.tsx`, `src/ui/theme.ts`. Delete `src/ui/formStyles.ts`.

- [ ] **Step 1:** `ProductPicker` cards: `surface` + `line`, selected = 2px `accent` border + `doneWash`; label `Heading`; hint `Caption`. Sub-choice → `Chip`s.
- [ ] **Step 2:** `UsageFields` → `Field` + `Chip`; `QuitMomentPicker` rows → themed Pressables; DateTimePicker `themeVariant={t.scheme}`.
- [ ] **Step 3:** onboarding and settings on `Screen` + kit (`Title` for the step title, `Button primary/secondary`, danger `Button` for delete, sources as `Body accent` links).
- [ ] **Step 4:** delete `formStyles.ts` and the legacy `theme` export; `npm run typecheck` must pass with zero references.
- [ ] **Step 5:** export → commit `feat(ui): restyle onboarding and settings; remove the static theme`.

### Task 7: Tally icon and splash

**Files:** Create `store-assets/icon/icon.svg`, `store-assets/icon/build.mjs`. Replace `assets/icon.png`, `assets/android-icon-{foreground,background,monochrome}.png`, `assets/splash-icon.png`, `store-assets/play-icon-512.png`.

- [ ] **Step 1:** `icon.svg` (1024 viewBox): lagoon vertical gradient `#0E7C86`→`#0E5F69` full bleed; four `#F2F6F7` round-capped strokes (width 56) at x = 352, 464, 576, 688 from y 320 to 704; one `#F0A55A` round-capped stroke (width 64) from (272,624) to (752,400). Variants rendered by the script via CSS classes: `full` (icon, play, splash), `fg` (strokes only, scaled 0.62 into the adaptive safe zone, transparent bg), `bg` (gradient only), `mono` (all strokes white, transparent).
- [ ] **Step 2:** `build.mjs` (Node, no deps): writes an HTML wrapper per variant, runs `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 --window-size=W,H --screenshot=out.png file://…`, then asserts each PNG's IHDR colour type byte (offset 25) is 6 (RGBA) and its width/height match; exits non-zero otherwise. Outputs: 1024 icon, 1024 fg/bg/mono, 1024 splash (marks on transparent, 0.5 scale), 512 play icon.
- [ ] **Step 3:** run `node store-assets/icon/build.mjs` → all assertions pass. Export → commit `feat(brand): tally-mark icon, adaptive icon and splash`.

### Task 8: Verification gate and docs

- [ ] **Step 1:** grep gate — no colour literals outside the palette: `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" app src/ui` must return nothing except `src/ui/theme.ts` comments (fix any hit).
- [ ] **Step 2:** `npm test`, `npm run typecheck`, `npm ci`, `npx expo export --platform android`, `npx expo-doctor@latest`.
- [ ] **Step 3:** `STATE.md`: part 2 done, fonts/icon pipeline notes, how to rebuild icons; README one line on theming. Commit `docs: state after the design system`.
