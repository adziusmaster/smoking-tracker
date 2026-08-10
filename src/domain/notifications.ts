import { MS_PER_DAY, type DangerWindow, type MilestoneState } from './types';

export interface PlannedNotification {
  id: string;
  title: string;
  body: string;
  fireAt: string;
}

export interface NotificationPlanInput {
  milestones: MilestoneState[];
  dangerWindow: DangerWindow;
  now: Date;
}

/** Beyond this horizon an OS alarm is pointless — the app will re-plan long before then. */
const HORIZON_DAYS = 365;

function planMilestoneNotifications(milestones: MilestoneState[], now: Date): PlannedNotification[] {
  const horizonMs = now.getTime() + HORIZON_DAYS * MS_PER_DAY;

  return milestones
    .filter((state): state is MilestoneState & { projectedAt: string } =>
      state.status !== 'reached' && state.projectedAt !== null,
    )
    .filter((state) => new Date(state.projectedAt).getTime() <= horizonMs)
    .map((state) => ({
      id: `milestone:${state.milestone.id}`,
      title: 'Milestone reached',
      body: state.milestone.title,
      fireAt: state.projectedAt,
    }));
}

function planDangerWindowCheckIns(dangerWindow: DangerWindow, now: Date): PlannedNotification[] {
  if (!dangerWindow.active || dangerWindow.daysRemaining === null) return [];

  const checkIns: PlannedNotification[] = [];
  for (let day = 1; day <= dangerWindow.daysRemaining; day += 1) {
    checkIns.push({
      id: `danger:${day}`,
      title: 'Checking in',
      body: 'Still on track? A slip is only a slip until it becomes a habit. You have got this far.',
      fireAt: new Date(now.getTime() + day * MS_PER_DAY).toISOString(),
    });
  }
  return checkIns;
}

/**
 * Pure planning: decides WHAT should be scheduled and WHEN, given the current timeline state.
 *
 * What actually stops a notification re-firing is entirely in-memory and has nothing to do
 * with the `milestone_events` table: a milestone whose status is already 'reached' is never
 * planned here, and `syncNotifications` cancels every scheduled notification before
 * rescheduling this plan, so the OS queue can only ever hold what this function returned on
 * its most recent call. `milestone_events` records reach dates; it is not the suppressor,
 * and its `notified_at` column is unused.
 *
 * Milestones beyond HORIZON_DAYS are skipped since the app re-plans on every launch.
 */
export function planNotifications({ milestones, dangerWindow, now }: NotificationPlanInput): PlannedNotification[] {
  return [...planMilestoneNotifications(milestones, now), ...planDangerWindowCheckIns(dangerWindow, now)];
}
