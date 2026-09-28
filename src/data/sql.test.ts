import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS, migrationsToApply, SCHEMA_VERSION } from './schema';
import {
  DELETE_ALL,
  END_OPEN_SMOKING_PERIOD,
  INSERT_SLIP,
  INSERT_SMOKING_PERIOD,
  SELECT_SETTINGS,
  SELECT_SLIPS,
  SELECT_SMOKING_PERIODS,
  UPSERT_CHECKIN,
  UPSERT_MILESTONE_EVENT,
  UPSERT_SETTINGS,
  INSERT_CRAVING_EVENT,
  SELECT_CRAVING_EVENTS,
  UPSERT_GAME_RECORD,
  UPSERT_PREFERENCE,
} from './queries';

let db: Database.Database;

const NOW = '2026-08-08T08:00:00.000Z';

const insertSettings = (quitDate = '2026-06-26T08:00:00+02:00') =>
  db.prepare(UPSERT_SETTINGS).run(quitDate, 15, 20, 1100, 'EUR', 'Europe/Amsterdam', 96, 'cigarettes', null, null, NOW, NOW);

beforeEach(() => {
  db = new Database(':memory:');
  for (const migration of MIGRATIONS) db.exec(migration.up);
});

describe('migrations', () => {
  it('MIGRATIONS_appliedToEmptyDatabase_createsEveryExpectedTable', () => {
    // Arrange & Act
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];

    // Assert
    expect(rows.map((r) => r.name).sort()).toEqual([
      'craving_checkins', 'craving_events', 'game_records', 'milestone_events', 'preferences', 'settings', 'slips', 'smoking_periods',
    ]);
  });
});

describe('settings', () => {
  it('UPSERT_SETTINGS_calledTwice_updatesInPlaceAndKeepsOneRow', () => {
    // Arrange
    insertSettings('2026-06-26T08:00:00+02:00');

    // Act
    insertSettings('2026-07-01T08:00:00+02:00');
    const rows = db.prepare(SELECT_SETTINGS).all() as { quit_date: string }[];

    // Assert
    expect(rows).toHaveLength(1);
    expect(rows[0]?.quit_date).toBe('2026-07-01T08:00:00+02:00');
  });

  it('settings_secondRowWithDifferentId_isRejectedByCheckConstraint', () => {
    // Arrange
    insertSettings();

    // Act
    const act = () =>
      db.prepare(
        `INSERT INTO settings (id, quit_date, cigarettes_per_day, cigarettes_per_pack,
          pack_price_minor, currency, timezone, lifetime_baseline, created_at, updated_at)
         VALUES (2, ?, 10, 20, 900, 'EUR', 'UTC', 0, ?, ?)`,
      ).run('2026-01-01T00:00:00Z', NOW, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('settings_zeroCigarettesPerDay_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(UPSERT_SETTINGS).run('2026-06-26T08:00:00+02:00', 0, 20, 1100, 'EUR', 'UTC', 0, 'cigarettes', null, null, NOW, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('UPSERT_SETTINGS_thenSelect_roundTripsSmokedForMonthsWithoutTransposingNeighbours', () => {
    // Arrange — 77 cannot collide with any other numeric column in this row
    const createdAt = '2026-08-08T08:00:00.000Z';

    // Act
    db.prepare(UPSERT_SETTINGS).run(
      '2026-06-26T08:00:00+02:00', 15, 20, 1100, 'EUR', 'Europe/Amsterdam', 77, 'cigarettes', null, null, createdAt, createdAt,
    );
    const row = db.prepare(SELECT_SETTINGS).get() as {
      smoked_for_months: number;
      timezone: string;
      pack_price_minor: number;
      cigarettes_per_day: number;
    };

    // Assert — asserting the neighbours is what catches a transposed bind, not just a
    // missing column; reading via SELECT_SETTINGS (not SELECT *) also exercises that
    // query's own column list, not just the write side
    expect(row.smoked_for_months).toBe(77);
    expect(row.timezone).toBe('Europe/Amsterdam');
    expect(row.pack_price_minor).toBe(1100);
    expect(row.cigarettes_per_day).toBe(15);
  });
});

describe('slips', () => {
  it('SELECT_SLIPS_multipleRows_returnsMostRecentFirst', () => {
    // Arrange
    db.prepare(INSERT_SLIP).run('2026-07-04T20:00:00+02:00', 1, null, null, null, NOW);
    db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 3, 'alcohol', 'party', null, NOW);

    // Act
    const rows = db.prepare(SELECT_SLIPS).all() as { occurred_at: string }[];

    // Assert
    expect(rows[0]?.occurred_at).toBe('2026-08-05T22:00:00+02:00');
  });

  it('INSERT_SLIP_unknownTrigger_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 3, 'peer-pressure', null, null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('INSERT_SLIP_zeroCigarettes_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 0, null, null, null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });
});

