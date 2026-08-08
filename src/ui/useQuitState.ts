import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { loadQuitState } from '@/data/repositories';
import type { QuitState } from '@/domain/types';

/**
 * Loads the stored facts. `state === null` after loading means onboarding has not run —
 * but only when `error === null` too. A DB error must never be mistaken for "onboarding
 * has not run": consumers redirect to onboarding on a genuine null, and a subsequent save
 * there would UPSERT over an existing settings row, silently destroying real quit history.
 * Keep `loading`, `state`, and `error` distinguishable for exactly that reason.
 */
export function useQuitState(): {
  state: QuitState | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
} {
  const db = useSQLiteContext();
  const [state, setState] = useState<QuitState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadQuitState(db);
      setState(next);
      setError(null);
    } catch (caught) {
      setState(null);
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, loading, error, reload };
}
