import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, seedDatabase } from '../src/lib/db/index.js';

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
    expect(database.prepare('SELECT COUNT(*) AS count FROM customers').get().count).toBe(4);
    expect(database.prepare('SELECT COUNT(*) AS count FROM orders').get().count).toBe(5);
    expect(database.prepare('SELECT COUNT(*) AS count FROM payments').get().count).toBe(5);
    const total = database.prepare('SELECT total_cents FROM orders WHERE id = 1001').get().total_cents;
    const itemTotal = database.prepare('SELECT SUM(quantity * unit_price_cents) AS total FROM order_items WHERE order_id = 1001').get().total;
    expect(itemTotal).toBe(17998);
    expect(total).toBe(19618);
  });

  it('enforces foreign-key relationships', () => {
    database = createDatabase();
    expect(() => database.prepare('INSERT INTO orders (id, customer_id, status, subtotal_cents, total_cents, ordered_at) VALUES (9, 999, \'pending\', 0, 0, \'2025-01-01\')').run()).toThrow();
  });
});
