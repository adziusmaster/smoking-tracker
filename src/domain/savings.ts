import { estimateCigarettesBeforeQuitting } from './lifetime';
import {
  MINUTES_LOST_PER_CIGARETTE,
  MS_PER_DAY,
  type QuitState,
  type Savings,
  type SmokingPeriod,
} from './types';

/** Estimated cigarettes consumed during logged smoking periods, open periods counted to `now`. */
export function smokedDuringPeriods(periods: SmokingPeriod[], now: Date): number {
  return periods.reduce((total, period) => {
    const start = new Date(period.startedAt).getTime();
    const end = period.endedAt ? new Date(period.endedAt).getTime() : now.getTime();
    const days = Math.max(0, end - start) / MS_PER_DAY;
    return total + days * period.averageCigarettesPerDay;
  }, 0);
}

export function computeSavings(state: QuitState, now: Date): Savings {
  const { settings, slips, periods } = state;

  const elapsedDays = Math.max(0, now.getTime() - new Date(settings.quitDate).getTime()) / MS_PER_DAY;
  const wouldHaveSmoked = elapsedDays * settings.cigarettesPerDay;

  const slipCigarettes = slips.reduce((total, slip) => total + slip.cigaretteCount, 0);
  const periodCigarettes = smokedDuringPeriods(periods, now);
  const actuallySmoked = slipCigarettes + periodCigarettes;

  const cigarettesAvoided = Math.max(0, Math.round(wouldHaveSmoked - actuallySmoked));

  return {
    cigarettesAvoided,
    // Integer arithmetic first, then divide, so pack price never drifts through a float.
    moneySavedMinor: Math.round((cigarettesAvoided * settings.packPriceMinor) / settings.cigarettesPerPack),
    minutesNotLost: cigarettesAvoided * MINUTES_LOST_PER_CIGARETTE,
    lifetimeTotal: estimateCigarettesBeforeQuitting(settings) + Math.round(actuallySmoked),
  };
}