describe('smoking_periods', () => {
  it('END_OPEN_SMOKING_PERIOD_withOneOpenPeriod_closesIt', () => {
    // Arrange
    db.prepare(INSERT_SMOKING_PERIOD).run('2026-08-01T08:00:00+02:00', null, 20, null, NOW);

    // Act
    db.prepare(END_OPEN_SMOKING_PERIOD).run('2026-08-08T08:00:00+02:00');
    const rows = db.prepare(SELECT_SMOKING_PERIODS).all() as { ended_at: string | null }[];

    // Assert
    expect(rows[0]?.ended_at).toBe('2026-08-08T08:00:00+02:00');
  });

  it('smoking_periods_endBeforeStart_isRejected', () => {
    // Arrange & Act
    const act = () =>
      db.prepare(INSERT_SMOKING_PERIOD).run('2026-08-08T08:00:00+02:00', '2026-08-01T08:00:00+02:00', 20, null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });
});

describe('milestone_events', () => {
  it('UPSERT_MILESTONE_EVENT_sameMilestoneTwice_keepsTheOriginalReachedAt', () => {
    // Arrange
    db.prepare(UPSERT_MILESTONE_EVENT).run('carbon-monoxide', '2026-06-27T08:00:00+02:00');

    // Act
    db.prepare(UPSERT_MILESTONE_EVENT).run('carbon-monoxide', '2026-08-08T08:00:00+02:00');
    const rows = db.prepare('SELECT reached_at FROM milestone_events').all() as { reached_at: string }[];

    // Assert — reaching it again must not duplicate the row or overwrite the original date
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reached_at).toBe('2026-06-27T08:00:00+02:00');
  });
});

