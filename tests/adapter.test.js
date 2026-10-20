import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import {
  getDatabaseAdapter,
  isTursoConfigured,
  isServerlessEnvironment,
  SqliteAdapter,
  TursoAdapter,
} from '../src/lib/db/adapter.js';
import { initTursoDatabase, introspectTurso, getTursoExplorerData, executeTursoSql } from '../src/lib/db/turso.js';
import { introspectDatabase, compactSchema } from '../src/lib/db/schema-introspection.js';
import { createDatabase, seedDatabase } from '../src/lib/db/index.js';

describe('Database Adapter Abstraction', () => {
  it('defaults to SqliteAdapter in local development without Turso credentials', () => {
    const adapter = getDatabaseAdapter();
    expect(adapter).toBeInstanceOf(SqliteAdapter);
    expect(adapter.provider).toBe('sqlite');
    expect(adapter.isAsync).toBe(false);
  });

  it('SqliteAdapter passes health check, introspects schema, and executes bounded queries', () => {
    const adapter = new SqliteAdapter();
    const health = adapter.checkHealth();
    expect(health).toEqual({ ok: true, provider: 'sqlite' });

    const schema = adapter.getSchema();
    expect(schema.tables.map((t) => t.name)).toContain('customers');
    expect(schema.compact).toContain('TABLE customers');

    const explorer = adapter.getExplorerData('customers');
    expect(explorer.table.name).toBe('customers');
    expect(explorer.rows.length).toBeLessThanOrEqual(50);

    const execResult = adapter.execute('SELECT COUNT(*) AS count FROM customers');
    expect(execResult.success).toBe(true);
    expect(execResult.rows[0].count).toBe(60);
  });

  it('guards against local filesystem writes in serverless environment', () => {
    const origVercel = process.env.VERCEL;
    try {
      process.env.VERCEL = '1';
      expect(isServerlessEnvironment()).toBe(true);

      const serverlessAdapter = getDatabaseAdapter();
      expect(serverlessAdapter.provider).toBe('unconfigured');
      expect(serverlessAdapter.checkHealth().ok).toBe(false);
      expect(() => serverlessAdapter.getSchema()).toThrow(/TURSO_DATABASE_URL/);
    } finally {
      if (origVercel !== undefined) {
        process.env.VERCEL = origVercel;
      } else {
        delete process.env.VERCEL;
      }
    }
  });

  it('TursoAdapter works with libSQL client, initializes safely, and matches SQLite schema contract', async () => {
    const memClient = createClient({ url: ':memory:' });
    const adapter = new TursoAdapter({ client: memClient });
    expect(adapter.provider).toBe('turso');
    expect(adapter.isAsync).toBe(true);

    const health = await adapter.checkHealth();
    expect(health).toEqual({ ok: true, provider: 'turso' });

    // Verify idempotency of initialization
    await initTursoDatabase(memClient);
    await initTursoDatabase(memClient);

    const schema = await adapter.getSchema();
    expect(schema.tables.map((t) => t.name)).toEqual([
      'categories',
      'customers',
      'order_items',
      'orders',
      'payments',
      'products',
    ]);
    expect(schema.relationships.length).toBeGreaterThan(0);
    expect(schema.compact).toContain('TABLE orders');

    // Compare with SQLite schema
    const sqliteDb = createDatabase();
    seedDatabase(sqliteDb);
    const sqliteSchema = introspectDatabase(sqliteDb);
    sqliteDb.close();

    expect(schema.tables.map((t) => t.name)).toEqual(sqliteSchema.tables.map((t) => t.name));

    // Test explorer with Turso
    const explorer = await adapter.getExplorerData('customers');
    expect(explorer.table.name).toBe('customers');
    expect(explorer.rows.length).toBe(50);
    expect(explorer.rowCount).toBe(50);
    expect(explorer.tables.find((t) => t.name === 'customers').rowCount).toBe(60);

    // Test query execution with Turso
    const execResult = await adapter.execute('SELECT id, first_name, last_name FROM customers WHERE id = ?', [1]);
    expect(execResult.success).toBe(true);
    expect(execResult.rows).toHaveLength(1);
    expect(execResult.rows[0].first_name).toBe('Avery');

    await adapter.close();
  });
});
