import type { ProductId, UnitWords } from '@/domain/types';

/** Everything a screen says that depends on what the user is quitting. Static data, no logic. */
export interface ProductContent {
  id: ProductId;
  label: string;
  hint: string;
  unit: UnitWords;
  /** "smoke-free" only where the product is smoked. */
  freeWord: string;
  avoidedLabel: string;
  cravingButton: string;
  slipVerb: string;
  relapseTitle: string;
  /** Vape slips are one session each; there is nothing meaningful to count. */
  countsSlips: boolean;
  perDayLabel: string;
  perPackLabel: string | null;
  packPriceLabel: string | null;
  defaultPerPack: number | null;
}

export const PRODUCT_CONTENT: Record<ProductId, ProductContent> = {
  cigarettes: {
    id: 'cigarettes',
    label: 'Cigarettes',
    hint: 'Factory-made',
    unit: { one: 'cigarette', many: 'cigarettes' },
    freeWord: 'smoke-free',
    avoidedLabel: 'not smoked',
    cravingButton: 'I want to smoke',
    slipVerb: 'I smoked',
    relapseTitle: 'You’re smoking again right now',
    countsSlips: true,
    perDayLabel: 'Cigarettes per day',
    perPackLabel: 'Cigarettes per pack',
    packPriceLabel: 'Price per pack',
    defaultPerPack: 20,
  },
  'roll-your-own': {
    id: 'roll-your-own',
    label: 'Roll-your-own',
    hint: 'Hand-rolled tobacco',
    unit: { one: 'roll-up', many: 'roll-ups' },
    freeWord: 'smoke-free',
    avoidedLabel: 'not smoked',
    cravingButton: 'I want to smoke',
    slipVerb: 'I smoked',
    relapseTitle: 'You’re smoking again right now',
    countsSlips: true,
    perDayLabel: 'Roll-ups per day',
    perPackLabel: 'Roll-ups per pouch of tobacco',
    packPriceLabel: 'Price per pouch',
    defaultPerPack: null,
  },
  heated: {
    id: 'heated',
    label: 'Heated tobacco',
    hint: 'IQOS, glo and similar',
    unit: { one: 'stick', many: 'sticks' },
    freeWord: 'nicotine-free',
    avoidedLabel: 'sticks not used',
    cravingButton: 'I want a stick',
    slipVerb: 'I used a stick',
    relapseTitle: 'You’re using heated tobacco again right now',
    countsSlips: true,
    perDayLabel: 'Sticks per day',
    perPackLabel: 'Sticks per pack',
    packPriceLabel: 'Price per pack',
    defaultPerPack: 20,
  },
  vape: {
    id: 'vape',
    label: 'Vape',
    hint: 'E-cigarettes, disposables, pods',
    unit: { one: 'vape', many: 'vapes' },
    freeWord: 'nicotine-free',
    avoidedLabel: 'vapes skipped (approx.)',
    cravingButton: 'I want to vape',
    slipVerb: 'I vaped',
    relapseTitle: 'You’re vaping again right now',
    countsSlips: false,
    perDayLabel: 'Uses per day',
    perPackLabel: null,
    packPriceLabel: null,
    defaultPerPack: null,
  },
  snus: {
    id: 'snus',
    label: 'Snus',
    hint: 'Tobacco pouches',
    unit: { one: 'pouch', many: 'pouches' },
    freeWord: 'nicotine-free',
    avoidedLabel: 'pouches not used',
    cravingButton: 'I want a pouch',
    slipVerb: 'I used a pouch',
    relapseTitle: 'You’re using snus again right now',
    countsSlips: true,
    perDayLabel: 'Pouches per day',
    perPackLabel: 'Pouches per can',
    packPriceLabel: 'Price per can',
    defaultPerPack: 20,
  },
  pouches: {
    id: 'pouches',
    label: 'Nicotine pouches',
    hint: 'Tobacco-free, e.g. Zyn or Velo',
    unit: { one: 'pouch', many: 'pouches' },
    freeWord: 'nicotine-free',
    avoidedLabel: 'pouches not used',
    cravingButton: 'I want a pouch',
    slipVerb: 'I used a pouch',
    relapseTitle: 'You’re using pouches again right now',
    countsSlips: true,
    perDayLabel: 'Pouches per day',
    perPackLabel: 'Pouches per can',
    packPriceLabel: 'Price per can',
    defaultPerPack: 20,
  },
};

/** Onboarding shows snus and tobacco-free pouches as one card, then asks which. */
export const PICKER_CARDS: { key: string; label: string; hint: string; products: ProductId[] }[] = [
  { key: 'cigarettes', label: 'Cigarettes', hint: 'Factory-made', products: ['cigarettes'] },
  { key: 'roll-your-own', label: 'Roll-your-own', hint: 'Hand-rolled tobacco', products: ['roll-your-own'] },
  { key: 'heated', label: 'Heated tobacco', hint: 'IQOS, glo and similar', products: ['heated'] },
  { key: 'vape', label: 'Vape', hint: 'E-cigarettes, disposables, pods', products: ['vape'] },
  { key: 'oral', label: 'Pouches or snus', hint: 'Zyn, Velo, snus', products: ['snus', 'pouches'] },
];

/** "How often" chips for vape, filling an editable uses-per-day number. */
export const VAPE_FREQUENCY_CHIPS: { label: string; usesPerDay: number }[] = [
  { label: 'A few times a day', usesPerDay: 5 },
  { label: 'About every hour', usesPerDay: 15 },
  { label: 'Constantly', usesPerDay: 30 },
];