describe('craving_checkins', () => {
  it('UPSERT_CHECKIN_sameDayTwice_overwritesRatherThanDuplicating', () => {
    // Arrange
    db.prepare(UPSERT_CHECKIN).run('2026-08-08', 4, 2, 'rough morning', NOW);

    // Act
    db.prepare(UPSERT_CHECKIN).run('2026-08-08', 2, 4, 'better by evening', NOW);
    const rows = db.prepare('SELECT craving_intensity, mood, note FROM craving_checkins').all() as { craving_intensity: number }[];

    // Assert
    expect(rows).toHaveLength(1);
    expect(rows[0]?.craving_intensity).toBe(2);
  });

  it('UPSERT_CHECKIN_intensityOutOfRange_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(UPSERT_CHECKIN).run('2026-08-08', 9, 3, null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });
});

describe('migration v2', () => {
  it('MIGRATIONS_appliedToAV1Database_addsSmokedForMonthsAndBackfillsIt', () => {
    // Arrange — a v1 database holding a real lifetime_baseline, as a tester's would
    const old = new Database(':memory:');
    const v1 = MIGRATIONS.find((m) => m.version === 1);
    old.exec(v1?.up ?? '');
    old.prepare(
      `INSERT INTO settings (id, quit_date, cigarettes_per_day, cigarettes_per_pack,
         pack_price_minor, currency, timezone, lifetime_baseline, created_at, updated_at)
       VALUES (1, ?, 15, 20, 1100, 'EUR', 'Europe/Amsterdam', 43800, ?, ?)`,
    ).run('2026-06-26T06:00:00.000Z', NOW, NOW);

    // Act
    const v2 = MIGRATIONS.find((m) => m.version === 2);
    old.exec(v2?.up ?? '');
    const row = old.prepare('SELECT smoked_for_months, quit_date, cigarettes_per_day FROM settings WHERE id = 1')
      .get() as { smoked_for_months: number; quit_date: string; cigarettes_per_day: number };

    // Assert — 43800 / (15 x 30.44) = 95.9... rounds to 96
    expect(row.smoked_for_months).toBe(96);
    expect(row.quit_date).toBe('2026-06-26T06:00:00.000Z');
    expect(row.cigarettes_per_day).toBe(15);
  });

  it('MIGRATIONS_appliedToAV1DatabaseWithNoBaseline_leavesSmokedForMonthsZero', () => {
    // Arrange
    const old = new Database(':memory:');
    old.exec(MIGRATIONS.find((m) => m.version === 1)?.up ?? '');
    old.prepare(
      `INSERT INTO settings (id, quit_date, cigarettes_per_day, cigarettes_per_pack,
         pack_price_minor, currency, timezone, lifetime_baseline, created_at, updated_at)
       VALUES (1, ?, 15, 20, 1100, 'EUR', 'UTC', 0, ?, ?)`,
    ).run('2026-06-26T06:00:00.000Z', NOW, NOW);

    // Act
    old.exec(MIGRATIONS.find((m) => m.version === 2)?.up ?? '');
    const row = old.prepare('SELECT smoked_for_months FROM settings WHERE id = 1').get() as { smoked_for_months: number };

    // Assert
    expect(row.smoked_for_months).toBe(0);
  });

  it('SCHEMA_VERSION_afterAddingV6_isSix', () => {
    // Arrange & Act & Assert
    expect(SCHEMA_VERSION).toBe(6);
  });

  it('MIGRATIONS_freshDatabase_hasSmokedForMonthsColumn', () => {
    // Arrange & Act — the suite's beforeEach already applied every migration
    const cols = db.prepare("SELECT name FROM pragma_table_info('settings')").all() as { name: string }[];

    // Assert
    expect(cols.map((c) => c.name)).toContain('smoked_for_months');
  });
});

describe('migrationsToApply', () => {
  // `src/data/db.ts` cannot be loaded under Vitest (expo-sqlite is a native module), so the
  // rule that keeps its runner idempotent is tested here through the pure helper the runner
  // now calls. Applying the selection against a real better-sqlite3 database is what proves
  // the no-op claim, rather than just asserting on an array.
  const schemaSnapshot = (target: Database.Database): string =>
    JSON.stringify(
      target.prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all(),
    );

  it('migrationsToApply_fromZero_selectsEveryMigrationInAscendingVersionOrder', () => {
    // Arrange & Act
    const selected = migrationsToApply(0);

    // Assert
    expect(selected.map((m) => m.version)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('migrationsToApply_fromAV1Database_selectsV2AndV3', () => {
    // Arrange & Act
    const selected = migrationsToApply(1);

    // Assert
    expect(selected.map((m) => m.version)).toEqual([2, 3, 4, 5, 6]);
  });

  it('migrationsToApply_afterTheWholeSetHasBeenApplied_selectsNothingSoASecondPassIsANoOp', () => {
    // Arrange — a database brought fully up to date exactly the way the runner does it,
    // holding a real settings row so a stray UPDATE would be visible too
    const fresh = new Database(':memory:');
    for (const migration of migrationsToApply(0)) fresh.exec(migration.up);
    fresh.prepare(UPSERT_SETTINGS).run('2026-06-26T08:00:00+02:00', 15, 20, 1100, 'EUR', 'Europe/Amsterdam', 96, 'cigarettes', null, null, NOW, NOW);
    const before = schemaSnapshot(fresh);
    const rowBefore = fresh.prepare(SELECT_SETTINGS).get();

    // Act — the second pass, under the same guard the runner applies
    const secondPass = migrationsToApply(SCHEMA_VERSION);
    for (const migration of secondPass) fresh.exec(migration.up);

    // Assert — nothing was selected, so nothing ran and neither schema nor data moved
    expect(secondPass).toEqual([]);
    expect(schemaSnapshot(fresh)).toBe(before);
    expect(fresh.prepare(SELECT_SETTINGS).get()).toEqual(rowBefore);
  });

  it('migrationsToApply_selectionIgnored_replayingV2ThrowsDuplicateColumn', () => {
    // Arrange — this is what makes the guard load-bearing rather than decorative: if
    // user_version were bumped outside the migration's own transaction and the bump were
    // lost, the next launch would re-select v2 and hit a hard failure, not a no-op
    const fresh = new Database(':memory:');
    for (const migration of migrationsToApply(0)) fresh.exec(migration.up);
    const v2 = MIGRATIONS.find((m) => m.version === 2);

    // Act
    const act = () => fresh.exec(v2?.up ?? '');

    // Assert
    expect(act).toThrow(/duplicate column name: smoked_for_months/);
  });
});

describe('DELETE_ALL', () => {
  it('DELETE_ALL_appliedInOrder_emptiesEveryTable', () => {
    // Arrange
    insertSettings();
    db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 3, 'alcohol', null, null, NOW);
    db.prepare(UPSERT_CHECKIN).run('2026-08-08', 3, 3, null, NOW);
    db.prepare(UPSERT_PREFERENCE).run('reason', 'health');
    db.prepare(UPSERT_GAME_RECORD).run('blocks', 500, NOW);
    db.prepare(INSERT_CRAVING_EVENT).run(NOW, NOW, 'passed', null, 3, null, NOW);

    // Act
    for (const statement of DELETE_ALL) db.exec(statement);

    // Assert
    expect(db.prepare(SELECT_SETTINGS).all()).toEqual([]);
    expect(db.prepare(SELECT_SLIPS).all()).toEqual([]);
    expect(db.prepare('SELECT * FROM preferences').all()).toEqual([]);
    expect(db.prepare('SELECT * FROM game_records').all()).toEqual([]);
    expect(db.prepare('SELECT * FROM craving_events').all()).toEqual([]);
  });
});

describe('migration v3', () => {
  it('UPSERT_SETTINGS_vapeRow_roundTripsProductAndWeeklySpend', () => {
    // Arrange
    db.prepare(UPSERT_SETTINGS).run('2026-06-26T08:00:00Z', 15, 1, 0, 'EUR', 'UTC', 120, 'vape', 1500, 12, NOW, NOW);

    // Act
    const row = db.prepare(SELECT_SETTINGS).get() as { product: string; weekly_spend_minor: number; prior_cigarettes_per_day: number };

    // Assert
    expect(row.product).toBe('vape');
    expect(row.weekly_spend_minor).toBe(1500);
    expect(row.prior_cigarettes_per_day).toBe(12);
  });

  it('settings_unknownProduct_isRejectedByCheckConstraint', () => {
    // Arrange & Act
    const act = () => db.prepare(UPSERT_SETTINGS).run('2026-06-26T08:00:00Z', 15, 20, 1100, 'EUR', 'UTC', 0, 'cigars', null, null, NOW, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('settings_negativeWeeklySpend_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(UPSERT_SETTINGS).run('2026-06-26T08:00:00Z', 15, 1, 0, 'EUR', 'UTC', 0, 'vape', -1, null, NOW, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('migrationsToApply_fromVersionTwo_selectsThreeOnwards', () => {
    // Arrange & Act
    const pending = migrationsToApply(2);

    // Assert
    expect(pending.map((m) => m.version)).toEqual([3, 4, 5, 6]);
  });

  it('settings_rowWrittenBeforeV3_defaultsToCigarettes', () => {
    // Arrange — a fresh db at v2, a v2-shaped row, then v3
    const legacy = new Database(':memory:');
    for (const migration of MIGRATIONS.filter((m) => m.version <= 2)) legacy.exec(migration.up);
    legacy.prepare(`INSERT INTO settings (id, quit_date, cigarettes_per_day, cigarettes_per_pack, pack_price_minor,
      currency, timezone, created_at, updated_at) VALUES (1, ?, 15, 20, 1100, 'EUR', 'UTC', ?, ?)`).run(NOW, NOW, NOW);

    // Act
    for (const migration of migrationsToApply(2)) legacy.exec(migration.up);
    const row = legacy.prepare(SELECT_SETTINGS).get() as { product: string; weekly_spend_minor: number | null };

    // Assert
    expect(row.product).toBe('cigarettes');
    expect(row.weekly_spend_minor).toBeNull();
  });
});

describe('migration v4 — craving events', () => {
  it('INSERT_CRAVING_EVENT_passedWithActivity_roundTrips', () => {
    // Arrange
    db.prepare(INSERT_CRAVING_EVENT).run('2026-09-28T10:00:00.000Z', '2026-09-28T10:04:00.000Z', 'passed', 'blocks', null, null, NOW);

    // Act
    const rows = db.prepare(SELECT_CRAVING_EVENTS).all() as { outcome: string; activity: string | null }[];

    // Assert
    expect(rows).toEqual([expect.objectContaining({ outcome: 'passed', activity: 'blocks' })]);
  });

  it('craving_events_unknownOutcome_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(INSERT_CRAVING_EVENT).run('2026-09-28T10:00:00.000Z', '2026-09-28T10:01:00.000Z', 'maybe', null, null, null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('craving_events_unknownActivity_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(INSERT_CRAVING_EVENT).run('2026-09-28T10:00:00.000Z', '2026-09-28T10:01:00.000Z', 'passed', 'chess', null, null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('craving_events_endBeforeStart_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(INSERT_CRAVING_EVENT).run('2026-09-28T10:05:00.000Z', '2026-09-28T10:01:00.000Z', 'passed', null, null, null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('SELECT_CRAVING_EVENTS_twoEvents_returnsNewestFirst', () => {
    // Arrange
    db.prepare(INSERT_CRAVING_EVENT).run('2026-09-27T10:00:00.000Z', '2026-09-27T10:04:00.000Z', 'passed', null, null, null, NOW);
    db.prepare(INSERT_CRAVING_EVENT).run('2026-09-28T10:00:00.000Z', '2026-09-28T10:04:00.000Z', 'slipped', null, null, null, NOW);

    // Act
    const rows = db.prepare(SELECT_CRAVING_EVENTS).all() as { started_at: string }[];

    // Assert
    expect(rows.map((r) => r.started_at)).toEqual(['2026-09-28T10:00:00.000Z', '2026-09-27T10:00:00.000Z']);
  });
});

describe('migration v5 — slip product', () => {
  it('INSERT_SLIP_withProduct_roundTrips', () => {
    // Arrange
    db.prepare(INSERT_SLIP).run('2026-09-28T10:00:00.000Z', 2, null, null, 'cigarettes', NOW);

    // Act
    const rows = db.prepare(SELECT_SLIPS).all() as { product: string | null }[];

    // Assert
    expect(rows[0]?.product).toBe('cigarettes');
  });

  it('INSERT_SLIP_withoutProduct_storesNullMeaningTheUsersOwnProduct', () => {
    // Arrange
    db.prepare(INSERT_SLIP).run('2026-09-28T10:00:00.000Z', 2, null, null, null, NOW);

    // Act
    const rows = db.prepare(SELECT_SLIPS).all() as { product: string | null }[];

    // Assert
    expect(rows[0]?.product).toBeNull();
  });

  it('INSERT_SLIP_unknownProduct_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(INSERT_SLIP).run('2026-09-28T10:00:00.000Z', 2, null, null, 'cigars', NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });
});

describe('migration v6 — preferences, records, craving strength', () => {
  it('UPSERT_PREFERENCE_twice_keepsTheLatestValue', () => {
    // Arrange
    db.prepare(UPSERT_PREFERENCE).run('sound', 'on');

    // Act
    db.prepare(UPSERT_PREFERENCE).run('sound', 'off');
    const rows = db.prepare('SELECT key, value FROM preferences').all();

    // Assert
    expect(rows).toEqual([{ key: 'sound', value: 'off' }]);
  });

  it('game_records_unknownGame_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(UPSERT_GAME_RECORD).run('chess', 10, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('UPSERT_GAME_RECORD_twice_replacesTheBest', () => {
    // Arrange
    db.prepare(UPSERT_GAME_RECORD).run('bubbles', 12, NOW);

    // Act
    db.prepare(UPSERT_GAME_RECORD).run('bubbles', 30, NOW);
    const rows = db.prepare('SELECT game, best FROM game_records').all();

    // Assert
    expect(rows).toEqual([{ game: 'bubbles', best: 30 }]);
  });

  it('UPSERT_GAME_RECORD_worseHigherIsBetterScore_keepsTheStoredBest', () => {
    // Arrange
    db.prepare(UPSERT_GAME_RECORD).run('blocks', 1200, NOW);

    // Act
    db.prepare(UPSERT_GAME_RECORD).run('blocks', 300, '2026-08-09T08:00:00.000Z');
    const rows = db.prepare('SELECT game, best, achieved_at FROM game_records').all();

    // Assert
    expect(rows).toEqual([{ game: 'blocks', best: 1200, achieved_at: NOW }]);
  });

  it('UPSERT_GAME_RECORD_memoryMoreMoves_keepsTheFewerMoves', () => {
    // Arrange
    db.prepare(UPSERT_GAME_RECORD).run('memory', 9, NOW);

    // Act
    db.prepare(UPSERT_GAME_RECORD).run('memory', 14, NOW);
    const rows = db.prepare('SELECT game, best FROM game_records').all();

    // Assert
    expect(rows).toEqual([{ game: 'memory', best: 9 }]);
  });

  it('craving_events_strengthOutOfRange_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(INSERT_CRAVING_EVENT).run('2026-09-28T10:00:00.000Z', '2026-09-28T10:04:00.000Z', 'passed', null, 6, null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('INSERT_CRAVING_EVENT_withStrengths_roundTrips', () => {
    // Arrange
    db.prepare(INSERT_CRAVING_EVENT).run('2026-09-28T10:00:00.000Z', '2026-09-28T10:04:00.000Z', 'passed', 'breathe', 4, 2, NOW);

    // Act
    const rows = db.prepare(SELECT_CRAVING_EVENTS).all() as { strength_start: number; strength_end: number }[];

    // Assert
    expect(rows[0]).toEqual(expect.objectContaining({ strength_start: 4, strength_end: 2 }));
  });
});

describe('migration v6 on an existing install', () => {
  it('MIGRATIONS_v6AppliedToAV5DatabaseWithCravings_keepsThemWithNullStrengths', () => {
    // Arrange
    const old = new Database(':memory:');
    for (const migration of MIGRATIONS.filter((m) => m.version <= 5)) old.exec(migration.up);
    old.prepare("INSERT INTO craving_events (started_at, ended_at, outcome, activity, created_at) VALUES (?, ?, 'passed', 'breathe', ?)").run(NOW, NOW, NOW);

    // Act
    for (const migration of migrationsToApply(5)) old.exec(migration.up);
    const rows = old.prepare(SELECT_CRAVING_EVENTS).all();

    // Assert
    expect(rows).toEqual([expect.objectContaining({ outcome: 'passed', activity: 'breathe', strength_start: null, strength_end: null })]);
  });
});
