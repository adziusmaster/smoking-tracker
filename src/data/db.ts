import type { SQLiteDatabase } from 'expo-sqlite';
import { migrationsToApply, SCHEMA_VERSION } from './schema';

export const DATABASE_NAME = 'smokefree.db';

/**
 * Applies any migration newer than the stored `user_version`. Runs on every launch via
 * SQLiteProvider's onInit, so it must stay idempotent.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  // Common path on every launch after the first: nothing to do, so no transaction is opened.
  if (current >= SCHEMA_VERSION) return;

  // `foreign_keys` is a connection-level pragma and a no-op inside a transaction, so it stays
  // outside one.
  await db.execAsync('PRAGMA foreign_keys = ON');

  const pending = migrationsToApply(current);

  // The DDL and the `user_version` bump must commit together. Both are transactional in
  // SQLite, and if they were separate the process could die after the ALTER but before the
  // bump: every later launch would then replay v2, fail with `duplicate column name`, and
  // throw out of onInit — an unrecoverable launch failure, since this app's only backup is a
  // manual export the user could no longer reach.
  await db.withTransactionAsync(async () => {
    for (const migration of pending) {
      await db.execAsync(migration.up);
    }

    // PRAGMA does not accept bound parameters, so interpolate the validated integer.
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
}
