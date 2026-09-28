import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGameRecords, saveGameRecord } from '@/data/repositories';
import { isNewBest } from '@/domain/games/records';
import type { GameId } from '@/domain/types';

/**
 * The stored best for one game. `submit(value)` saves it when it beats the best and returns
 * whether it did, so the game can show "New best!".
 */
export function useGameRecord(game: GameId): { best: number | null; submit: (value: number) => boolean } {
  const db = useSQLiteContext();
  const [best, setBest] = useState<number | null>(null);
  const bestRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    void loadGameRecords(db)
      .then((records) => {
        if (!alive) return;
        bestRef.current = records[game];
        setBest(records[game]);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [db, game]);

  const submit = useCallback(
    (value: number) => {
      if (!isNewBest(game, value, bestRef.current)) return false;
      bestRef.current = value;
      setBest(value);
      void saveGameRecord(db, game, value, new Date()).catch(() => undefined);
      return true;
    },
    [db, game],
  );

  return { best, submit };
}
