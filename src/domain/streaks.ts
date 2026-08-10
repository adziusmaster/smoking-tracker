import { elapsedBetween } from './elapsed';
import type { QuitState, SmokingPeriod, Streak } from './types';

/**
 * Chronological order. `SELECT_SMOKING_PERIODS` returns rows newest-first, so the input
 * order is never assumed here — the streak boundaries only make sense oldest-first.
 */
function oldestFirst(periods: SmokingPeriod[]): SmokingPeriod[] {
  return [...periods].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
}

function makeStreak(startedAt: string, endedAt: string, isCurrent: boolean): Streak {
  return { startedAt, endedAt, elapsed: elapsedBetween(startedAt, endedAt), isCurrent };
}

/**
 * Every smoke-free run the stored facts describe, oldest first.
 *
 * The boundaries are the smoking periods, never the slips: a slip restarts the fast
 * anchor but does not interrupt sustained cessation, which is what every risk-reduction
 * figure in the literature is measured from.
 *
 *   quitDate            → first period's startedAt
 *   period.endedAt      → next period's startedAt
 *   last period.endedAt → now                      (the run still in progress)
 *
 * While a period is open there is no run in progress, so the list simply ends at that
 * period's `startedAt`. That is what keeps "best run" fixed while the user is smoking.
 */
export function smokeFreeStreaks(state: QuitState, now: Date): Streak[] {
  const streaks: Streak[] = [];
  let openedAt: string | null = state.settings.quitDate;

  for (const period of oldestFirst(state.periods)) {
    // `openedAt === null` means an earlier period never closed, so nothing after it is
    // a smoke-free run at all. Defensive: the schema allows only one open period.
    if (openedAt === null) break;
    streaks.push(makeStreak(openedAt, period.startedAt, false));
    openedAt = period.endedAt;
  }

  if (openedAt !== null) streaks.push(makeStreak(openedAt, now.toISOString(), true));

  return streaks;
}

/**
 * The longest smoke-free run so far — the honest version of "your best run".
 *
 * This is deliberately NOT `elapsedSince(anchors.cumulative, now)`: an open smoking
 * period does not move the cumulative anchor, so that figure keeps growing while the
 * user is actively smoking and claims a streak they are not on. Ties keep the earlier
 * run, so the answer is stable as the clock ticks.
 */
export function longestSmokeFreeStreak(state: QuitState, now: Date): Streak {
  const streaks = smokeFreeStreaks(state, now);

  // The quit date always opens a run, so `streaks` is never empty; the fallback exists
  // only so this function is total without a non-null assertion.
  let best = streaks[0] ?? makeStreak(state.settings.quitDate, state.settings.quitDate, false);
  for (const candidate of streaks) {
    if (candidate.elapsed.totalMs > best.elapsed.totalMs) best = candidate;
  }

  return best;
}
