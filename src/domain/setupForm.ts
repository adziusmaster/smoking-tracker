import { parseMinorUnits, parseNonNegativeInt, parsePositiveInt } from './parse';
import { isCombustible } from './products';
import type { CigaretteHistory, CostModel, ProductId, Settings } from './types';

export const MAX_HISTORY_YEARS = 80;

/** What the onboarding and Settings forms hold: raw text, exactly as typed. */
export interface SetupFormValues {
  product: ProductId;
  unitsPerDay: string;
  unitsPerPack: string;
  packPrice: string;
  weeklySpend: string;
  /** Only read for non-combustible products. */
  smokedBefore: boolean;
  historyYears: string;
  historyMonths: string;
  /** Only read for non-combustible products with smokedBefore. */
  priorPerDay: string;
}

export interface SetupLabels {
  perDay: string;
  perPack: string | null;
  packPrice: string | null;
}

export type SetupResult = { ok: true; settings: Settings } | { ok: false; error: string };

const fail = (error: string): SetupResult => ({ ok: false, error });

/**
 * The one place onboarding and Settings turn typed text into Settings, so both accept and
 * reject exactly the same input. Fields that do not belong to the chosen product are ignored,
 * which is what lets a user switch product without clearing the old fields first.
 */
export function parseSetupForm(
  values: SetupFormValues,
  context: { quitMoment: Date; now: Date; currency: string; timezone: string; labels: SetupLabels },
): SetupResult {
  const { labels } = context;
  const unitsPerDay = parsePositiveInt(values.unitsPerDay);
  if (unitsPerDay === null) return fail(`${labels.perDay} must be a whole number above zero.`);

  let cost: CostModel;
  if (values.product === 'vape') {
    const weeklySpendMinor = parseMinorUnits(values.weeklySpend);
    if (weeklySpendMinor === null) return fail('Weekly spend must look like 15 or 15.50.');
    cost = { kind: 'weekly', weeklySpendMinor };
  } else {
    const unitsPerPack = parsePositiveInt(values.unitsPerPack);
    if (unitsPerPack === null) return fail(`${labels.perPack ?? 'Per pack'} must be a whole number above zero.`);
    const packPriceMinor = parseMinorUnits(values.packPrice);
    if (packPriceMinor === null) return fail(`${labels.packPrice ?? 'Price'} must look like 11 or 11.50.`);
    cost = { kind: 'pack', unitsPerPack, packPriceMinor };
  }

  const combustible = isCombustible(values.product);
  let cigaretteHistory: CigaretteHistory | null = null;
  if (combustible || values.smokedBefore) {
    // Blank means "not given"; a non-empty unreadable value is an error, never a silent zero.
    const years = values.historyYears.trim() === '' ? 0 : parseNonNegativeInt(values.historyYears);
    const months = values.historyMonths.trim() === '' ? 0 : parseNonNegativeInt(values.historyMonths);
    if (years === null) return fail('Years must be a whole number, or left blank.');
    if (months === null) return fail('Months must be a whole number, or left blank.');
    if (years > MAX_HISTORY_YEARS) return fail(`Years must be ${MAX_HISTORY_YEARS} or fewer.`);
    const totalMonths = years * 12 + months;

    if (combustible) {
      cigaretteHistory = totalMonths > 0 ? { months: totalMonths, cigarettesPerDay: unitsPerDay } : null;
    } else {
      const priorPerDay = parsePositiveInt(values.priorPerDay);
      if (priorPerDay === null) return fail('Cigarettes per day must be a whole number above zero.');
      if (totalMonths === 0) return fail('How long did you smoke? Enter years, months, or both.');
      cigaretteHistory = { months: totalMonths, cigarettesPerDay: priorPerDay };
    }
  }

  if (context.quitMoment.getTime() > context.now.getTime()) return fail('Your quit date cannot be in the future.');

  return {
    ok: true,
    settings: {
      quitDate: context.quitMoment.toISOString(),
      product: values.product,
      unitsPerDay,
      cost,
      currency: context.currency,
      timezone: context.timezone,
      cigaretteHistory,
    },
  };
}

const money = (minor: number) => (minor / 100).toFixed(2);

export function valuesFromSettings(settings: Settings): SetupFormValues {
  const history = settings.cigaretteHistory;
  const combustible = isCombustible(settings.product);
  return {
    product: settings.product,
    unitsPerDay: String(settings.unitsPerDay),
    unitsPerPack: settings.cost.kind === 'pack' ? String(settings.cost.unitsPerPack) : '',
    packPrice: settings.cost.kind === 'pack' ? money(settings.cost.packPriceMinor) : '',
    weeklySpend: settings.cost.kind === 'weekly' ? money(settings.cost.weeklySpendMinor) : '',
    smokedBefore: history !== null && !combustible,
    historyYears: history ? String(Math.floor(history.months / 12)) : '',
    historyMonths: history ? String(history.months % 12) : '',
    priorPerDay: history && !combustible ? String(history.cigarettesPerDay) : '',
  };
}

export function defaultValues(product: ProductId, defaultPerPack: number | null): SetupFormValues {
  return {
    product,
    unitsPerDay: '',
    unitsPerPack: defaultPerPack === null ? '' : String(defaultPerPack),
    packPrice: '',
    weeklySpend: '',
    smokedBefore: false,
    historyYears: '',
    historyMonths: '',
    priorPerDay: '',
  };
}

/**
 * Settings lets the user change product in place. Everything they already typed is kept (the
 * parser ignores fields that do not belong to the new product); only a blank per-pack field is
 * filled with the new product's default.
 */
export function switchProduct(values: SetupFormValues, product: ProductId, defaultPerPack: number | null): SetupFormValues {
  const unitsPerPack = values.unitsPerPack.trim() === '' && defaultPerPack !== null ? String(defaultPerPack) : values.unitsPerPack;
  return { ...values, product, unitsPerPack };
}
