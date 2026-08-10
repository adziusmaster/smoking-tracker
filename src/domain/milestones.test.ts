import { describe, expect, it } from 'vitest';
import { anchorFor, resolveMilestone, resolveMilestones } from './milestones';
import { MS_PER_DAY, MS_PER_HOUR, type Anchors, type Milestone } from './types';

const QUIT = '2026-06-26T08:00:00+02:00';
const SLIP = '2026-08-05T22:00:00+02:00';

const anchors: Anchors = { fast: SLIP, cumulative: QUIT, isCurrentlySmoking: false };

const milestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'test',
  title: 'Test',
  body: 'Body',
  offsetMs: 24 * MS_PER_HOUR,
  offsetEndMs: null,
  slipBehavior: 'restarts',
  sourceId: 'acs',
  phaseId: 'crash',
  ...overrides,
});

describe('anchorFor', () => {
  it('anchorFor_restartsMilestone_returnsFastAnchor', () => {
    // Arrange
    const m = milestone({ slipBehavior: 'restarts' });

    // Act
    const result = anchorFor(m, anchors);

    // Assert
    expect(result).toBe(SLIP);
  });

  it('anchorFor_cumulativeMilestone_returnsCumulativeAnchor', () => {
    // Arrange
    const m = milestone({ slipBehavior: 'cumulative' });

    // Act
    const result = anchorFor(m, anchors);

    // Assert
    expect(result).toBe(QUIT);
  });

  it('anchorFor_qualitativeMilestone_returnsNull', () => {
    // Arrange
    const m = milestone({ slipBehavior: 'qualitative', offsetMs: null });

    // Act
    const result = anchorFor(m, anchors);

    // Assert
    expect(result).toBeNull();
  });
});

describe('resolveMilestone', () => {
  it('resolveMilestone_restartsMilestoneAfterSlip_isFutureAgain', () => {
    // Arrange — 24 h milestone, slip was only 10 h before now
    const m = milestone({ offsetMs: 24 * MS_PER_HOUR, slipBehavior: 'restarts' });
    const now = new Date('2026-08-06T08:00:00+02:00');

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('future');
    expect(result.projectedAt).toBe(new Date(new Date(SLIP).getTime() + 24 * MS_PER_HOUR).toISOString());
    expect(result.reachedAt).toBeNull();
  });

  it('resolveMilestone_cumulativeMilestoneAfterSlip_staysReached', () => {
    // Arrange — 14-day milestone, quit 43 days ago, slip 3 days ago
    const m = milestone({ offsetMs: 14 * MS_PER_DAY, slipBehavior: 'cumulative' });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert — the slip must not undo this
    expect(result.status).toBe('reached');
    expect(result.reachedAt).toBe(new Date(new Date(QUIT).getTime() + 14 * MS_PER_DAY).toISOString());
  });

  it('resolveMilestone_exactlyOnTheBoundary_countsAsReached', () => {
    // Arrange
    const m = milestone({ offsetMs: 14 * MS_PER_DAY, slipBehavior: 'cumulative' });
    const now = new Date(new Date(QUIT).getTime() + 14 * MS_PER_DAY);

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('reached');
  });

  it('resolveMilestone_rangedMilestoneMidRange_isInProgressWithFractionalProgress', () => {
    // Arrange — range 0–100 days, now is day 25 since the cumulative anchor
    const m = milestone({ offsetMs: 0, offsetEndMs: 100 * MS_PER_DAY, slipBehavior: 'cumulative' });
    const now = new Date(new Date(QUIT).getTime() + 25 * MS_PER_DAY);

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('in-progress');
    expect(result.progress).toBeCloseTo(0.25, 5);
  });

  it('resolveMilestone_rangedMilestonePastEnd_isReachedWithNullProgress', () => {
    // Arrange
    const m = milestone({ offsetMs: 0, offsetEndMs: 10 * MS_PER_DAY, slipBehavior: 'cumulative' });
    const now = new Date(new Date(QUIT).getTime() + 40 * MS_PER_DAY);

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('reached');
    expect(result.progress).toBeNull();
  });

  it('resolveMilestone_qualitativeMilestone_isAlwaysInProgressWithoutDates', () => {
    // Arrange
    const m = milestone({ slipBehavior: 'qualitative', offsetMs: null });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('in-progress');
    expect(result.progress).toBeNull();
    expect(result.reachedAt).toBeNull();
    expect(result.projectedAt).toBeNull();
  });

  it('resolveMilestone_unreachedNonRangedMilestone_isNeverInProgress', () => {
    // Arrange — 10-year milestone, only 43 days in
    const m = milestone({ offsetMs: 3652 * MS_PER_DAY, offsetEndMs: null, slipBehavior: 'cumulative' });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('future');
    expect(result.progress).toBeNull();
  });

  it('resolveMilestone_exactlyAtRangeStart_isInProgressWithZeroProgress', () => {
    // Arrange — range 0–100 days from the cumulative anchor, now is exactly the start
    const m = milestone({ offsetMs: 0, offsetEndMs: 100 * MS_PER_DAY, slipBehavior: 'cumulative' });
    const now = new Date(new Date(QUIT).getTime() + 0);

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('in-progress');
    expect(result.progress).toBe(0);
  });

  it('resolveMilestone_exactlyAtRangeEnd_isReached', () => {
    // Arrange — range 0–10 days from the cumulative anchor, now is exactly the end
    const m = milestone({ offsetMs: 0, offsetEndMs: 10 * MS_PER_DAY, slipBehavior: 'cumulative' });
    const now = new Date(new Date(QUIT).getTime() + 10 * MS_PER_DAY);

    // Act
    const result = resolveMilestone(m, anchors, now);

    // Assert
    expect(result.status).toBe('reached');
    expect(result.progress).toBeNull();
  });
});

describe('resolveMilestones', () => {
  it('resolveMilestones_arrayOfMilestones_mapsEachInOrderConsistentlyWithResolveMilestone', () => {
    // Arrange
    const restartsMilestone = milestone({
      id: 'restarts-one',
      offsetMs: 24 * MS_PER_HOUR,
      slipBehavior: 'restarts',
    });
    const cumulativeMilestone = milestone({
      id: 'cumulative-one',
      offsetMs: 14 * MS_PER_DAY,
      slipBehavior: 'cumulative',
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = resolveMilestones([restartsMilestone, cumulativeMilestone], anchors, now);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(resolveMilestone(restartsMilestone, anchors, now));
    expect(result[1]).toEqual(resolveMilestone(cumulativeMilestone, anchors, now));
  });
});
