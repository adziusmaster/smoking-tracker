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
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
