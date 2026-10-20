import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, seedDatabase } from '../src/lib/db/index.js';
import { compactSchema, getDatabaseSchema, introspectDatabase } from '../src/lib/db/schema-introspection.js';

let database;
afterEach(() => database?.close());

describe('database foundation', () => {
  it('creates all commerce tables with foreign keys enabled', () => {
    database = createDatabase();
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(({ name }) => name);
    expect(tables).toEqual(['categories', 'customers', 'order_items', 'orders', 'payments', 'products']);
    expect(database.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('seeds realistic, relational commerce data idempotently', () => {
    database = createDatabase();
    seedDatabase(database);
    seedDatabase(database);
    expect(database.prepare('SELECT COUNT(*) AS count FROM customers').get().count).toBe(6);
    expect(database.prepare('SELECT COUNT(*) AS count FROM orders').get().count).toBe(7);
    expect(database.prepare('SELECT COUNT(*) AS count FROM payments').get().count).toBe(7);
    const total = database.prepare('SELECT total_cents FROM orders WHERE id = 1001').get().total_cents;
    const itemTotal = database.prepare('SELECT SUM(quantity * unit_price_cents) AS total FROM order_items WHERE order_id = 1001').get().total;
    expect(itemTotal).toBe(17998);
    expect(total).toBe(19618);
    expect(database.prepare('SELECT COUNT(*) AS count FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)').get().count).toBe(1);
    expect(database.prepare('SELECT COUNT(*) AS count FROM orders WHERE customer_id = 1').get().count).toBe(3);
  });

  it('enforces foreign-key relationships', () => {
    database = createDatabase();
    expect(() => database.prepare('INSERT INTO orders (id, customer_id, status, subtotal_cents, total_cents, ordered_at) VALUES (9, 999, \'pending\', 0, 0, \'2025-01-01\')').run()).toThrow();
  });
});

describe('database schema introspection', () => {
  it('returns tables, columns, types, primary keys, foreign keys, and relationships without rows', () => {
    database = createDatabase();
    seedDatabase(database);
    const schema = introspectDatabase(database);

    expect(schema.tables.map((table) => table.name)).toEqual([
      'categories', 'customers', 'order_items', 'orders', 'payments', 'products',
    ]);
    const products = schema.tables.find((table) => table.name === 'products');
    expect(products.primaryKeys).toEqual(['id']);
    expect(products.columns.find((column) => column.name === 'price_cents')).toMatchObject({ type: 'INTEGER', primaryKey: false });
    expect(products.columns.find((column) => column.name === 'id')).toMatchObject({ type: 'INTEGER', primaryKey: true });
    expect(products.foreignKeys).toContainEqual(expect.objectContaining({
      column: 'category_id', referencedTable: 'categories', referencedColumn: 'id',
    }));
    expect(schema.relationships).toContainEqual({
      fromTable: 'orders', fromColumn: 'customer_id', toTable: 'customers', toColumn: 'id',
    });
    expect(JSON.stringify(schema)).not.toContain('Maya');
    expect(schema).not.toHaveProperty('rows');
  });

  it('creates a compact schema representation with no row data', () => {
    database = createDatabase();
    seedDatabase(database);
    const schema = getDatabaseSchema(database);
    const compact = compactSchema(schema);

    expect(compact).toContain('TABLE orders');
    expect(compact).toContain('  - total_cents INTEGER (NOT NULL)');
    expect(compact).toContain('orders.customer_id -> customers.id');
    expect(compact).not.toContain('1001');
    expect(compact).not.toContain('maya.chen@example.com');
    expect(schema).toHaveProperty('compact', compact);
  });
});
