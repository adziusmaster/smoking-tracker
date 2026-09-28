# Design System — Design

**Date:** 2026-09-28
**Status:** Approved in conversation ("yes, build it")
**Part of:** pre-closed-testing release, sub-project 2 of 7.
**Chosen direction:** "A · Clear Air" colours and type, with "B · Field Notes" tally icon; light
first. Directions page: https://claude.ai/artifact/M1zLbZ1ATW5hTk5g2g1bLo

## Summary

Replace the single light `theme` object with a two-palette token system (light and dark,
following the phone), bundled Fraunces + Manrope type, a small set of shared components, and
restyle every screen onto them. Ship a new tally-mark icon (adaptive, monochrome, splash, 512 px
Play icon) generated from one SVG source.

No behaviour changes. No new features. The app name is undecided, so nothing here may depend on it.

## Goals

- Every screen reads correctly in light and dark, following the system setting.
- One place defines colour, type, spacing and radius; screens stop hand-rolling styles.
- Text/background pairs meet WCAG AA (4.5:1 body, 3:1 large text and UI marks), enforced by a test.
- No runtime network: fonts are bundled at build time.
- No new native modules beyond `expo-font` (already in the tree under `expo`).

## Non-goals

- In-app light/dark toggle (follows the phone; a toggle can come with notification settings).
- `react-native-svg` or any other new native module — the dependency tree has broken an EAS build
  before; shapes are drawn with plain Views.
- Store screenshots and feature graphic (sub-project 7). The Play 512 icon is in scope because the
  current one is 24-bit and would be rejected.
- Features shown in the directions mock-up that do not exist yet ("Your reason" card).

## Tokens

Palettes are static data in `src/content/palette.ts` so they are testable in Node (Vitest only
covers `src/{domain,content,data}`). `src/ui/theme.ts` builds the runtime theme from them.

```ts
export interface Palette {
  bg: string; surface: string; surfaceSunken: string; line: string;
  ink: string; muted: string; faint: string;
  accent: string;       // lagoon — primary actions, reached marks
  accentText: string;   // accent used as text on bg (meets 4.5:1)
  onAccent: string;     // text on accent fills
  achieve: string;      // dawn — "happening now", achievements
  achieveWash: string;  // dawn-tinted card fill
  heroFrom: string; heroTo: string; onHero: string; heroTile: string;
  sos: string; onSos: string;
  danger: string; dangerWash: string; dangerLine: string;
  doneWash: string; doneLine: string;
}
export const PALETTES: { light: Palette; dark: Palette };
```

Values (from the approved direction):

| Token | Light | Dark |
|---|---|---|
| bg | `#F2F6F7` | `#0A1418` |
| surface | `#FFFFFF` | `#112027` |
| surfaceSunken | `#E8EEF0` | `#0E1B21` |
| line | `#DBE5E8` | `#1D3139` |
| ink | `#0F2830` | `#E3EEF0` |
| muted | `#4A6570` | `#9BB3B9` |
| faint | `#6A838B` | `#7A949C` |
| accent | `#0E7C86` | `#5CC8C2` |
| accentText | `#0B6770` | `#7FD8D2` |
| onAccent | `#FFFFFF` | `#06282A` |
| achieve | `#A0561A` | `#F0A55A` |
| achieveWash | `#FFF4E8` | `#1E1B14` |
| heroFrom / heroTo | `#0E5F69` / `#0E7C86` | `#0F2F38` / `#1F6A6F` |
| onHero | `#FFFFFF` | `#EAF7F6` |
| heroTile | `#0B6770` | `#184F55` |
| sos / onSos | `#0F2830` / `#FFFFFF` | `#F0A55A` / `#2A1606` |
| danger | `#B42318` | `#FF9C8F` |
| dangerWash / dangerLine | `#FEF3F2` / `#FECDCA` | `#2A1512` / `#5A2A24` |
| doneWash / doneLine | `#EAF5F5` / `#C4E3E4` | `#10262A` / `#1F4348` |

(`achieve` light is a darker dawn than the mock-up's `#F0A55A` so dawn text passes 4.5:1 on white;
`faint` is lifted from the mock-up to pass 3:1 as secondary text.)

The hero has no native gradient (no `expo-linear-gradient`): the card fill is `heroTo`, with one
large `heroFrom` disc clipped into its top-left corner for depth. `onHero` passes 4.5:1 on both.

Scales: space `4/8/12/16/24/32`, radius `sm 8 · md 12 · lg 20 · pill 999`, type
`display 34 · title 22 · heading 17 · body 15 · small 13 · tiny 11 · micro 9`.

## Type

