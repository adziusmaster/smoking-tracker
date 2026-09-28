import type { CravingEvent } from './types';

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
