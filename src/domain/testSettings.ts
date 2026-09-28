import type { Settings } from './types';

/** Test fixture: a cigarettes quitter matching the numbers the original tests were written against. */
export function cigaretteSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    quitDate: '2026-06-26T08:00:00+02:00',
    product: 'cigarettes',
    unitsPerDay: 15,
    cost: { kind: 'pack', unitsPerPack: 20, packPriceMinor: 1100 },
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    cigaretteHistory: { months: 96, cigarettesPerDay: 15 },
    ...overrides,
  };
}
