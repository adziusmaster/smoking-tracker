import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';

export const DATABASE_NAME = 'smokefree.db';

/**
 * Applies any migration newer than the stored `user_version`. Runs on every launch via
 * SQLiteProvider's onInit, so it must stay idempotent.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current >= SCHEMA_VERSION) return;

  await db.execAsync('PRAGMA foreign_keys = ON');

  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      await db.execAsync(migration.up);
    }
  }

  // PRAGMA does not accept bound parameters, so interpolate the validated integer.
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
