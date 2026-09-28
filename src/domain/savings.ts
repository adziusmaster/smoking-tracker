import { estimateCigarettesBeforeQuitting } from './lifetime';
import { isCombustible } from './products';
import {
  MINUTES_LOST_PER_CIGARETTE,
  MS_PER_DAY,
  type QuitState,
  type Savings,
  type Settings,
  type SmokingPeriod,
} from './types';

/** Estimated units consumed during logged smoking periods, open periods counted to `now`. */
export function smokedDuringPeriods(periods: SmokingPeriod[], now: Date): number {
  return periods.reduce((total, period) => {
    const start = new Date(period.startedAt).getTime();
    const end = period.endedAt ? new Date(period.endedAt).getTime() : now.getTime();
    const days = Math.max(0, end - start) / MS_PER_DAY;
    return total + days * period.averageUnitsPerDay;
  }, 0);
}

/** Money for `units`, integer arithmetic first and one division last, so nothing drifts. */
export function moneyForUnits(units: number, settings: Settings): number {
  const { cost } = settings;
  return cost.kind === 'pack'
    ? Math.round((units * cost.packPriceMinor) / cost.unitsPerPack)
    : Math.round((units * cost.weeklySpendMinor) / (7 * settings.unitsPerDay));
}

export function computeSavings(state: QuitState, now: Date): Savings {
  const { settings, slips, periods } = state;

  const elapsedDays = Math.max(0, now.getTime() - new Date(settings.quitDate).getTime()) / MS_PER_DAY;
  const wouldHaveUsed = elapsedDays * settings.unitsPerDay;
  const actuallyUsed = slips.reduce((total, slip) => total + slip.unitCount, 0) + smokedDuringPeriods(periods, now);
  const unitsAvoided = Math.max(0, Math.round(wouldHaveUsed - actuallyUsed));

  const combustible = isCombustible(settings.product);
  const before = estimateCigarettesBeforeQuitting(settings);

  return {
    unitsAvoided,
    moneySavedMinor: moneyForUnits(unitsAvoided, settings),
    // The 20-minute figure is measured in cigarettes (Jackson 2025); no equivalent exists for other products.
    minutesNotLost: combustible ? unitsAvoided * MINUTES_LOST_PER_CIGARETTE : null,
    // For a switcher, slips are sticks, pouches or vape sessions — adding them to a cigarette total would mix units.
    lifetimeCigarettes: before === null ? null : combustible ? before + Math.round(actuallyUsed) : before,
  };
}

/**
 * The running lifetime total to quote after logging `extraUnits` more, or null when that
 * sentence would be misleading: no history, or a product whose slips are not cigarettes.
 */
export function lifetimeAfterSlip(state: QuitState, extraUnits: number, now: Date): number | null {
  if (!isCombustible(state.settings.product)) return null;
  const lifetime = computeSavings(state, now).lifetimeCigarettes;
  return lifetime === null ? null : lifetime + extraUnits;
}
