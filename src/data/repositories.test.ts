import { beforeEach, describe, expect, it } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';
import { cigaretteSettings } from '@/domain/testSettings';
import {
  addCravingEvent,
  loadGameRecords,
  loadPreferences,
  saveGameRecord,
  savePreference,
  countCravingsBeaten,
  exportAll,
  listCheckins,
  loadQuitState,
  logSlipAfterCraving,
  saveCheckin,
  saveSettings,
  setCravingStrengthEnd,
} from './repositories';
import { openTestDb } from './testDb';

const NOW = new Date('2026-09-28T12:00:00.000Z');
let db: SQLiteDatabase;

beforeEach(async () => {
  db = openTestDb();
  await saveSettings(db, cigaretteSettings({ quitDate: '2026-08-07T21:00:00.000Z' }), NOW);
});

describe('repositories', () => {
  it('listCheckins_afterSavingOne_returnsIt', async () => {
    // Arrange
    await saveCheckin(db, { loggedOn: '2026-09-28', cravingIntensity: 2, mood: 4, note: null }, NOW);

    // Act
    const checkins = await listCheckins(db, 30);

    // Assert
    expect(checkins).toEqual([{ loggedOn: '2026-09-28', cravingIntensity: 2, mood: 4, note: null }]);
  });

  it('exportAll_withCravingEvents_includesStateAndCheckins', async () => {
    // Arrange
    await addCravingEvent(db, { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'passed', activity: 'blocks', strengthStart: 4, strengthEnd: 2 }, NOW);

    // Act
    const exported = JSON.parse(await exportAll(db)) as { state: { cravingEvents: unknown[] }; checkins: unknown[] };

    // Assert
    expect(exported.state.cravingEvents).toHaveLength(1);
    expect(exported.checkins).toEqual([]);
  });

  it('countCravingsBeaten_mixedOutcomes_countsPassedRowsInTheDatabase', async () => {
    // Arrange
    await addCravingEvent(db, { startedAt: '2026-09-27T10:00:00.000Z', endedAt: '2026-09-27T10:04:00.000Z', outcome: 'passed', activity: null, strengthStart: null, strengthEnd: null }, NOW);
    await addCravingEvent(db, { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'slipped', activity: null, strengthStart: null, strengthEnd: null }, NOW);

    // Act
    const count = await countCravingsBeaten(db);

    // Assert
    expect(count).toBe(1);
  });

  it('logSlipAfterCraving_cravingInsertFails_savesNeitherRow', async () => {
    // Arrange — an invalid activity makes the second insert violate its CHECK
    const slip = { occurredAt: '2026-09-28T10:04:00.000Z', unitCount: 2, trigger: null, note: null, product: 'cigarettes' as const };
    const craving = { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'slipped' as const, activity: 'chess' as never, strengthStart: null, strengthEnd: null };

    // Act
    const act = logSlipAfterCraving(db, slip, craving, NOW);

    // Assert — all or nothing, so a retry cannot double-count the slip
    await expect(act).rejects.toThrow();
    const state = await loadQuitState(db);
    expect(state?.slips).toEqual([]);
    expect(state?.cravingEvents).toEqual([]);
  });

  it('logSlipAfterCraving_bothValid_savesBothRows', async () => {
    // Arrange
    const slip = { occurredAt: '2026-09-28T10:04:00.000Z', unitCount: 2, trigger: null, note: null, product: 'cigarettes' as const };
    const craving = { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'slipped' as const, activity: null, strengthStart: null, strengthEnd: null };

    // Act
    await logSlipAfterCraving(db, slip, craving, NOW);

    // Assert
    const state = await loadQuitState(db);
    expect(state?.slips).toHaveLength(1);
    expect(state?.cravingEvents).toHaveLength(1);
  });
});

describe('slips with a product', () => {
  it('addSlip_differentProduct_roundTripsThroughLoad', async () => {
    // Arrange & Act
    await logSlipAfterCraving(
      db,
      { occurredAt: '2026-09-28T10:04:00.000Z', unitCount: 1, trigger: null, note: null, product: 'vape' },
      { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'slipped', activity: null, strengthStart: null, strengthEnd: null },
      NOW,
    );
    const state = await loadQuitState(db);

    // Assert
    expect(state?.slips[0]?.product).toBe('vape');
  });
});

describe('preferences and records', () => {
  it('loadPreferences_nothingSaved_returnsDefaults', async () => {
    // Arrange & Act
    const prefs = await loadPreferences(db);

    // Assert
    expect(prefs).toEqual({ sound: true, vibration: true, reason: '' });
  });

  it('savePreference_soundOffAndReason_loadsBack', async () => {
    // Arrange
    await savePreference(db, 'sound', 'off');
    await savePreference(db, 'reason', 'Run with my daughter 🏃');

    // Act
    const prefs = await loadPreferences(db);

    // Assert
    expect(prefs).toEqual({ sound: false, vibration: true, reason: 'Run with my daughter 🏃' });
  });

  it('saveGameRecord_thenLoad_returnsBestPerGame', async () => {
    // Arrange
    await saveGameRecord(db, 'blocks', 1200, NOW);
    await saveGameRecord(db, 'memory', 9, NOW);

    // Act
    const records = await loadGameRecords(db);

    // Assert
    expect(records).toEqual({ blocks: 1200, memory: 9, bubbles: null });
  });

  it('exportAll_withPreferencesAndRecords_includesThem', async () => {
    // Arrange
    await savePreference(db, 'reason', 'health');
    await saveGameRecord(db, 'bubbles', 40, NOW);

    // Act
    const exported = JSON.parse(await exportAll(db)) as { preferences: { reason: string }; gameRecords: { bubbles: number } };

    // Assert
    expect(exported.preferences.reason).toBe('health');
    expect(exported.gameRecords.bubbles).toBe(40);
  });

  it('loadQuitState_cravingWithStrengths_mapsThem', async () => {
    // Arrange
    await addCravingEvent(db, { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'passed', activity: null, strengthStart: 5, strengthEnd: 3 }, NOW);

    // Act
    const state = await loadQuitState(db);

    // Assert
    expect(state?.cravingEvents[0]).toEqual(expect.objectContaining({ strengthStart: 5, strengthEnd: 3 }));
  });
});

describe('craving strength after it passed', () => {
  it('setCravingStrengthEnd_afterAddingAPassedCraving_updatesThatRow', async () => {
    // Arrange
    const id = await addCravingEvent(db, { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'passed', activity: null, strengthStart: 4, strengthEnd: null }, NOW);

    // Act
    await setCravingStrengthEnd(db, id, 2);

    // Assert
    const state = await loadQuitState(db);
    expect(state?.cravingEvents[0]?.strengthEnd).toBe(2);
    expect(await countCravingsBeaten(db)).toBe(1);
  });

  it('setCravingStrengthEnd_outOfRange_rejectsAndKeepsNull', async () => {
    // Arrange
    const id = await addCravingEvent(db, { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'passed', activity: null, strengthStart: null, strengthEnd: null }, NOW);

    // Act
    const act = () => setCravingStrengthEnd(db, id, 6);

    // Assert
    await expect(act()).rejects.toThrow();
    const state = await loadQuitState(db);
    expect(state?.cravingEvents[0]?.strengthEnd).toBeNull();
  });

  it('setCravingStrengthEnd_unknownId_changesNothing', async () => {
    // Arrange & Act
    await setCravingStrengthEnd(db, 999, 3);

    // Assert
    expect(await countCravingsBeaten(db)).toBe(0);
  });
});
