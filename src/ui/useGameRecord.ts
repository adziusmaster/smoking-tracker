import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGameRecords, saveGameRecord } from '@/data/repositories';
import { beatsPreviousBest, isNewBest } from '@/domain/games/records';
import type { GameId } from '@/domain/types';

/**
 * The stored best for one game. `submit(value)` saves it when it beats the best and returns
 * whether to show "New best!" (only when an earlier best was beaten). Until the stored best has
 * loaded nothing is celebrated; the save still goes through, and the database only ever keeps
 * the better score, so a slow or failed load can't overwrite a real record.
 */
export function useGameRecord(game: GameId): { best: number | null; submit: (value: number) => boolean } {
  const db = useSQLiteContext();
  const [best, setBest] = useState<number | null>(null);
  const bestRef = useRef<number | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    let alive = true;
    void loadGameRecords(db)
      .then((records) => {
        if (!alive) return;
        // Keep anything submitted while loading if it is better than what was stored.
        const stored = records[game];
        const pending = bestRef.current;
        const next = pending !== null && isNewBest(game, pending, stored) ? pending : stored;
        loaded.current = true;
        bestRef.current = next;
        setBest(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [db, game]);

  const submit = useCallback(
    (value: number) => {
      const previous = bestRef.current;
      if (!isNewBest(game, value, previous)) return false;
      bestRef.current = value;
      setBest(value);
      void saveGameRecord(db, game, value, new Date()).catch(() => undefined);
      return loaded.current && beatsPreviousBest(game, value, previous);
    },
    [db, game],
  );

  return { best, submit };
}
