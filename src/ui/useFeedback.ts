import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { Vibration } from 'react-native';
import type { Preferences } from '@/domain/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const POP = require('../../assets/sounds/pop.wav');

/**
 * Sound and vibration for the SOS games, honouring the user's switches at the moment of playing
 * (read through a ref, so turning sound off mid-game takes effect on the very next pop).
 * The pop mixes with other audio rather than pausing the user's music.
 */
export function useFeedback(preferences: Pick<Preferences, 'sound' | 'vibration'>): {
  pop: () => void;
  tick: () => void;
} {
  const player = useAudioPlayer(POP);
  const prefs = useRef(preferences);
  prefs.current = preferences;

  useEffect(() => {
    void setAudioModeAsync({ interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => undefined);
  }, []);

  const pop = useCallback(() => {
    if (prefs.current.vibration) Vibration.vibrate(12);
    if (!prefs.current.sound) return;
    try {
      // A little pitch variety so a run of pops does not sound mechanical.
      player.setPlaybackRate(0.88 + Math.random() * 0.24);
      void player.seekTo(0);
      player.play();
    } catch {
      // A missing or failed sound must never break the game.
    }
  }, [player]);

  const tick = useCallback(() => {
    if (prefs.current.vibration) Vibration.vibrate(20);
  }, []);

  return { pop, tick };
}
