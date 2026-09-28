import { estimateCigarettesBeforeQuitting } from './lifetime';
import { isCombustible, slipProductOf } from './products';
import {
  MINUTES_LOST_PER_CIGARETTE,
  MS_PER_DAY,
  type QuitState,
  type Savings,
  type ProductId,
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
  const own = settings.product;

  const elapsedDays = Math.max(0, now.getTime() - new Date(settings.quitDate).getTime()) / MS_PER_DAY;
  const wouldHaveUsed = elapsedDays * settings.unitsPerDay;
  // Only slips of the product being quit come off "units not used": two cigarettes are not
  // sticks you failed to avoid. Every slip still restarts the fast clocks (see anchors.ts).
  const ownSlipUnits = slips
    .filter((slip) => slipProductOf(slip, own) === own)
    .reduce((total, slip) => total + slip.unitCount, 0);
  const periodUnits = smokedDuringPeriods(periods, now);
  const unitsAvoided = Math.max(0, Math.round(wouldHaveUsed - ownSlipUnits - periodUnits));

  const combustible = isCombustible(own);
  const before = estimateCigarettesBeforeQuitting(settings);
  // Cigarettes and roll-ups from any slip are cigarettes; for a smoker, relapse periods are too.
  const cigaretteSlips = slips
    .filter((slip) => isCombustible(slipProductOf(slip, own)))
    .reduce((total, slip) => total + slip.unitCount, 0);
  const smokedSince = cigaretteSlips + (combustible ? periodUnits : 0);

  return {
    unitsAvoided,
    moneySavedMinor: moneyForUnits(unitsAvoided, settings),
    // The 20-minute figure is measured in cigarettes (Jackson 2025); no equivalent exists for other products.
    minutesNotLost: combustible ? unitsAvoided * MINUTES_LOST_PER_CIGARETTE : null,
    lifetimeCigarettes: before === null ? null : before + Math.round(smokedSince),
  };
}

/**
 * The running lifetime cigarette total to quote after logging `extraUnits` of `product`, or null
 * when that sentence would be misleading: no cigarette history, or a slip that was not cigarettes.
 */
export function lifetimeAfterSlip(state: QuitState, extraUnits: number, product: ProductId, now: Date): number | null {
  if (!isCombustible(product)) return null;
  const lifetime = computeSavings(state, now).lifetimeCigarettes;
  return lifetime === null ? null : lifetime + extraUnits;
}
