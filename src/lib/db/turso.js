import { createClient } from '@libsql/client';
import fs from 'node:fs';
import { seedData } from './seed.js';

let cachedClient = null;
let initPromise = null;
let isInitialized = false;

/**
 * Creates or returns the cached libSQL / Turso client.
 * Server-side only; credentials are never exposed to the client.
 */
export function getTursoClient({
  url = process.env.TURSO_DATABASE_URL,
  authToken = process.env.TURSO_AUTH_TOKEN,
} = {}) {
  if (!url) {
    throw new Error('TURSO_DATABASE_URL environment variable is required.');
  }

  if (cachedClient && cachedClient._url === url && cachedClient._authToken === authToken) {
    return cachedClient;
  }

  const client = createClient({ url, authToken });
  client._url = url;
  client._authToken = authToken;
  cachedClient = client;
  return client;
}

/**
 * Safely initialize schema and seed data in Turso / libSQL.
 * Idempotent: checks for existing tables and data, using INSERT OR IGNORE.
 * Never duplicates data on subsequent invocations.
 */
export async function initTursoDatabase(client, { force = false } = {}) {
  if (isInitialized && !force) return client;
  if (initPromise && !force) return initPromise;

  initPromise = (async () => {
    // 1. Check if tables exist
    const tableCheck = await client.execute(
      "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'customers'"
    );
    const tablesExist = (tableCheck.rows[0]?.count ?? 0) > 0;

    if (!tablesExist || force) {
      const schemaSql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
      const statements = schemaSql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const statement of statements) {
        if (/^PRAGMA\s+/i.test(statement)) continue;
        await client.execute(statement);
      }
    }

    // 2. Check if seeded data exists
    const customerCheck = await client.execute('SELECT count(*) AS count FROM customers');
    const hasData = (customerCheck.rows[0]?.count ?? 0) > 0;

    if (!hasData || force) {
      for (const [table, rows] of Object.entries(seedData)) {
        if (!rows.length) continue;
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

        const batch = rows.map((row) => ({
          sql,
          args: columns.map((col) => row[col] ?? null),
        }));

        await client.batch(batch, 'write');
      }
    }

    isInitialized = true;
    return client;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

/**
 * Introspect all user tables in a Turso / libSQL database.
 * Matches the structure returned by introspectDatabase for SQLite.
 */
export async function introspectTurso(client) {
  await initTursoDatabase(client);

  const tablesResult = await client.execute(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' ORDER BY name"
  );

  const tables = [];
  for (const { name, sql } of tablesResult.rows) {
    const escapedName = String(name).replace(/'/g, "''");
    const columnsResult = await client.execute(`SELECT * FROM pragma_table_info('${escapedName}')`);
    const columns = columnsResult.rows.map((column) => ({
      name: String(column.name),
      type: column.type ? String(column.type) : null,
      notNull: Boolean(column.notnull),
      defaultValue: column.dflt_value ?? null,
      primaryKey: Number(column.pk) > 0,
      primaryKeyPosition: Number(column.pk) || null,
    }));

    const fkResult = await client.execute(`SELECT * FROM pragma_foreign_key_list('${escapedName}')`);
    const foreignKeys = [...fkResult.rows]
      .sort((a, b) => Number(a.id) - Number(b.id) || Number(a.seq) - Number(b.seq))
      .map((fk) => ({
        id: Number(fk.id),
        sequence: Number(fk.seq),
        column: String(fk.from),
        referencedTable: String(fk.table),
        referencedColumn: String(fk.to),
        onUpdate: String(fk.on_update || 'NO ACTION'),
        onDelete: String(fk.on_delete || 'NO ACTION'),
      }));

    tables.push({
      name: String(name),
      sql: String(sql),
      columns,
      primaryKeys: columns
        .filter((c) => c.primaryKey)
        .sort((a, b) => (a.primaryKeyPosition || 0) - (b.primaryKeyPosition || 0))
        .map((c) => c.name),
      foreignKeys,
    });
  }

  const relationships = tables.flatMap((table) =>
    table.foreignKeys.map((fk) => ({
      fromTable: table.name,
      fromColumn: fk.column,
      toTable: fk.referencedTable,
      toColumn: fk.referencedColumn,
    }))
  );

  return { tables, relationships };
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function jsonSafe(value) {
  if (typeof value === 'bigint') return Number(value);
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, jsonSafe(v)]));
  }
  return value;
}

const MAX_EXPLORER_ROWS = 50;

/**
 * Returns read-only database explorer data for Turso.
 */
export async function getTursoExplorerData(client, requestedTable = null) {
  await initTursoDatabase(client);
  const schema = await introspectTurso(client);

  const tables = [];
  for (const table of schema.tables) {
    const countResult = await client.execute(
      `SELECT COUNT(*) AS count FROM ${quoteIdentifier(table.name)}`
    );
    tables.push({
      name: table.name,
      rowCount: Number(countResult.rows[0]?.count ?? 0),
    });
  }

  if (!requestedTable) return { tables };

  const table = schema.tables.find(({ name }) => name === requestedTable);
  if (!table) {
    const error = new Error('Unknown table');
    error.code = 'UNKNOWN_TABLE';
    throw error;
  }

  const columns = table.columns.map((c) => c.name);
  const selectList = columns.map(quoteIdentifier).join(', ');
  const rowsResult = await client.execute(
    `SELECT ${selectList} FROM ${quoteIdentifier(table.name)} LIMIT ${MAX_EXPLORER_ROWS}`
  );

  const rows = rowsResult.rows.map(jsonSafe);
  const matchedTable = tables.find(({ name }) => name === table.name);

  return {
    tables,
    table: { ...table, rowCount: matchedTable?.rowCount ?? rows.length },
    columns,
    rows,
    rowCount: rows.length,
    limit: MAX_EXPLORER_ROWS,
  };
}

/**
 * Executes a validated SQL SELECT statement against Turso / libSQL.
 */
export async function executeTursoSql(client, sql, parameters = [], { maxRows = 100 } = {}) {
  await initTursoDatabase(client);
  const result = await client.execute({ sql, args: parameters });
  const rows = result.rows.slice(0, maxRows).map(jsonSafe);
  const columns = Array.isArray(result.columns) ? result.columns : Object.keys(rows[0] || {});
  return {
    success: true,
    columns,
    rows,
    rowCount: rows.length,
  };
}
