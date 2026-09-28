import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './schema';

type Bind = string | number | null;

/**
 * Test-only: a better-sqlite3 database behind the small slice of the expo-sqlite async API that
 * `repositories.ts` uses, so repository functions (not just SQL constants) run under Vitest.
 * `expo-sqlite` itself is native and cannot load in Node.
 */
export function openTestDb(): SQLiteDatabase {
  const db = new Database(':memory:');
  for (const migration of MIGRATIONS) db.exec(migration.up);
  const adapter = {
    getFirstAsync: async (sql: string, ...params: Bind[]) => db.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql: string, ...params: Bind[]) => db.prepare(sql).all(...params),
    runAsync: async (sql: string, ...params: Bind[]) => {
      const result = db.prepare(sql).run(...params);
      return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
    },
    execAsync: async (sql: string) => {
      db.exec(sql);
    },
    withTransactionAsync: async (task: () => Promise<void>) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  // The adapter implements only what repositories.ts calls; the cast is confined to this test helper.
  return adapter as unknown as SQLiteDatabase;
}
