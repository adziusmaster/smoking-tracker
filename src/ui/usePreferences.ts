import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { loadPreferences, savePreference } from '@/data/repositories';
import type { Preferences } from '@/domain/types';

const DEFAULTS: Preferences = { sound: true, vibration: true, reason: '' };

/** Sound, vibration and the user's reason. Loads on mount; setters save and update at once. */
export function usePreferences(): {
  preferences: Preferences;
  setSound: (on: boolean) => Promise<void>;
  setVibration: (on: boolean) => Promise<void>;
  setReason: (reason: string) => Promise<void>;
} {
  const db = useSQLiteContext();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);

  useEffect(() => {
    let alive = true;
    void loadPreferences(db)
      .then((loaded) => {
        if (alive) setPreferences(loaded);
      })
      .catch(() => {
        // Preferences are conveniences; on a read failure the defaults stand.
      });
    return () => {
      alive = false;
    };
  }, [db]);

  const setSound = useCallback(async (on: boolean) => {
    setPreferences((p) => ({ ...p, sound: on }));
    await savePreference(db, 'sound', on ? 'on' : 'off');
  }, [db]);
  const setVibration = useCallback(async (on: boolean) => {
    setPreferences((p) => ({ ...p, vibration: on }));
    await savePreference(db, 'vibration', on ? 'on' : 'off');
  }, [db]);
  const setReason = useCallback(async (reason: string) => {
    setPreferences((p) => ({ ...p, reason }));
    await savePreference(db, 'reason', reason.trim());
  }, [db]);

  return { preferences, setSound, setVibration, setReason };
}