- **Fraunces SemiBold (600)** — big numbers, screen titles, chapter names.
- **Manrope Regular/Medium/SemiBold/Bold (400/500/600/700)** — everything else, including figures.
- Static TTFs (SIL OFL) vendored into `assets/fonts/`, taken from the `@expo-google-fonts/*`
  packages without adding them as dependencies; `OFL.txt` alongside.
- Embedded at build time with the `expo-font` config plugin; `expo-font` becomes a direct
  dependency at the SDK-57 version already in the lock file. `useFonts` is not used, so there is
  no loading flash and no runtime fetch.

## Runtime theme

```ts
export interface Theme { color: Palette; space: ...; radius: ...; font: FontSizes; family: { display: string; body: string; bodyMedium: string; bodySemi: string; bodyBold: string }; scheme: 'light' | 'dark' }
export function useTheme(): Theme;               // useColorScheme(); null → light
export function makeStyles<T>(factory: (t: Theme) => T): () => T;  // memoised per scheme
```

Screens and components use `const styles = useStyles()` where
`const useStyles = makeStyles((t) => StyleSheet.create({...}))`. The static `theme` export is
removed so nothing can silently stay light-only.

`app.json`: `userInterfaceStyle: "automatic"` stays; `android.backgroundColor` and the root Stack's
`contentStyle` follow the palette; `expo-status-bar` style follows the scheme.

## Components — `src/ui/kit/`

| Component | Role |
|---|---|
| `Screen` | safe-area page, bg colour, scroll or fixed, standard gutters |
| `Title`, `Heading`, `Body`, `Label`, `Caption` | type variants (Fraunces for Title) |
| `Button` | `primary` (accent) · `secondary` (outlined) · `quiet` (text) · `danger`; disabled state; `accessibilityRole="button"` |
| `Card` | surface + line + radius; `tone`: `plain` · `now` (achieve) · `done` · `danger` |
| `Chip` | selectable pill with `accessibilityRole` radio/checkbox and `accessibilityState` |
| `Field` | label + hint + TextInput, themed placeholder/selection colours |
| `StatTile` | hero tile (value + label) |
| `ProgressBar` | track + fill, `accessibilityRole="progressbar"` with value |
| `ProgressRing` | countdown ring built from two rotating half-discs (no SVG) |

Existing `formStyles`, `Hero`, `MilestoneNode`, `ChapterBlock`, `CravingChart`, `ProductPicker`,
`UsageFields`, `QuitMomentPicker` are rebuilt on the kit and the theme.

## Screens

- **Home:** lagoon hero card (Fraunces number, `freeWord · phase`, tiles); chapters with Fraunces
  names; milestone cards with status line, title, body, progress bar, visible source label, and
  the conservative-anchor note; danger banner as a `danger` card; SOS button uses `sos`/`onSos`.
- **SOS:** step label, Fraunces heading, `ProgressRing` around the seconds, instruction, "It
  passed" primary, slip as quiet button; slip screen on the kit.
- **Onboarding, Log, Settings:** same content, on the kit. Log's trigger and scale chips get
  roles and states (closes the review's accessibility minor).

## Icon and splash

- Source: `store-assets/icon/icon.svg` — tally: four mist (`#F2F6F7`) strokes struck by a dawn
  (`#F0A55A`) diagonal on lagoon (`#0E7C86` → `#0E5F69`).
- `store-assets/icon/build.mjs` renders with the system Chrome in headless mode (`--headless
  --screenshot`, the same approach PurePrep and CoreChoice use for their assets) to:
  `assets/icon.png` 1024, `assets/android-icon-foreground.png` 1024 (marks only, inside the 66%
  safe zone), `assets/android-icon-background.png` (lagoon), `assets/android-icon-monochrome.png`
  (white marks on transparent), `assets/splash-icon.png`, and `store-assets/play-icon-512.png`.
- Every PNG is converted to 32-bit RGBA and the build asserts it (IHDR colour type 6).
- Splash background follows the palette (`bg` light / dark).

## Testing

- `src/content/palette.test.ts`:
  - both palettes define the same keys, every value a valid colour;
  - contrast (via pure `src/domain/contrast.ts`): `ink`/`muted` on `bg` and `surface` ≥ 4.5;
    `faint` on `bg`/`surface` ≥ 3; `accentText` on `bg` ≥ 4.5; `onAccent` on `accent` ≥ 4.5;
    `onHero` on `heroFrom` and `heroTo` ≥ 4.5; `onSos` on `sos` ≥ 4.5; `danger` on `dangerWash`
    ≥ 4.5; `achieve` on `achieveWash` ≥ 3; `ink` on `achieveWash`/`doneWash` ≥ 4.5.
- `src/domain/contrast.test.ts`: known pairs (black/white = 21, equal = 1, a mid pair).
- UI: `npm run typecheck`, `npx expo export --platform android`, no remaining import of the old
  static `theme` (grep in the plan's verification step).
- Icon build: the PNG colour-type assertion.
