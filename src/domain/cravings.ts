import type { CravingEvent, Slip, SlipTrigger } from './types';

/** How long the SOS bar runs: most cravings pass within three to five minutes. */
export const SOS_WINDOW_SECONDS = 300;

export function cravingsBeaten(events: readonly CravingEvent[]): number {
  return events.filter((event) => event.outcome === 'passed').length;
}

/** 0..1 through the five-minute window that started at `startedAt`. */
export function sosProgress(startedAt: string, now: Date): number {
  const elapsed = (now.getTime() - new Date(startedAt).getTime()) / 1000;
  return Math.min(1, Math.max(0, elapsed / SOS_WINDOW_SECONDS));
}

const DAY_MS = 86_400_000;
const RECENT_DAYS = 14;

const average = (values: number[]): number | null =>
  values.length === 0 ? null : Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

/**
 * Average "how strong is it?" rating at the start of SOS: the last 14 days against everything
 * rated before that. Unrated cravings are left out. Either side is null when it has no ratings.
 */
export function strengthTrend(events: readonly CravingEvent[], now: Date): { recent: number | null; earlier: number | null } {
  const cutoff = now.getTime() - RECENT_DAYS * DAY_MS;
  const recent: number[] = [];
  const earlier: number[] = [];
  for (const event of events) {
    if (event.strengthStart === null) continue;
    (new Date(event.startedAt).getTime() >= cutoff ? recent : earlier).push(event.strengthStart);
  }
  return { recent: average(recent), earlier: average(earlier) };
}

export interface TimeOfDayCounts {
  night: number;
  morning: number;
  afternoon: number;
  evening: number;
}

/**
 * Cravings by part of the day. `hourOf` returns the local hour (0-23) for a timestamp; it is
 * passed in so this module never reads the device time zone itself.
 */
export function cravingsByTimeOfDay(events: readonly CravingEvent[], hourOf: (iso: string) => number): TimeOfDayCounts {
  const counts: TimeOfDayCounts = { night: 0, morning: 0, afternoon: 0, evening: 0 };
  for (const event of events) {
    const hour = hourOf(event.startedAt);
    if (hour < 6) counts.night += 1;
    else if (hour < 12) counts.morning += 1;
    else if (hour < 18) counts.afternoon += 1;
    else counts.evening += 1;
  }
  return counts;
}

/** What set slips off, most frequent first. Slips logged without a trigger are left out. */
export function slipTriggers(slips: readonly Slip[]): { trigger: SlipTrigger; count: number }[] {
  const counts = new Map<SlipTrigger, number>();
  for (const slip of slips) if (slip.trigger !== null) counts.set(slip.trigger, (counts.get(slip.trigger) ?? 0) + 1);
  return [...counts.entries()].map(([trigger, count]) => ({ trigger, count })).sort((a, b) => b.count - a.count);
}

export type DayPart = keyof TimeOfDayCounts;

export interface CravingInsights {
  total: number;
  beaten: number;
  /** Null unless both the last 14 days and the time before have ratings. */
  trend: { recent: number; earlier: number } | null;
  /** Each part's count, and its share of the busiest part (0..1) for drawing bars. */
  timeOfDay: { part: DayPart; count: number; share: number }[];
  /** The three most frequent slip triggers. */
  triggers: { trigger: SlipTrigger; count: number }[];
}

const DAY_PARTS: DayPart[] = ['night', 'morning', 'afternoon', 'evening'];

/** Everything the Log screen shows about cravings, ready to render. */
export function cravingInsights(
  events: readonly CravingEvent[],
  slips: readonly Slip[],
  now: Date,
  hourOf: (iso: string) => number,
): CravingInsights {
  const { recent, earlier } = strengthTrend(events, now);
  const counts = cravingsByTimeOfDay(events, hourOf);
  const busiest = Math.max(...DAY_PARTS.map((part) => counts[part]));
  return {
    total: events.length,
    beaten: cravingsBeaten(events),
    trend: recent !== null && earlier !== null ? { recent, earlier } : null,
    timeOfDay: DAY_PARTS.map((part) => ({ part, count: counts[part], share: busiest === 0 ? 0 : counts[part] / busiest })),
    triggers: slipTriggers(slips).slice(0, 3),
  };
}
