import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';
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
} from './queries';

let db: Database.Database;

const NOW = '2026-08-08T08:00:00.000Z';

const insertSettings = (quitDate = '2026-06-26T08:00:00+02:00') =>
  db.prepare(UPSERT_SETTINGS).run(quitDate, 15, 20, 1100, 'EUR', 'Europe/Amsterdam', 96, NOW, NOW);

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
      'craving_checkins', 'milestone_events', 'settings', 'slips', 'smoking_periods',
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
    const act = () => db.prepare(UPSERT_SETTINGS).run('2026-06-26T08:00:00+02:00', 0, 20, 1100, 'EUR', 'UTC', 0, NOW, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('UPSERT_SETTINGS_thenSelect_roundTripsSmokedForMonthsWithoutTransposingNeighbours', () => {
    // Arrange — 77 cannot collide with any other numeric column in this row
    const createdAt = '2026-08-08T08:00:00.000Z';

    // Act
    db.prepare(UPSERT_SETTINGS).run(
      '2026-06-26T08:00:00+02:00', 15, 20, 1100, 'EUR', 'Europe/Amsterdam', 77, createdAt, createdAt,
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
    db.prepare(INSERT_SLIP).run('2026-07-04T20:00:00+02:00', 1, null, null, NOW);
    db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 3, 'alcohol', 'party', NOW);

    // Act
    const rows = db.prepare(SELECT_SLIPS).all() as { occurred_at: string }[];

    // Assert
    expect(rows[0]?.occurred_at).toBe('2026-08-05T22:00:00+02:00');
  });

  it('INSERT_SLIP_unknownTrigger_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 3, 'peer-pressure', null, NOW);

    // Assert
    expect(act).toThrow(/CHECK constraint failed/);
  });

  it('INSERT_SLIP_zeroCigarettes_isRejected', () => {
    // Arrange & Act
    const act = () => db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 0, null, null, NOW);

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

  it('SCHEMA_VERSION_afterAddingV2_isTwo', () => {
    // Arrange & Act & Assert
    expect(SCHEMA_VERSION).toBe(2);
  });

  it('MIGRATIONS_freshDatabase_hasSmokedForMonthsColumn', () => {
    // Arrange & Act — the suite's beforeEach already applied every migration
    const cols = db.prepare("SELECT name FROM pragma_table_info('settings')").all() as { name: string }[];

    // Assert
    expect(cols.map((c) => c.name)).toContain('smoked_for_months');
  });
});

describe('DELETE_ALL', () => {
  it('DELETE_ALL_appliedInOrder_emptiesEveryTable', () => {
    // Arrange
    insertSettings();
    db.prepare(INSERT_SLIP).run('2026-08-05T22:00:00+02:00', 3, 'alcohol', null, NOW);
    db.prepare(UPSERT_CHECKIN).run('2026-08-08', 3, 3, null, NOW);

    // Act
    for (const statement of DELETE_ALL) db.exec(statement);

    // Assert
    expect(db.prepare(SELECT_SETTINGS).all()).toEqual([]);
    expect(db.prepare(SELECT_SLIPS).all()).toEqual([]);
  });
});
