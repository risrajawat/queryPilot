import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, seedDatabase } from '../src/lib/db/index.js';
import { createSeedData } from '../src/lib/db/seed.js';
import { compactSchema, getDatabaseSchema, introspectDatabase } from '../src/lib/db/schema-introspection.js';
import { getExplorerData } from '../src/lib/db/explorer.js';

let database;
afterEach(() => database?.close());

describe('database foundation', () => {
  it('creates all commerce tables with foreign keys enabled', () => {
    database = createDatabase();
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(({ name }) => name);
    expect(tables).toEqual(['categories', 'customers', 'order_items', 'orders', 'payments', 'products']);
    expect(database.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('seeds deterministic synthetic commerce data idempotently', () => {
    database = createDatabase();
    seedDatabase(database);
    seedDatabase(database);
    expect(database.prepare('SELECT COUNT(*) AS count FROM customers').get().count).toBe(60);
    expect(database.prepare('SELECT COUNT(*) AS count FROM categories').get().count).toBe(9);
    expect(database.prepare('SELECT COUNT(*) AS count FROM products').get().count).toBe(36);
    expect(database.prepare('SELECT COUNT(*) AS count FROM orders').get().count).toBe(300);
    expect(database.prepare('SELECT COUNT(*) AS count FROM payments').get().count).toBe(300);
    expect(database.prepare('SELECT COUNT(*) AS count FROM order_items').get().count).toBeGreaterThanOrEqual(600);
    expect(database.prepare('SELECT COUNT(*) AS count FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)').get().count).toBeGreaterThan(0);
    expect(database.prepare('SELECT COUNT(*) AS count FROM customers WHERE id IN (SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > 1)').get().count).toBeGreaterThan(0);
    expect(database.prepare('SELECT COUNT(*) AS count FROM orders WHERE total_cents != subtotal_cents + tax_cents + shipping_cents').get().count).toBe(0);
    expect(database.prepare('SELECT COUNT(*) AS count FROM orders o JOIN order_items i ON i.order_id = o.id GROUP BY o.id HAVING SUM(i.quantity * i.unit_price_cents) != o.subtotal_cents').all()).toHaveLength(0);
    expect(database.prepare('SELECT COUNT(*) AS count FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.amount_cents != o.total_cents').get().count).toBe(0);
  });

  it('is byte-for-byte deterministic and contains distinct ranking patterns', () => {
    expect(createSeedData()).toEqual(createSeedData());
    const data = createSeedData();
    const revenue = data.orders.reduce((map, order) => map.set(order.customer_id, (map.get(order.customer_id) || 0) + order.total_cents), new Map());
    const counts = data.orders.reduce((map, order) => map.set(order.customer_id, (map.get(order.customer_id) || 0) + 1), new Map());
    expect([...revenue.entries()].sort((a, b) => b[1] - a[1])[0][0]).not.toBe([...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]);
    expect(data.orders.some(({ customer_id, ordered_at }) => customer_id === 3 && ordered_at.startsWith('2026-03'))).toBe(true);
    expect(new Set(data.customers.map(({ country }) => country)).size).toBeGreaterThan(4);
    expect(new Set(data.orders.map(({ status }) => status)).size).toBeGreaterThan(4);
  });

  it('enforces foreign-key relationships', () => {
    database = createDatabase();
    expect(() => database.prepare('INSERT INTO orders (id, customer_id, status, subtotal_cents, total_cents, ordered_at) VALUES (9, 999, \'pending\', 0, 0, \'2025-01-01\')').run()).toThrow();
    seedDatabase(database);
    expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(database.prepare('SELECT COUNT(*) AS count FROM order_items WHERE order_id NOT IN (SELECT id FROM orders) OR product_id NOT IN (SELECT id FROM products)').get().count).toBe(0);
    expect(database.prepare('SELECT COUNT(*) AS count FROM payments WHERE order_id NOT IN (SELECT id FROM orders)').get().count).toBe(0);
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

describe('database explorer', () => {
  it('returns bounded rows and metadata only for a known table', () => {
    database = createDatabase();
    seedDatabase(database);
    const explorer = getExplorerData(database, 'customers');
    expect(explorer.table.name).toBe('customers');
    expect(explorer.columns).toContain('email');
    expect(explorer.rows).toHaveLength(50);
    expect(explorer.limit).toBe(50);
    expect(explorer.tables).toContainEqual({ name: 'orders', rowCount: 300 });
  });

  it('rejects unknown identifiers and never mutates data', () => {
    database = createDatabase();
    seedDatabase(database);
    const before = database.prepare('SELECT COUNT(*) AS count FROM customers').get().count;
    expect(() => getExplorerData(database, 'customers; DROP TABLE customers')).toThrow('Unknown table');
    expect(() => getExplorerData(database, 'customers WHERE 1=1')).toThrow('Unknown table');
    expect(database.prepare('SELECT COUNT(*) AS count FROM customers').get().count).toBe(before);
  });
});
