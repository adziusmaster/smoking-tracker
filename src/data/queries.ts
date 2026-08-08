export const UPSERT_SETTINGS = `
  INSERT INTO settings (
    id, quit_date, cigarettes_per_day, cigarettes_per_pack, pack_price_minor,
    currency, timezone, lifetime_baseline, created_at, updated_at
  )
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (id) DO UPDATE SET
    quit_date           = excluded.quit_date,
    cigarettes_per_day  = excluded.cigarettes_per_day,
    cigarettes_per_pack = excluded.cigarettes_per_pack,
    pack_price_minor    = excluded.pack_price_minor,
    currency            = excluded.currency,
    timezone            = excluded.timezone,
    lifetime_baseline   = excluded.lifetime_baseline,
    updated_at          = excluded.updated_at
`;

export const SELECT_SETTINGS = `
  SELECT quit_date, cigarettes_per_day, cigarettes_per_pack, pack_price_minor,
         currency, timezone, lifetime_baseline
  FROM settings WHERE id = 1
`;

export const INSERT_SLIP = `
  INSERT INTO slips (occurred_at, cigarette_count, trigger, note, created_at)
  VALUES (?, ?, ?, ?, ?)
`;

export const SELECT_SLIPS = `
  SELECT id, occurred_at, cigarette_count, trigger, note
  FROM slips ORDER BY occurred_at DESC
`;

export const DELETE_SLIP = `DELETE FROM slips WHERE id = ?`;

export const INSERT_SMOKING_PERIOD = `
  INSERT INTO smoking_periods (started_at, ended_at, average_cigarettes_per_day, note, created_at)
  VALUES (?, ?, ?, ?, ?)
`;

export const END_OPEN_SMOKING_PERIOD = `
  UPDATE smoking_periods SET ended_at = ? WHERE ended_at IS NULL
`;

export const SELECT_SMOKING_PERIODS = `
  SELECT id, started_at, ended_at, average_cigarettes_per_day, note
  FROM smoking_periods ORDER BY started_at DESC
`;

export const UPSERT_MILESTONE_EVENT = `
  INSERT INTO milestone_events (milestone_id, reached_at)
  VALUES (?, ?)
  ON CONFLICT (milestone_id) DO NOTHING
`;

export const MARK_MILESTONE_NOTIFIED = `
  UPDATE milestone_events SET notified_at = ? WHERE milestone_id = ?
`;

export const SELECT_UNNOTIFIED_MILESTONES = `
  SELECT milestone_id, reached_at FROM milestone_events WHERE notified_at IS NULL
`;

export const UPSERT_CHECKIN = `
  INSERT INTO craving_checkins (logged_on, craving_intensity, mood, note, created_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (logged_on) DO UPDATE SET
    craving_intensity = excluded.craving_intensity,
    mood              = excluded.mood,
    note              = excluded.note
`;

export const SELECT_CHECKINS = `
  SELECT logged_on, craving_intensity, mood, note
  FROM craving_checkins ORDER BY logged_on DESC LIMIT ?
`;

/** Ordered so children go before parents; used by the wipe-everything action. */
export const DELETE_ALL = [
  'DELETE FROM craving_checkins',
  'DELETE FROM milestone_events',
  'DELETE FROM smoking_periods',
  'DELETE FROM slips',
  'DELETE FROM settings',
];
