import { DAYS_PER_MONTH_AVG, type Settings } from './types';

/**
 * How many cigarettes the user probably smoked before quitting.
 *
 * This is an ESTIMATE and must always be presented as one. It applies the user's CURRENT
 * daily rate across their whole smoking history, which overestimates for most people —
 * almost nobody started at the rate they finished on. We ask "how long did you smoke?"
 * because that is a question people can answer; "how many cigarettes have you smoked?"
 * is not.
 */
export function estimateCigarettesBeforeQuitting(settings: Settings): number {
  const days = Math.max(0, settings.smokedForMonths) * DAYS_PER_MONTH_AVG;
  return Math.round(days * settings.cigarettesPerDay);
}
