import type { Elapsed } from './types';

const SYMBOLS: Record<string, string> = { EUR: '€', GBP: '£', USD: '$', PLN: 'zł' };

export function formatMoneyMinor(minor: number, currency: string): string {
  const major = (minor / 100).toFixed(2);
  const symbol = SYMBOLS[currency];
  return symbol ? `${symbol}${major}` : `${currency} ${major}`;
}

function plural(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

export function formatElapsed(elapsed: Elapsed): string {
  if (elapsed.days > 0) return `${plural(elapsed.days, 'day')}, ${plural(elapsed.hours, 'hour')}`;
  if (elapsed.hours > 0) return `${plural(elapsed.hours, 'hour')}, ${plural(elapsed.minutes, 'minute')}`;
  return plural(elapsed.minutes, 'minute');
}

/** Floors rather than rounds, so the app never overstates the benefit. */
export function formatMinutesNotLost(minutes: number): string {
  const days = Math.floor(minutes / (60 * 24));
  if (days >= 1) return plural(days, 'day');
  return plural(Math.floor(minutes / 60), 'hour');
}

export function formatMilestoneDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
