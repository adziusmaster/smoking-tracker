export interface Migration {
  version: number;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE settings (
        id                   INTEGER PRIMARY KEY CHECK (id = 1),
        quit_date            TEXT    NOT NULL,
        cigarettes_per_day   INTEGER NOT NULL CHECK (cigarettes_per_day > 0),
        cigarettes_per_pack  INTEGER NOT NULL DEFAULT 20 CHECK (cigarettes_per_pack > 0),
        pack_price_minor     INTEGER NOT NULL CHECK (pack_price_minor >= 0),
        currency             TEXT    NOT NULL DEFAULT 'EUR',
        timezone             TEXT    NOT NULL,
        -- Superseded by smoked_for_months (migration v2). Retained because dropping a
        -- column is destructive and buys only tidiness. Nothing reads this.
        lifetime_baseline    INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_baseline >= 0),
        created_at           TEXT    NOT NULL,
        updated_at           TEXT    NOT NULL
      );

      CREATE TABLE slips (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        occurred_at     TEXT    NOT NULL,
        cigarette_count INTEGER NOT NULL CHECK (cigarette_count > 0),
        trigger         TEXT        NULL CHECK (trigger IN ('alcohol','stress','social','boredom','routine','other')),
        note            TEXT        NULL,
        created_at      TEXT    NOT NULL
      );

      CREATE INDEX idx_slips_occurred_at ON slips (occurred_at DESC);

      CREATE TABLE smoking_periods (
        id                          INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at                  TEXT    NOT NULL,
        ended_at                    TEXT        NULL,
        average_cigarettes_per_day  INTEGER NOT NULL CHECK (average_cigarettes_per_day > 0),
        note                        TEXT        NULL,
        created_at                  TEXT    NOT NULL,
        CHECK (ended_at IS NULL OR ended_at >= started_at)
      );

      -- notified_at is RESERVED AND CURRENTLY UNUSED: nothing writes it and nothing reads it.
      -- Notification suppression does not depend on this table at all -- already-reached
      -- milestones are never planned, and syncNotifications cancels and rebuilds the whole
      -- OS queue. The column is kept so v1 databases need no migration if a future release
      -- wants per-notification bookkeeping. Do not treat it as load-bearing.
      CREATE TABLE milestone_events (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        milestone_id TEXT NOT NULL UNIQUE,
        reached_at   TEXT NOT NULL,
        notified_at  TEXT     NULL
      );

      CREATE TABLE craving_checkins (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        logged_on         TEXT    NOT NULL UNIQUE,
        craving_intensity INTEGER NOT NULL CHECK (craving_intensity BETWEEN 1 AND 5),
        mood              INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
        note              TEXT        NULL,
        created_at        TEXT    NOT NULL
      );
    `,
  },
  {
    version: 2,
    up: `
      ALTER TABLE settings ADD COLUMN smoked_for_months INTEGER NOT NULL DEFAULT 0;

      -- Invert the old derivation so an existing answer survives the change of shape:
      -- lifetime_baseline was a raw cigarette count, smoked_for_months is a duration.
      UPDATE settings
         SET smoked_for_months = CAST(
               ROUND(lifetime_baseline / (cigarettes_per_day * 30.44)) AS INTEGER)
       WHERE lifetime_baseline > 0;
    `,
  },
  {
    version: 3,
    up: `
      -- What the user is quitting. Existing rows default to cigarettes, which is exactly
      -- what they were before this column existed.
      ALTER TABLE settings ADD COLUMN product TEXT NOT NULL DEFAULT 'cigarettes'
        CHECK (product IN ('cigarettes','roll-your-own','heated','vape','snus','pouches'));
      -- Vape cost model. NULL for every pack-priced product.
      ALTER TABLE settings ADD COLUMN weekly_spend_minor INTEGER NULL CHECK (weekly_spend_minor >= 0);
      -- Cigarette rate before switching, for non-combustible products only. For cigarettes
      -- and roll-your-own the history rate IS cigarettes_per_day, so this stays NULL.
      ALTER TABLE settings ADD COLUMN prior_cigarettes_per_day INTEGER NULL
        CHECK (prior_cigarettes_per_day > 0);
    `,
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

/**
 * Selects the migrations a database at `current` still needs, in ascending version order.
 *
 * Pure and exported so the selection rule that makes the runner idempotent can be tested
 * in Node: `db.ts` itself cannot be exercised under Vitest because `expo-sqlite` is native.
 * Re-running the set after a successful upgrade must select nothing — that is what stops a
 * second launch from replaying `ALTER TABLE` and failing with `duplicate column name`.
 */
export function migrationsToApply(current: number): Migration[] {
  return MIGRATIONS.filter((migration) => migration.version > current).sort(
    (a, b) => a.version - b.version,
  );
}
