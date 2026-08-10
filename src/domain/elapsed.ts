import { type Elapsed, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from './types';

/**
 * Breaks a duration in milliseconds into days/hours/minutes.
 * Clamped at zero so an inverted interval never renders a negative duration.
 */
function elapsedOfMs(rawTotalMs: number): Elapsed {
  const totalMs = Math.max(0, rawTotalMs);

  return {
    totalMs,
    days: Math.floor(totalMs / MS_PER_DAY),
    hours: Math.floor((totalMs % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((totalMs % MS_PER_HOUR) / MS_PER_MINUTE),
  };
}

/**
 * Absolute duration between an ISO anchor and `now`, broken into days/hours/minutes.
 * Clamped at zero so a backdated-in-the-future anchor never renders a negative streak.
 */
export function elapsedSince(anchorIso: string, now: Date): Elapsed {
  return elapsedOfMs(now.getTime() - new Date(anchorIso).getTime());
}

/**
 * Absolute duration between two ISO timestamps. Used for intervals that have already
 * closed — a past smoke-free run does not end at `now`, so it must not be measured
 * against the ticking clock.
 */
export function elapsedBetween(startIso: string, endIso: string): Elapsed {
  return elapsedOfMs(new Date(endIso).getTime() - new Date(startIso).getTime());
}
