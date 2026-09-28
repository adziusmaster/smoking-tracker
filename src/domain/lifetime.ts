import { isCombustible } from './products';
import { DAYS_PER_MONTH_AVG, type Settings } from './types';

/**
 * Estimated cigarettes smoked before quitting, or null when no cigarette history was given.
 *
 * This is an ESTIMATE and must always be presented as one: it applies one daily rate across
 * the whole history, which overestimates for most people — almost nobody started at the rate
 * they finished on. For combustible products the rate is the current `unitsPerDay`, so
 * correcting the daily rate corrects this figure. For other products it is the separately
 * answered rate from before the user switched.
 */
export function estimateCigarettesBeforeQuitting(settings: Settings): number | null {
  const history = settings.cigaretteHistory;
  if (history === null || history.months <= 0) return null;
  const perDay = isCombustible(settings.product) ? settings.unitsPerDay : history.cigarettesPerDay;
  return Math.round(history.months * DAYS_PER_MONTH_AVG * perDay);
}

/**
 * What the lifetime estimate is made of, rounded for a sentence ("about 15 years at 20 a day"),
 * so the number is never shown without where it came from. Null when there is no history.
 */
export function lifetimeBasis(settings: Settings): { years: number; perDay: number } | null {
  const history = settings.cigaretteHistory;
  if (history === null || history.months <= 0) return null;
  return {
    years: Math.max(1, Math.round(history.months / 12)),
    perDay: isCombustible(settings.product) ? settings.unitsPerDay : history.cigarettesPerDay,
  };
}
