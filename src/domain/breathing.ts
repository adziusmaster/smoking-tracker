/** The breathing guide's 4-4-6 cycle: breathe in for 4 s, hold for 4 s, breathe out for 6 s. */
export type BreathPhase = 'in' | 'hold' | 'out';

const PHASES: { phase: BreathPhase; ms: number }[] = [
  { phase: 'in', ms: 4000 },
  { phase: 'hold', ms: 4000 },
  { phase: 'out', ms: 6000 },
];
export const BREATH_CYCLE_MS = PHASES.reduce((total, p) => total + p.ms, 0);

/** Where in the cycle `elapsedMs` falls: the phase, whole seconds left in it, and 0..1 progress. */
export function breathAt(elapsedMs: number): { phase: BreathPhase; secondsLeft: number; phaseProgress: number } {
  let at = ((elapsedMs % BREATH_CYCLE_MS) + BREATH_CYCLE_MS) % BREATH_CYCLE_MS;
  for (const { phase, ms } of PHASES) {
    if (at < ms) return { phase, secondsLeft: Math.max(1, Math.ceil((ms - at) / 1000)), phaseProgress: at / ms };
    at -= ms;
  }
  return { phase: 'in', secondsLeft: 4, phaseProgress: 0 };
}
