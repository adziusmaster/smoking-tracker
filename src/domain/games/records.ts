import type { GameId } from '../types';

/** Which way a score gets better: more lines and pops are better; fewer memory moves are better. */
export const RECORD_DIRECTION: Record<GameId, 'higher' | 'lower'> = {
  blocks: 'higher',
  bubbles: 'higher',
  memory: 'lower',
};

/** Whether `value` beats the stored best. A zero never counts for a higher-is-better game. */
export function isNewBest(game: GameId, value: number, current: number | null): boolean {
  if (RECORD_DIRECTION[game] === 'higher') {
    if (value <= 0) return false;
    return current === null || value > current;
  }
  return current === null || value < current;
}

/**
 * Whether to celebrate "New best!": only when there was an earlier best and `value` beats it.
 * The very first score is saved as the best, but beating nothing isn't a record.
 */
export function beatsPreviousBest(game: GameId, value: number, current: number | null): boolean {
  return current !== null && isNewBest(game, value, current);
}
