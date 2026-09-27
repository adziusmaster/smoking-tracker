export type SlipBehavior = 'restarts' | 'cumulative' | 'qualitative';
export type SlipTrigger = 'alcohol' | 'stress' | 'social' | 'boredom' | 'routine' | 'other';
export type PhaseId = 'crash' | 'fog' | 'consolidation' | 'long-haul' | 'non-smoker';
export type MilestoneStatus = 'reached' | 'in-progress' | 'future';
export type SourceTier = 'a' | 'b';

/**
 * Who a milestone applies to. See src/domain/products.ts#audienceIncludes and the spec's
 * milestone table: `smoked` is short-term smoke recovery (combustible products only);
 * `smoking-history` is the long-term smoking-risk curves, which also apply to a switcher.
 */
export type Audience = 'all' | 'inhaled' | 'smoked' | 'smoking-history' | 'snus' | 'oral' | 'unknown-long-term';

/** Copy that names smoke has a nicotine-only twin for products that burn nothing. */
export interface CopyVariants<T> {
  smoke: T;
  nicotine: T;
}

export type ProductId = 'cigarettes' | 'roll-your-own' | 'heated' | 'vape' | 'snus' | 'pouches';

export const PRODUCT_IDS: readonly ProductId[] = ['cigarettes', 'roll-your-own', 'heated', 'vape', 'snus', 'pouches'];

/** Pack-priced products (cigarettes, sticks, cans of pouches) or a weekly spend (vape). */
export type CostModel =
  | { kind: 'pack'; unitsPerPack: number; packPriceMinor: number }
  | { kind: 'weekly'; weeklySpendMinor: number };

export interface CigaretteHistory {
  months: number;
  cigarettesPerDay: number;
}

export interface Settings {
  quitDate: string;            // always `date.toISOString()` — UTC, ending 'Z'
  product: ProductId;
  /** Cigarettes, sticks, pouches or vape uses per day, in the product's own unit. */
  unitsPerDay: number;
  /** 'weekly' exactly when product is 'vape'. */
  cost: CostModel;
  currency: string;            // ISO 4217
  timezone: string;            // IANA
  /**
   * Cigarette smoking history, or null if none was given. The lifetime cigarette estimate is
   * DERIVED from it (see src/domain/lifetime.ts). For cigarettes and roll-your-own the rate is
   * the current unitsPerDay, so correcting the daily rate corrects the total.
   */
  cigaretteHistory: CigaretteHistory | null;
}

export interface Slip {
  id: number;
  occurredAt: string;
  /** Units of the product being quit (cigarettes, sticks, pouches; 1 for a vape session). */
  unitCount: number;
  trigger: SlipTrigger | null;
  note: string | null;
}

export interface SmokingPeriod {
  id: number;
  startedAt: string;
  endedAt: string | null;      // null means currently smoking
  averageUnitsPerDay: number;
  note: string | null;
}

/** Every stored fact the domain needs. */
export interface QuitState {
  settings: Settings;
  slips: Slip[];
  periods: SmokingPeriod[];
}

export interface Elapsed {
  totalMs: number;
  days: number;
  hours: number;    // remainder after days
  minutes: number;  // remainder after hours
}

/** One smoke-free run, bounded by the quit date and the smoking periods around it. */
export interface Streak {
  startedAt: string;
  /** Where the run stopped: a smoking period's `startedAt`, or `now` while it is still running. */
  endedAt: string;
  elapsed: Elapsed;
  /** True only for the run that is still going, i.e. the one ending at `now`. */
  isCurrent: boolean;
}

export interface Anchors {
  /** Most recent nicotine intake; falls back to quitDate. Drives `restarts` milestones. */
  fast: string;
  /** End of most recent completed smoking period; falls back to quitDate. Drives `cumulative`. */
  cumulative: string;
  isCurrentlySmoking: boolean;
}

export interface Savings {
  unitsAvoided: number;
  moneySavedMinor: number;
  /** null unless the product is combustible — the 20-minute figure is measured in cigarettes. */
  minutesNotLost: number | null;
  /** Estimated cigarettes smoked in total; null when there is no cigarette history. */
  lifetimeCigarettes: number | null;
}

export interface Source {
  id: string;
  label: string;
  url: string;
  tier: SourceTier;
}

export interface Milestone {
  id: string;
  title: string;
  body: string;
  /** null only when slipBehavior is 'qualitative'. */
  offsetMs: number | null;
  /** Upper bound for ranged milestones such as 1-12 months; null otherwise. */
  offsetEndMs: number | null;
  slipBehavior: SlipBehavior;
  sourceId: string;
  phaseId: PhaseId;
  audience: Audience;
  /** Replaces offsetMs / offsetEndMs / sourceId for the listed products. */
  overrides?: Partial<Record<ProductId, MilestoneOverride>>;
}

export interface MilestoneOverride {
  offsetMs: number | null;
  offsetEndMs: number | null;
  sourceId: string;
}

export interface MilestoneState {
  milestone: Milestone;
  status: MilestoneStatus;
  reachedAt: string | null;
  projectedAt: string | null;
  /** 0..1, only for an in-progress ranged milestone; null otherwise. */
  progress: number | null;
  /** A switcher's smoking-recovery milestone, counted conservatively from the final quit date. */
  conservativelyAnchored: boolean;
}

export interface Phase {
  id: PhaseId;
  name: string;
  startMs: number;
  endMs: number | null;        // null means open-ended
  whatsHappening: string;
  /** Replaces whatsHappening for products that burn nothing. */
  whatsHappeningNicotine: string;
  /** Replaces the nicotine text for snus and pouches, where one exists. */
  whatsHappeningOral: string | null;
  whyYouFeelThisWay: string;
  howToCope: readonly string[];
  /** Appended to howToCope only for combustible products (cilia, tar). */
  howToCopeSmokeOnly: readonly string[];
  /** Replaces name for non-combustible products ("Non-Smoker" → "Nicotine-Free"). */
  nameNicotine: string | null;
}

export interface UnitWords {
  one: string;
  many: string;
}

export interface TipContent {
  whatsHappening: string;
  whyYouFeelThisWay: string;
  howToCope: readonly string[];
}

/** The post-slip tip set. Its first line names carbon monoxide, hence the variants. */
export interface DangerTips {
  whatsHappening: CopyVariants<string>;
  whyYouFeelThisWay: string;
  howToCope: readonly string[];
}

export interface DangerWindow {
  active: boolean;
  endsAt: string | null;
  daysRemaining: number | null;
  triggeredBySlipId: number | null;
}

export interface Chapter {
  phase: Phase;
  status: 'past' | 'current' | 'future';
  milestones: MilestoneState[];
}

export interface TimelineViewModel {
  elapsed: Elapsed;
  /** Longest smoke-free run so far. Fixed while a smoking period is open — see `streaks.ts`. */
  longestStreak: Streak;
  savings: Savings;
  anchors: Anchors;
  currentPhase: Phase;
  dangerWindow: DangerWindow;
  chapters: Chapter[];
  nextMilestone: MilestoneState | null;
  /** Tips for the current chapter: the danger-window set while it is open, else the phase's own. */
  currentTips: TipContent;
  currentTipsAreDangerWindow: boolean;
}

export const MINUTES_LOST_PER_CIGARETTE = 20;
export const DANGER_WINDOW_DAYS = 19;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
/** Mean days per month. The same figure src/content/phases.ts uses for MONTHS(). */
export const DAYS_PER_MONTH_AVG = 30.44;
