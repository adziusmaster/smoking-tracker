import type { CostModel, ProductId, Settings } from '@/domain/types';

/**
 * Column names predate multi-product support and are deliberately NOT renamed (a SQLite
 * column rename rebuilds the table and buys only tidiness). Read them as:
 *   cigarettes_per_day   → units per day, in the product's unit
 *   cigarettes_per_pack  → units per pack/pouch/can; placeholder 1 for vape
 *   pack_price_minor     → pack price; placeholder 0 for vape
 *   smoked_for_months    → months of CIGARETTE smoking, for every product
 * This file is the only place that knows the mapping. Pure, so it is tested in Node.
 */
export interface SettingsRow {
  quit_date: string;
  cigarettes_per_day: number;
  cigarettes_per_pack: number;
  pack_price_minor: number;
  currency: string;
  timezone: string;
  smoked_for_months: number;
  product: ProductId;
  weekly_spend_minor: number | null;
  prior_cigarettes_per_day: number | null;
}

const VAPE_PLACEHOLDER_PER_PACK = 1;
const VAPE_PLACEHOLDER_PRICE = 0;

function isCombustibleId(product: ProductId): boolean {
  return product === 'cigarettes' || product === 'roll-your-own';
}

export function rowToSettings(row: SettingsRow): Settings {
  let cost: CostModel;
  if (row.product === 'vape') {
    // A vape row without a weekly spend can only come from a bug; NaN money is worse than a
    // loud failure, and useQuitState surfaces the error instead of redirecting to onboarding.
    if (row.weekly_spend_minor === null) throw new Error('vape settings row has no weekly_spend_minor');
    cost = { kind: 'weekly', weeklySpendMinor: row.weekly_spend_minor };
  } else {
    cost = { kind: 'pack', unitsPerPack: row.cigarettes_per_pack, packPriceMinor: row.pack_price_minor };
  }

  let cigaretteHistory: Settings['cigaretteHistory'] = null;
  if (row.smoked_for_months > 0) {
    if (isCombustibleId(row.product)) {
      cigaretteHistory = { months: row.smoked_for_months, cigarettesPerDay: row.cigarettes_per_day };
    } else if (row.prior_cigarettes_per_day !== null) {
      cigaretteHistory = { months: row.smoked_for_months, cigarettesPerDay: row.prior_cigarettes_per_day };
    }
  }

  return {
    quitDate: row.quit_date,
    product: row.product,
    unitsPerDay: row.cigarettes_per_day,
    cost,
    currency: row.currency,
    timezone: row.timezone,
    cigaretteHistory,
  };
}

/**
 * For the export only: a row the app cannot read must still leave the building, because the
 * export is the user's only backup. Normal loading keeps failing loudly via rowToSettings.
 */
export function readableSettingsOrRaw(
  row: SettingsRow,
): { readable: true; settings: Settings } | { readable: false; row: SettingsRow; reason: string } {
  try {
    return { readable: true, settings: rowToSettings(row) };
  } catch (caught) {
    return { readable: false, row, reason: caught instanceof Error ? caught.message : String(caught) };
  }
}

/** Positional parameters for UPSERT_SETTINGS, minus the two trailing timestamps. */
export function settingsToParams(
  settings: Settings,
): [string, number, number, number, string, string, number, ProductId, number | null, number | null] {
  const perPack = settings.cost.kind === 'pack' ? settings.cost.unitsPerPack : VAPE_PLACEHOLDER_PER_PACK;
  const price = settings.cost.kind === 'pack' ? settings.cost.packPriceMinor : VAPE_PLACEHOLDER_PRICE;
  const weekly = settings.cost.kind === 'weekly' ? settings.cost.weeklySpendMinor : null;
  const history = settings.cigaretteHistory;
  const prior = history !== null && !isCombustibleId(settings.product) ? history.cigarettesPerDay : null;

  return [
    settings.quitDate,
    settings.unitsPerDay,
    perPack,
    price,
    settings.currency,
    settings.timezone,
    history?.months ?? 0,
    settings.product,
    weekly,
    prior,
  ];
}
