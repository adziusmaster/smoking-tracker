import { describe, expect, it } from 'vitest';
import { MILESTONES } from './milestones';
import { SOURCES } from './sources';

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
    const banned = ['nerve-endings', 'bronchial-tubes'];

    // Act
    const present = MILESTONES.filter((m) => banned.includes(m.id));

    // Assert
    expect(present).toEqual([]);
  });
});
