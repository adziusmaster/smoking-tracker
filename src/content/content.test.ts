import { describe, expect, it } from 'vitest';
import { MILESTONES } from './milestones';
import { SOURCES } from './sources';
import { PHASES } from './phases';

describe('MILESTONES', () => {
  it('MILESTONES_everyRecord_hasResolvableSourceId', () => {
    // Arrange
    const knownSourceIds = new Set(Object.keys(SOURCES));

    // Act
    const unresolved = MILESTONES.filter((m) => !knownSourceIds.has(m.sourceId));

    // Assert
    expect(unresolved.map((m) => m.id)).toEqual([]);
  });

  it('MILESTONES_everyRecord_hasUniqueId', () => {
    // Arrange
    const ids = MILESTONES.map((m) => m.id);

    // Act
    const unique = new Set(ids);

    // Assert
    expect(unique.size).toBe(ids.length);
  });

  it('MILESTONES_datedRecords_haveAnOffsetAndQualitativeOnesDoNot', () => {
    // Arrange & Act
    const datedWithoutOffset = MILESTONES.filter((m) => m.slipBehavior !== 'qualitative' && m.offsetMs === null);
    const qualitativeWithOffset = MILESTONES.filter((m) => m.slipBehavior === 'qualitative' && m.offsetMs !== null);

    // Assert
    expect(datedWithoutOffset).toEqual([]);
    expect(qualitativeWithOffset).toEqual([]);
  });

  it('MILESTONES_rangedRecords_haveEndAfterStart', () => {
    // Arrange & Act
    const inverted = MILESTONES.filter(
      (m) => m.offsetEndMs !== null && m.offsetMs !== null && m.offsetEndMs <= m.offsetMs,
    );

    // Assert
    expect(inverted.map((m) => m.id)).toEqual([]);
  });

  it('MILESTONES_excludedUnsourcedClaims_areAbsent', () => {
    // Arrange — these circulate widely online but are not in the ACS or CDC timelines
    const bannedIds = ['nerve-endings', 'bronchial-tubes'];
    const bannedPhrases = ['nerve ending', 'bronchial tube'];

    // Act
    const offendingIds: string[] = [];

    // Check for banned ids
    MILESTONES.forEach((m) => {
      if (bannedIds.includes(m.id)) {
        offendingIds.push(m.id);
      }
    });

    // Check for banned phrases in title and body (case-insensitive)
    MILESTONES.forEach((m) => {
      const titleLower = m.title.toLowerCase();
      const bodyLower = m.body.toLowerCase();
      for (const phrase of bannedPhrases) {
        if (titleLower.includes(phrase) || bodyLower.includes(phrase)) {
          if (!offendingIds.includes(m.id)) {
            offendingIds.push(m.id);
          }
          break;
        }
      }
    });

    // Assert
    expect(offendingIds).toEqual([]);
  });
});

describe('PHASES', () => {
  it('PHASES_wholeSet_coversTimeContiguouslyFromZero', () => {
    // Arrange
    const first = PHASES[0];

    // Act & Assert
    expect(first?.startMs).toBe(0);
    for (let i = 1; i < PHASES.length; i += 1) {
      expect(PHASES[i]?.startMs).toBe(PHASES[i - 1]?.endMs);
    }
  });

  it('PHASES_lastPhase_isOpenEnded', () => {
    // Arrange & Act
    const last = PHASES[PHASES.length - 1];

    // Assert
    expect(last?.endMs).toBeNull();
  });

  it('PHASES_everyPhase_hasAtLeastOneCopingTip', () => {
    // Arrange & Act
    const empty = PHASES.filter((phase) => phase.howToCope.length === 0);

    // Assert
    expect(empty.map((phase) => phase.id)).toEqual([]);
  });

  it('MILESTONES_everyPhaseId_matchesAKnownPhase', () => {
    // Arrange
    const knownPhaseIds = new Set(PHASES.map((phase) => phase.id));

    // Act
    const orphans = MILESTONES.filter((m) => !knownPhaseIds.has(m.phaseId));

    // Assert
    expect(orphans.map((m) => m.id)).toEqual([]);
  });
});
