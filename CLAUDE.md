# Smoking Tracker

Offline-first Android quit-smoking tracker. Expo SDK 57 + expo-router, TypeScript strict,
expo-sqlite. No backend, no network calls, no analytics.

The repository's global .NET standards do not apply here. These are the equivalents.

## Layering

- `src/domain/` is PURE. No React, no `expo-*`, no `src/data/` imports, no I/O.
  `now: Date` is always a parameter — never call `Date.now()` or argless `new Date()`.
- `src/content/` is static data with no logic.
- `src/data/` holds SQL as exported string constants (`schema.ts`, `queries.ts`) plus a
  thin `expo-sqlite` binding. SQL constants are tested in Node with better-sqlite3
  because `expo-sqlite` is a native module and cannot run under Vitest.
- `app/` renders view models. Screens contain no arithmetic.

## Rules

- `strict: true`, no `any`, no `@ts-ignore` without a comment naming the upstream issue.
- Money is integer minor units; field names end in `Minor`.
- Every milestone carries a `sourceId` that resolves in `src/content/sources.ts`.
- Never render a fabricated "days of healing lost" figure. See the design spec.

## Testing

Vitest. `function_stateUnderTest_expectedBehavior` naming, strict AAA with
`// Arrange` / `// Act` / `// Assert` comments. Minimum one happy path and two
sad paths or edge cases per module.

## Commands

`npm test` · `npm run typecheck` · `npm start` · `npm run android`
