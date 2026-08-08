export type SlipBehavior = 'restarts' | 'cumulative' | 'qualitative';
export type SlipTrigger = 'alcohol' | 'stress' | 'social' | 'boredom' | 'routine' | 'other';
export type PhaseId = 'crash' | 'fog' | 'consolidation' | 'long-haul' | 'non-smoker';
export type MilestoneStatus = 'reached' | 'in-progress' | 'future';
export type SourceTier = 'a' | 'b';

export interface Settings {
  quitDate: string;            // ISO 8601 with offset
  cigarettesPerDay: number;
  cigarettesPerPack: number;
  packPriceMinor: number;      // integer minor units
  currency: string;            // ISO 4217
  timezone: string;            // IANA
  lifetimeBaseline: number;    // cigarettes smoked before quitting; 0 if unknown
}

export interface Slip {
  id: number;
  occurredAt: string;
  cigaretteCount: number;
  trigger: SlipTrigger | null;
  note: string | null;
}

export interface SmokingPeriod {
  id: number;
  startedAt: string;
  endedAt: string | null;      // null means currently smoking
  averageCigarettesPerDay: number;
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

export interface Anchors {
  /** Most recent nicotine intake; falls back to quitDate. Drives `restarts` milestones. */
  fast: string;
  /** End of most recent completed smoking period; falls back to quitDate. Drives `cumulative`. */
  cumulative: string;
  isCurrentlySmoking: boolean;
}

export interface Savings {
  cigarettesAvoided: number;
  moneySavedMinor: number;
  minutesNotLost: number;
  lifetimeTotal: number;
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
}

export interface MilestoneState {
  milestone: Milestone;
  status: MilestoneStatus;
  reachedAt: string | null;
  projectedAt: string | null;
  /** 0..1, only for an in-progress ranged milestone; null otherwise. */
  progress: number | null;
}

export interface Phase {
  id: PhaseId;
  name: string;
  startMs: number;
  endMs: number | null;        // null means open-ended
  whatsHappening: string;
  whyYouFeelThisWay: string;
  howToCope: string[];
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
  savings: Savings;
  anchors: Anchors;
  currentPhase: Phase;
  dangerWindow: DangerWindow;
  chapters: Chapter[];
  nextMilestone: MilestoneState | null;
}

export const MINUTES_LOST_PER_CIGARETTE = 20;
export const DANGER_WINDOW_DAYS = 19;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
