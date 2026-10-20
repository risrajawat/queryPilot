import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { seedData } from './seed.js';

dotenv.config();

const rootDir = process.cwd();
export const defaultDbPath = path.resolve(rootDir, process.env.DB_PATH || 'data/querypilot.sqlite');

export function createDatabase(filename = ':memory:') {
  const database = new Database(filename);
  database.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  database.exec(schema);
  return database;
}

export function seedDatabase(database) {
  const insert = database.transaction(() => {
    const statements = {
      categories: database.prepare('INSERT OR IGNORE INTO categories (id, name, slug) VALUES (@id, @name, @slug)'),
      customers: database.prepare('INSERT OR IGNORE INTO customers (id, email, first_name, last_name, phone, city, country) VALUES (@id, @email, @first_name, @last_name, @phone, @city, @country)'),
      products: database.prepare('INSERT OR IGNORE INTO products (id, category_id, sku, name, description, price_cents, stock_quantity) VALUES (@id, @category_id, @sku, @name, @description, @price_cents, @stock_quantity)'),
      orders: database.prepare('INSERT OR IGNORE INTO orders (id, customer_id, status, subtotal_cents, tax_cents, shipping_cents, total_cents, ordered_at, shipped_at) VALUES (@id, @customer_id, @status, @subtotal_cents, @tax_cents, @shipping_cents, @total_cents, @ordered_at, @shipped_at)'),
      order_items: database.prepare('INSERT OR IGNORE INTO order_items (id, order_id, product_id, quantity, unit_price_cents) VALUES (@id, @order_id, @product_id, @quantity, @unit_price_cents)'),
      payments: database.prepare('INSERT OR IGNORE INTO payments (id, order_id, provider, provider_reference, amount_cents, status, paid_at) VALUES (@id, @order_id, @provider, @provider_reference, @amount_cents, @status, @paid_at)'),
    };
    for (const [table, rows] of Object.entries(seedData)) rows.forEach((row) => statements[table].run(row));
  });
  insert();
  return database;
}

export function isServerlessEnvironment() {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (process.env.NODE_ENV === 'production' && !process.env.IS_LOCAL)
  );
}

export function getDatabase(filename = defaultDbPath, { seed = true } = {}) {
  if (filename !== ':memory:') {
    if (isServerlessEnvironment()) {
      const error = new Error(
        'Cannot create local SQLite database in serverless production environment (/var/task). Please configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.'
      );
      error.code = 'SERVERLESS_FS_ERROR';
      throw error;
    }
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const database = createDatabase(filename);
  if (seed) seedDatabase(database);
  return database;
}

export { getDatabaseAdapter, isTursoConfigured } from './adapter.js';
