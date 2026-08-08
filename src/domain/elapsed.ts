import { type Elapsed, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from './types';

/**
 * Absolute duration between an ISO anchor and `now`, broken into days/hours/minutes.
 * Clamped at zero so a backdated-in-the-future anchor never renders a negative streak.
 */
export function elapsedSince(anchorIso: string, now: Date): Elapsed {
  const totalMs = Math.max(0, now.getTime() - new Date(anchorIso).getTime());

  return {
    totalMs,
    days: Math.floor(totalMs / MS_PER_DAY),
    hours: Math.floor((totalMs % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((totalMs % MS_PER_HOUR) / MS_PER_MINUTE),
  };
}
