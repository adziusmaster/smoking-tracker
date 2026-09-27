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
  const perDay = settings.product === 'cigarettes' || settings.product === 'roll-your-own'
    ? settings.unitsPerDay
    : history.cigarettesPerDay;
  return Math.round(history.months * DAYS_PER_MONTH_AVG * perDay);
}
