import { beforeEach, describe, expect, it } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';
import { cigaretteSettings } from '@/domain/testSettings';
import {
  addCravingEvent,
  countCravingsBeaten,
  exportAll,
  listCheckins,
  loadQuitState,
  logSlipAfterCraving,
  saveCheckin,
  saveSettings,
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
    await addCravingEvent(db, { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'passed', activity: 'blocks' }, NOW);

    // Act
    const exported = JSON.parse(await exportAll(db)) as { state: { cravingEvents: unknown[] }; checkins: unknown[] };

    // Assert
    expect(exported.state.cravingEvents).toHaveLength(1);
    expect(exported.checkins).toEqual([]);
  });

  it('countCravingsBeaten_mixedOutcomes_countsPassedRowsInTheDatabase', async () => {
    // Arrange
    await addCravingEvent(db, { startedAt: '2026-09-27T10:00:00.000Z', endedAt: '2026-09-27T10:04:00.000Z', outcome: 'passed', activity: null }, NOW);
    await addCravingEvent(db, { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'slipped', activity: null }, NOW);

    // Act
    const count = await countCravingsBeaten(db);

    // Assert
    expect(count).toBe(1);
  });

  it('logSlipAfterCraving_cravingInsertFails_savesNeitherRow', async () => {
    // Arrange — an invalid activity makes the second insert violate its CHECK
    const slip = { occurredAt: '2026-09-28T10:04:00.000Z', unitCount: 2, trigger: null, note: null, product: 'cigarettes' as const };
    const craving = { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'slipped' as const, activity: 'chess' as never };

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
    const craving = { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'slipped' as const, activity: null };

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
      { startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome: 'slipped', activity: null },
      NOW,
    );
    const state = await loadQuitState(db);

    // Assert
    expect(state?.slips[0]?.product).toBe('vape');
  });
});
