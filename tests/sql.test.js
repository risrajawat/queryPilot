import { afterEach, describe, expect, it } from 'vitest';
import { generateSql } from '../src/lib/sql/generator.js';
import { validateSql } from '../src/lib/sql/validator.js';
import { clearSessions, createSession, updateSession } from '../src/lib/conversation/session-store.js';
import sqlHandler from '../pages/api/conversations/[id]/sql.js';

const schema = `TABLE customers
  - id INTEGER
  - first_name TEXT
  - last_name TEXT
  - email TEXT
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

afterEach(() => clearSessions());

describe('Phase 4 SQL generation', () => {
  it.each([
    [{ name: 'customer_ranking', metric: 'total_revenue' }, 'SUM', 'customers'],
    [{ name: 'customer_ranking', metric: 'order_count' }, 'COUNT', 'orders'],
    [{ name: 'customer_ranking', metric: 'last_purchase' }, 'MAX', 'orders'],
    [{ name: 'customer_list' }, 'first_name', 'customers'],
    [{ name: 'order_summary' }, 'total_cents', 'orders'],
    [{ name: 'product_inventory' }, 'stock_quantity', 'products'],
  ])('generates schema-bound SQL for %j', (intent, expected, table) => {
    const result = generateSql(intent, schema);
     expect(result).toMatchObject({ success: true });
    expect(result.sql).toContain(expected);
    expect(result.sql).toContain(table);
    expect(validateSql(result.sql, schema).valid).toBe(true);
  });

  it('passes context values as parameters rather than interpolating them', () => {
    const result = generateSql({ name: 'order_summary' }, schema, { filters: { status: "paid' OR 1=1" } });
    expect(result.parameters).toEqual(["paid' OR 1=1"]);
    expect(result.sql).toContain('= ?');
  });

  it('returns unsupported_intent when required schema identifiers are absent', () => {
    const result = generateSql({ name: 'product_inventory' }, 'TABLE products\n  - id INTEGER\n  - name TEXT');
    expect(result).toMatchObject({ success: false, unsupported_intent: true });
  });
});

describe('SQL validation and endpoint boundary', () => {
   it.each([
     ['', 'empty'],
     ['INSERT INTO customers (email) VALUES ("x")', 'INSERT'],
     ['UPDATE customers SET email = "x"', 'UPDATE'],
     ['DELETE FROM customers', 'DELETE'],
     ['DROP TABLE customers', 'DROP'],
     ['ALTER TABLE customers ADD COLUMN x TEXT', 'ALTER'],
     ['CREATE TABLE x (id INTEGER)', 'CREATE'],
     ['REPLACE INTO customers (id) VALUES (1)', 'REPLACE'],
     ['TRUNCATE TABLE customers', 'TRUNCATE'],
     ['ATTACH DATABASE "x" AS x', 'ATTACH'],
     ['DETACH DATABASE x', 'DETACH'],
     ['PRAGMA user_version', 'PRAGMA'],
     ['VACUUM', 'VACUUM'],
     ['BEGIN; SELECT 1', 'transaction'],
     ['SELECT 1; DELETE FROM customers', 'multiple'],
     ['SELECT 1 -- comment', 'comments'],
     ['SELECT 1 /* comment */', 'comments'],
     ['SELECT * FROM unknown_table', 'unknown table'],
     ['SELECT unknown_column FROM customers', 'unknown column'],
   ])('rejects %s SQL (%s)', (sql) => expect(validateSql(sql, schema).valid).toBe(false));

  it('generates through the conversation endpoint without executing SQL', () => {
    const session = createSession({ schema });
    updateSession(session.id, (value) => { value.currentIntent = { name: 'customer_list', status: 'clear' }; return value; });
    const response = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} };
    sqlHandler({ method: 'POST', query: { id: session.id } }, response);
    expect(response.statusCode).toBe(200);
     expect(response.body.intent.name).toBe('customer_list');
     expect(response.body.sql).toMatch(/^SELECT/);
     expect(response.body.validation.valid).toBe(true);
  });

  it('rejects endpoint generation while clarification is pending', () => {
    const session = createSession({ schema });
    updateSession(session.id, (value) => { value.clarification = { pending: true, question: 'Choose', choices: [] }; return value; });
    const response = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} };
    sqlHandler({ method: 'POST', query: { id: session.id } }, response);
    expect(response.statusCode).toBe(409);
  });
});
