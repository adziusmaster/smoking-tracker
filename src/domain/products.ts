import type { Audience, CopyVariants, Milestone, ProductId, Settings } from './types';

/** Burned tobacco. Roll-your-own shares every cigarette claim (FDA, ACS, Laugesen 2009). */
export function isCombustible(product: ProductId): boolean {
  return product === 'cigarettes' || product === 'roll-your-own';
}

export function isOral(product: ProductId): boolean {
  return product === 'snus' || product === 'pouches';
}

/**
 * Whether the long-term smoking-recovery milestones apply: the person either smokes the
 * product being quit, or smoked cigarettes before switching to it.
 */
export function hasSmokingHistory(settings: Settings): boolean {
  return isCombustible(settings.product) || settings.cigaretteHistory !== null;
}

export function audienceIncludes(audience: Audience, settings: Settings): boolean {
  const { product } = settings;
  switch (audience) {
    case 'all':
      return true;
    case 'vape':
      return product === 'vape';
    case 'smoked':
      return isCombustible(product);
    case 'smoking-history':
      return hasSmokingHistory(settings);
    case 'snus':
      return product === 'snus';
    case 'oral':
      return isOral(product);
    case 'unknown-long-term':
      return !hasSmokingHistory(settings);
  }
}

/** The milestones this person should see, with any per-product offset and source applied. */
export function applicableMilestones(milestones: Milestone[], settings: Settings): Milestone[] {
  return milestones
    .filter((milestone) => audienceIncludes(milestone.audience, settings))
    .map((milestone) => {
      const override = milestone.overrides?.[settings.product];
      if (!override) return milestone;
      return { ...milestone, offsetMs: override.offsetMs, offsetEndMs: override.offsetEndMs, sourceId: override.sourceId };
    });
}

/**
 * A switcher's smoking-recovery milestones are counted from the final quit date, not from
 * when cigarettes stopped — conservative, and the UI says so.
 */
export function isConservativelyAnchored(milestone: Milestone, settings: Settings): boolean {
  return milestone.audience === 'smoking-history' && !isCombustible(settings.product);
}

/** What a slip can be logged as, own product included: any nicotine product can end a quit. */
export function slipProductOptions(own: ProductId): ProductId[] {
  return ['cigarettes', 'roll-your-own', 'heated', 'vape', own === 'snus' ? 'snus' : 'pouches'];
}

/** A slip's product, with null resolved to the user's own. */
export function slipProductOf(slip: { product: ProductId | null }, own: ProductId): ProductId {
  return slip.product ?? own;
}

/** The copy variant for a given product — e.g. the slip screen follows what was used, not what was quit. */
export function variantForProduct<T>(variants: CopyVariants<T>, product: ProductId): T {
  return isCombustible(product) ? variants.smoke : variants.nicotine;
}

/** Copy that names smoke (carbon monoxide, tar) has a nicotine-only twin for other products. */
export function pickVariant<T>(variants: CopyVariants<T>, settings: Settings): T {
  return isCombustible(settings.product) ? variants.smoke : variants.nicotine;
}
