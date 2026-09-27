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
    return total + days * period.averageUnitsPerDay;
  }, 0);
}

export function computeSavings(state: QuitState, now: Date): Savings {
  const { settings, slips, periods } = state;

  const elapsedDays = Math.max(0, now.getTime() - new Date(settings.quitDate).getTime()) / MS_PER_DAY;
  const wouldHaveSmoked = elapsedDays * settings.unitsPerDay;

  const slipUnits = slips.reduce((total, slip) => total + slip.unitCount, 0);
  const periodUnits = smokedDuringPeriods(periods, now);
  const actuallySmoked = slipUnits + periodUnits;

  const unitsAvoided = Math.max(0, Math.round(wouldHaveSmoked - actuallySmoked));
  const { cost } = settings;
  const before = estimateCigarettesBeforeQuitting(settings);

  return {
    unitsAvoided,
    // Integer arithmetic first, then divide, so pack price never drifts through a float.
    moneySavedMinor: cost.kind === 'pack'
      ? Math.round((unitsAvoided * cost.packPriceMinor) / cost.unitsPerPack)
      : Math.round((unitsAvoided * cost.weeklySpendMinor) / (7 * settings.unitsPerDay)),
    minutesNotLost: unitsAvoided * MINUTES_LOST_PER_CIGARETTE,
    lifetimeCigarettes: before === null ? null : before + Math.round(actuallySmoked),
  };
}
