import { describe, expect, it } from 'vitest';
import { planNotifications } from './notifications';
import { MS_PER_DAY, type DangerWindow, type Milestone, type MilestoneState } from './types';

const NOW = new Date('2026-08-08T08:00:00Z');

const milestone = (id: string): Milestone => ({
  id, title: `Title ${id}`, body: '', offsetMs: MS_PER_DAY, offsetEndMs: null,
  slipBehavior: 'cumulative', sourceId: 'acs', phaseId: 'crash', audience: 'all',
});

const future = (id: string, daysAhead: number): MilestoneState => ({
  milestone: milestone(id),
  status: 'future',
  reachedAt: null,
  projectedAt: new Date(NOW.getTime() + daysAhead * MS_PER_DAY).toISOString(),
  progress: null,
});

const noDanger: DangerWindow = { active: false, endsAt: null, daysRemaining: null, triggeredBySlipId: null };

describe('planNotifications', () => {
  it('planNotifications_futureMilestone_schedulesOneAtItsProjectedDate', () => {
    // Arrange
    const input = { milestones: [future('co', 3)], dangerWindow: noDanger, now: NOW };

    // Act
    const result = planNotifications(input);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('milestone:co');
    expect(result[0]?.fireAt).toBe(new Date(NOW.getTime() + 3 * MS_PER_DAY).toISOString());
  });

  it('planNotifications_reachedMilestone_isNeverScheduled', () => {
    // Arrange
    const reached: MilestoneState = {
      milestone: milestone('co'), status: 'reached',
      reachedAt: '2026-08-01T08:00:00.000Z', projectedAt: null, progress: null,
    };

    // Act
    const result = planNotifications({ milestones: [reached], dangerWindow: noDanger, now: NOW });

    // Assert
    expect(result).toEqual([]);
  });

  it('planNotifications_milestoneMoreThanAYearOut_isSkipped', () => {
    // Arrange — no value in an OS-level alarm 15 years out
    const input = { milestones: [future('chd', 400)], dangerWindow: noDanger, now: NOW };

    // Act
    const result = planNotifications(input);

    // Assert
    expect(result).toEqual([]);
  });

  it('planNotifications_activeDangerWindow_addsADailyCheckInPerRemainingDay', () => {
    // Arrange
    const dangerWindow: DangerWindow = {
      active: true,
      endsAt: new Date(NOW.getTime() + 3 * MS_PER_DAY).toISOString(),
      daysRemaining: 3,
      triggeredBySlipId: 1,
    };

    // Act
    const result = planNotifications({ milestones: [], dangerWindow, now: NOW });

    // Assert
    expect(result.map((n) => n.id)).toEqual(['danger:1', 'danger:2', 'danger:3']);
  });

  it('planNotifications_inactiveDangerWindow_addsNoCheckIns', () => {
    // Arrange & Act
    const result = planNotifications({ milestones: [], dangerWindow: noDanger, now: NOW });

    // Assert
    expect(result.filter((n) => n.id.startsWith('danger:'))).toEqual([]);
  });
});
