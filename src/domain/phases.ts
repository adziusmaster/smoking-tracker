import { fillUnitTokens } from './format';
import { hasSmokingHistory, isCombustible, isOral } from './products';
import {
  DANGER_WINDOW_DAYS,
  MS_PER_DAY,
  type Anchors,
  type DangerWindow,
  type Phase,
  type PhaseId,
  type Settings,
  type Slip,
  type UnitWords,
} from './types';

/**
 * The phase is driven by the CUMULATIVE anchor. One cigarette after six weeks does not
 * reproduce day-one withdrawal, so a slip must not drop the user back into The Crash.
 * The post-slip state is expressed by the danger window instead.
 */
export function resolvePhase(phases: Phase[], anchors: Anchors, now: Date): Phase {
  const elapsedMs = Math.max(0, now.getTime() - new Date(anchors.cumulative).getTime());

  const match = phases.find(
    (phase) => elapsedMs >= phase.startMs && (phase.endMs === null || elapsedMs < phase.endMs),
  );

  // `phases` is validated as contiguous from 0 with an open-ended tail, so a match always
  // exists. The fallback keeps the return type honest without an assertion.
  const last = phases[phases.length - 1];
  if (match) return match;
  if (last) return last;
  throw new Error('resolvePhase requires at least one phase');
}

export function resolveDangerWindow(slips: Slip[], now: Date): DangerWindow {
  const inactive: DangerWindow = { active: false, endsAt: null, daysRemaining: null, triggeredBySlipId: null };
  if (slips.length === 0) return inactive;

  const mostRecent = slips.reduce((latest, slip) =>
    new Date(slip.occurredAt).getTime() > new Date(latest.occurredAt).getTime() ? slip : latest,
  );

  const endMs = new Date(mostRecent.occurredAt).getTime() + DANGER_WINDOW_DAYS * MS_PER_DAY;
  const remainingMs = endMs - now.getTime();
  if (remainingMs <= 0) return inactive;

  return {
    active: true,
    endsAt: new Date(endMs).toISOString(),
    daysRemaining: Math.ceil(remainingMs / MS_PER_DAY),
    triggeredBySlipId: mostRecent.id,
  };
}

const SHORT_TERM_PHASES = new Set<PhaseId>(['crash', 'fog', 'consolidation']);

/**
 * Picks the copy variant for this person. Short-term phases describe smoke-specific recovery
 * (carbon monoxide, cilia), so they need a combustible product; long-term phases describe the
 * smoking-risk curves, which also apply to a switcher with cigarette history.
 */
export function resolvePhaseCopy(phase: Phase, settings: Settings, unit: UnitWords): Phase {
  const combustible = isCombustible(settings.product);
  const smoke = SHORT_TERM_PHASES.has(phase.id) ? combustible : hasSmokingHistory(settings);
  const whatsHappening = smoke
    ? phase.whatsHappening
    : isOral(settings.product) && phase.whatsHappeningOral !== null
      ? phase.whatsHappeningOral
      : phase.whatsHappeningNicotine;
  const name = !combustible && phase.nameNicotine !== null ? phase.nameNicotine : phase.name;
  const howToCope = [...phase.howToCope, ...(combustible ? phase.howToCopeSmokeOnly : [])].map((tip) =>
    fillUnitTokens(tip, unit),
  );
  return { ...phase, name, whatsHappening, whyYouFeelThisWay: fillUnitTokens(phase.whyYouFeelThisWay, unit), howToCope };
}
