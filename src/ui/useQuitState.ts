import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { loadQuitState } from '@/data/repositories';
import type { QuitState } from '@/domain/types';

/** Loads the stored facts. `state === null` after loading means onboarding has not run. */
export function useQuitState(): { state: QuitState | null; loading: boolean; reload: () => Promise<void> } {
  const db = useSQLiteContext();
  const [state, setState] = useState<QuitState | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setState(await loadQuitState(db));
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, loading, reload };
}
