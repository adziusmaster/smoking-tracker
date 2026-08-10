import type { SQLiteDatabase } from 'expo-sqlite';
import type { QuitState, Settings, Slip, SlipTrigger, SmokingPeriod } from '@/domain/types';
import {
  DELETE_ALL,
  END_OPEN_SMOKING_PERIOD,
  INSERT_SLIP,
  INSERT_SMOKING_PERIOD,
  SELECT_CHECKINS,
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

interface SettingsRow {
  quit_date: string;
  cigarettes_per_day: number;
  cigarettes_per_pack: number;
  pack_price_minor: number;
  currency: string;
  timezone: string;
  smoked_for_months: number;
}

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

  const settings: Settings = {
    quitDate: settingsRow.quit_date,
    cigarettesPerDay: settingsRow.cigarettes_per_day,
    cigarettesPerPack: settingsRow.cigarettes_per_pack,
    packPriceMinor: settingsRow.pack_price_minor,
    currency: settingsRow.currency,
    timezone: settingsRow.timezone,
    smokedForMonths: settingsRow.smoked_for_months,
  };

  const slips: Slip[] = slipRows.map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    cigaretteCount: row.cigarette_count,
    trigger: row.trigger,
    note: row.note,
  }));

  const periods: SmokingPeriod[] = periodRows.map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    averageCigarettesPerDay: row.average_cigarettes_per_day,
    note: row.note,
  }));

  return { settings, slips, periods };
}

export async function saveSettings(db: SQLiteDatabase, settings: Settings, now: Date): Promise<void> {
  const stamp = now.toISOString();
  await db.runAsync(
    UPSERT_SETTINGS,
    settings.quitDate,
    settings.cigarettesPerDay,
    settings.cigarettesPerPack,
    settings.packPriceMinor,
    settings.currency,
    settings.timezone,
    settings.smokedForMonths,
    stamp,
    stamp,
  );
}

export async function addSlip(
  db: SQLiteDatabase,
  input: { occurredAt: string; cigaretteCount: number; trigger: SlipTrigger | null; note: string | null },
  now: Date,
): Promise<void> {
  await db.runAsync(INSERT_SLIP, input.occurredAt, input.cigaretteCount, input.trigger, input.note, now.toISOString());
}

export async function startSmokingPeriod(
  db: SQLiteDatabase,
  input: { startedAt: string; averageCigarettesPerDay: number; note: string | null },
  now: Date,
): Promise<void> {
  await db.runAsync(INSERT_SMOKING_PERIOD, input.startedAt, null, input.averageCigarettesPerDay, input.note, now.toISOString());
}

export async function endSmokingPeriod(db: SQLiteDatabase, endedAt: string): Promise<void> {
  await db.runAsync(END_OPEN_SMOKING_PERIOD, endedAt);
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
  const state = await loadQuitState(db);
  const checkins = await listCheckins(db, 100_000);
  return JSON.stringify({ exportedAt: new Date().toISOString(), state, checkins }, null, 2);
}

export async function deleteEverything(db: SQLiteDatabase): Promise<void> {
  for (const statement of DELETE_ALL) {
    await db.execAsync(statement);
  }
}
