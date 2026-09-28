import type { SQLiteDatabase } from 'expo-sqlite';
import type { ActivityId, CravingEvent, QuitState, Settings, Slip, SlipTrigger, SmokingPeriod } from '@/domain/types';
import { readableSettingsOrRaw, rowToSettings, settingsToParams, type SettingsRow } from './settingsMapping';
import {
  DELETE_ALL,
  END_OPEN_SMOKING_PERIOD,
  INSERT_CRAVING_EVENT,
  INSERT_SLIP,
  INSERT_SMOKING_PERIOD,
  SELECT_CHECKINS,
  COUNT_CRAVINGS_BEATEN,
  SELECT_CRAVING_EVENTS,
  SELECT_SETTINGS,
  SELECT_SLIPS,
  SELECT_SMOKING_PERIODS,
  UPSERT_CHECKIN,
  UPSERT_MILESTONE_EVENT,
  UPSERT_SETTINGS,
} from './queries';

// TIMESTAMP INVARIANT: every timestamp written through this module must be
// `someDate.toISOString()` (UTC, always ending in 'Z'). The smoking_periods CHECK
// constraint (`ended_at >= started_at`) compares timestamps as TEXT lexicographically,
// which only stays chronologically correct while every stored value shares this one
// format. Never write an offset-bearing string like '+02:00' here.

// cigarette_count / average_cigarettes_per_day store units of the current product —
// see settingsMapping.ts for why the columns keep their original names.
interface SlipRow {
  id: number;
  occurred_at: string;
  cigarette_count: number;
  trigger: SlipTrigger | null;
  note: string | null;
}

interface PeriodRow {
  id: number;
  started_at: string;
  ended_at: string | null;
  average_cigarettes_per_day: number;
  note: string | null;
}

interface CravingRow {
  id: number;
  started_at: string;
  ended_at: string;
  outcome: CravingEvent['outcome'];
  activity: ActivityId | null;
}

export interface CheckinRow {
  loggedOn: string;
  cravingIntensity: number;
  mood: number;
  note: string | null;
}

export async function loadQuitState(db: SQLiteDatabase): Promise<QuitState | null> {
  const settingsRow = await db.getFirstAsync<SettingsRow>(SELECT_SETTINGS);
  if (!settingsRow) return null;

  const slipRows = await db.getAllAsync<SlipRow>(SELECT_SLIPS);
  const periodRows = await db.getAllAsync<PeriodRow>(SELECT_SMOKING_PERIODS);

  const settings: Settings = rowToSettings(settingsRow);

  const slips: Slip[] = slipRows.map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    unitCount: row.cigarette_count,
    trigger: row.trigger,
    note: row.note,
  }));

  const periods: SmokingPeriod[] = periodRows.map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    averageUnitsPerDay: row.average_cigarettes_per_day,
    note: row.note,
  }));

  const cravingRows = await db.getAllAsync<CravingRow>(SELECT_CRAVING_EVENTS);
  const cravingEvents: CravingEvent[] = cravingRows.map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    outcome: row.outcome,
    activity: row.activity,
  }));

  return { settings, slips, periods, cravingEvents };
}

export async function saveSettings(db: SQLiteDatabase, settings: Settings, now: Date): Promise<void> {
  const stamp = now.toISOString();
  await db.runAsync(UPSERT_SETTINGS, ...settingsToParams(settings), stamp, stamp);
}

export async function addSlip(
  db: SQLiteDatabase,
  input: { occurredAt: string; unitCount: number; trigger: SlipTrigger | null; note: string | null },
  now: Date,
): Promise<void> {
  await db.runAsync(INSERT_SLIP, input.occurredAt, input.unitCount, input.trigger, input.note, now.toISOString());
}

export async function startSmokingPeriod(
  db: SQLiteDatabase,
  input: { startedAt: string; averageUnitsPerDay: number; note: string | null },
  now: Date,
): Promise<void> {
  await db.runAsync(INSERT_SMOKING_PERIOD, input.startedAt, null, input.averageUnitsPerDay, input.note, now.toISOString());
}

