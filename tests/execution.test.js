import { afterEach, describe, expect, it } from 'vitest';
import { executeSql, MAX_RESULT_ROWS } from '../src/lib/sql/executor.js';
import { generateSql } from '../src/lib/sql/generator.js';
import { clearSessions, createSession, updateSession } from '../src/lib/conversation/session-store.js';
import executeHandler from '../pages/api/conversations/[id]/execute.js';

const schema = `TABLE customers
  - id INTEGER
  - first_name TEXT
  - last_name TEXT
  - email TEXT
  - country TEXT
TABLE orders
  - id INTEGER
  - customer_id INTEGER
  - status TEXT
  - total_cents INTEGER
  - ordered_at TEXT
TABLE products
  - id INTEGER
  - sku TEXT
  - name TEXT
  - stock_quantity INTEGER`;

function response() {
  return { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} };
}

afterEach(() => clearSessions());

describe('Phase 5 SQL executor', () => {
  it.each([
    [{ name: 'customer_list' }, 'customers'],
    [{ name: 'order_summary' }, 'orders'],
    [{ name: 'product_inventory' }, 'products'],
    [{ name: 'customer_ranking', metric: 'total_revenue' }, 'orders'],
    [{ name: 'customer_ranking', metric: 'order_count' }, 'orders'],
    [{ name: 'customer_ranking', metric: 'last_purchase' }, 'orders'],
  ])('executes the supported %j intent against seeded data', (intent, table) => {
    const generated = generateSql(intent, schema);
    const result = executeSql(generated.sql, generated.parameters, schema);
    expect(generated.success).toBe(true);
    expect(result).toMatchObject({ success: true });
    expect(result.columns.length).toBeGreaterThan(0);
    expect(result.rowCount).toBe(result.rows.length);
    expect(result.rowCount).toBeLessThanOrEqual(MAX_RESULT_ROWS);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(generated.sql.toLowerCase()).toContain(table);
  });

  it('returns a stable empty result', () => {
    const result = executeSql('SELECT c."id" FROM "customers" c WHERE c."id" = ?', [999999], schema);
    expect(result).toEqual({ success: true, columns: ['id'], rows: [], rowCount: 0 });
  });

  it.each([
    'INSERT INTO customers (email) VALUES (?)',
    'UPDATE customers SET email = "x"',
    'DELETE FROM customers',
    'DROP TABLE customers',
    'ALTER TABLE customers ADD COLUMN x TEXT',
    'CREATE TABLE x (id INTEGER)',
    'PRAGMA user_version',
    'SELECT * FROM customers; DELETE FROM customers',
    'SELECT nope FROM customers',
    'SELECT * FROM customers -- comment',
  ])('rejects %s before opening the database', (sql) => {
    let databaseOpened = false;
    const result = executeSql(sql, ['x'], schema, { databaseFactory: () => { databaseOpened = true; throw new Error('must not open'); } });
    expect(result.success).toBe(false);
    expect(databaseOpened).toBe(false);
    expect(result.rows).toEqual([]);
     expect(result.reason).toBe('sql_validation_failed');
     expect(result.message).not.toMatch(/stack|querypilot\.sqlite|node_modules/i);
  });

  it('keeps the validator as the execution gate for object input', () => {
    let databaseOpened = false;
    const result = executeSql({
      sql: 'DROP TABLE customers',
      parameters: [],
      schema,
      databaseFactory: () => { databaseOpened = true; throw new Error('must not open'); },
    });
    expect(result).toMatchObject({ success: false, reason: 'sql_validation_failed' });
    expect(databaseOpened).toBe(false);
  });

  it('rejects unsafe parameters and hides execution errors', () => {
     expect(executeSql('SELECT c."id" FROM "customers" c', [{ arbitrary: true }], schema)).toMatchObject({ reason: 'sql_validation_failed', message: 'SQL parameters are invalid.' });
     const result = executeSql('SELECT c."id" FROM "customers" c WHERE c."id" = ?', [], schema);
     expect(result).toMatchObject({ success: false, reason: 'execution_error', columns: [], rows: [], rowCount: 0, message: 'The query could not be executed.' });
     expect(JSON.stringify(result)).not.toMatch(/querypilot\.sqlite|at .*\.js:/i);
  });
});

describe('execution endpoint boundary', () => {
  it('generates server-side and ignores arbitrary SQL in the request body', () => {
    const session = createSession({ schema });
    updateSession(session.id, (value) => { value.currentIntent = { name: 'customer_list', status: 'clear' }; return value; });
    const result = response();
    executeHandler({ method: 'POST', query: { id: session.id }, body: { sql: 'DROP TABLE customers' } }, result);
    expect(result.statusCode).toBe(200);
    expect(result.body.sql).toMatch(/^SELECT/);
    expect(result.body.sql).not.toContain('DROP');
    expect(result.body.rows).toBeInstanceOf(Array);
  });

  it.each([
    ['missing', 'does-not-exist', 404],
    ['pending clarification', 'pending', 409],
    ['unresolved intent', 'unresolved', 409],
  ])('rejects %s conversations', (_label, kind, status) => {
    let id = kind;
    if (kind !== 'does-not-exist') {
      const session = createSession({ schema }); id = session.id;
      updateSession(id, (value) => {
        if (kind === 'pending') value.clarification.pending = true;
        return value;
      });
    }
    const result = response();
    executeHandler({ method: 'POST', query: { id } }, result);
    expect(result.statusCode).toBe(status);
  });
});