export async function endSmokingPeriod(db: SQLiteDatabase, endedAt: string): Promise<void> {
  await db.runAsync(END_OPEN_SMOKING_PERIOD, endedAt);
}

export async function addCravingEvent(
  db: SQLiteDatabase,
  input: { startedAt: string; endedAt: string; outcome: CravingEvent['outcome']; activity: ActivityId | null },
  now: Date,
): Promise<void> {
  await db.runAsync(INSERT_CRAVING_EVENT, input.startedAt, input.endedAt, input.outcome, input.activity, now.toISOString());
}

/** Passed craving events, read straight from the database so the number shown is never a guess. */
export async function countCravingsBeaten(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ beaten: number }>(COUNT_CRAVINGS_BEATEN);
  return row?.beaten ?? 0;
}

/**
 * A slip logged from SOS writes two rows. They commit together or not at all, so a failure
 * never leaves a saved slip behind a "nothing was recorded" message that invites a retry.
 */
export async function logSlipAfterCraving(
  db: SQLiteDatabase,
  slip: { occurredAt: string; unitCount: number; trigger: SlipTrigger | null; note: string | null },
  craving: { startedAt: string; endedAt: string; outcome: CravingEvent['outcome']; activity: ActivityId | null },
  now: Date,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await addSlip(db, slip, now);
    await addCravingEvent(db, craving, now);
  });
}

export async function recordMilestoneReached(db: SQLiteDatabase, milestoneId: string, reachedAt: string): Promise<void> {
  await db.runAsync(UPSERT_MILESTONE_EVENT, milestoneId, reachedAt);
}

export async function saveCheckin(
  db: SQLiteDatabase,
  input: { loggedOn: string; cravingIntensity: number; mood: number; note: string | null },
  now: Date,
): Promise<void> {
  await db.runAsync(UPSERT_CHECKIN, input.loggedOn, input.cravingIntensity, input.mood, input.note, now.toISOString());
}

export async function listCheckins(db: SQLiteDatabase, limit: number): Promise<CheckinRow[]> {
  const rows = await db.getAllAsync<{ logged_on: string; craving_intensity: number; mood: number; note: string | null }>(
    SELECT_CHECKINS,
    limit,
  );
  return rows.map((row) => ({
    loggedOn: row.logged_on,
    cravingIntensity: row.craving_intensity,
    mood: row.mood,
    note: row.note,
  }));
}

// `exportAll` is the one deliberate exception to the no-argless-`new Date()` rule: it
// stamps the export file, which is metadata about the file rather than an input to any
// calculation, and it lives in `data/`, not `domain/`.
/** Everything the user has stored, as JSON. This is the only "backup" v1 offers. */
export async function exportAll(db: SQLiteDatabase): Promise<string> {
  const checkins = await listCheckins(db, 100_000);
  const settingsRow = await db.getFirstAsync<SettingsRow>(SELECT_SETTINGS);
  const settings = settingsRow ? readableSettingsOrRaw(settingsRow) : null;
  if (settings !== null && !settings.readable) {
    // The app cannot interpret its own settings, but the user's history must still be exportable.
    const slips = await db.getAllAsync(SELECT_SLIPS);
    const periods = await db.getAllAsync(SELECT_SMOKING_PERIODS);
    return JSON.stringify(
      { exportedAt: new Date().toISOString(), unreadableSettings: settings, rawSlips: slips, rawPeriods: periods, checkins },
      null,
      2,
    );
  }
  const state = await loadQuitState(db);
  return JSON.stringify({ exportedAt: new Date().toISOString(), state, checkins }, null, 2);
}

export async function deleteEverything(db: SQLiteDatabase): Promise<void> {
  for (const statement of DELETE_ALL) {
    await db.execAsync(statement);
  }
}
