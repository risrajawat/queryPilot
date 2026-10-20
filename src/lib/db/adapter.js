import { getDatabase, createDatabase } from './index.js';
import { getExplorerData as getSqliteExplorerData } from './explorer.js';
import { getDatabaseSchema, compactSchema } from './schema-introspection.js';
import {
  getTursoClient,
  initTursoDatabase,
  introspectTurso,
  getTursoExplorerData,
  executeTursoSql,
} from './turso.js';

export function isTursoConfigured() {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

export function isServerlessEnvironment() {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (process.env.NODE_ENV === 'production' && !process.env.IS_LOCAL)
  );
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

export class SqliteAdapter {
  constructor(options = {}) {
    this.options = options;
    this.provider = 'sqlite';
    this.isAsync = false;
  }

  _getDb() {
    if (this.options.database) return this.options.database;
    if (this.options.databaseFactory) return this.options.databaseFactory();
    return getDatabase();
  }

  checkHealth() {
    let database;
    try {
      database = this._getDb();
      const row = database.prepare('SELECT 1 AS ok').get();
      return { ok: row?.ok === 1, provider: 'sqlite' };
    } finally {
      if (!this.options.database) database?.close();
    }
  }

  getSchema() {
    let database;
    try {
      database = this.options.database || (this.options.databaseFactory ? this.options.databaseFactory() : getDatabase(undefined, { seed: false }));
      return getDatabaseSchema(database);
    } finally {
      if (!this.options.database) database?.close();
    }
  }

  getExplorerData(tableName = null) {
    let database;
    try {
      database = this._getDb();
      return getSqliteExplorerData(database, tableName);
    } finally {
      if (!this.options.database) database?.close();
    }
  }

  execute(sql, parameters = [], { maxRows = 100 } = {}) {
    let database;
    try {
      database = this._getDb();
      const statement = database.prepare(sql);
      const rows = statement.all(...parameters).slice(0, maxRows).map(jsonSafe);
      const columns = statement.columns().map(({ name }) => name);
      return {
        success: true,
        columns,
        rows,
        rowCount: rows.length,
      };
    } finally {
      if (!this.options.database) database?.close();
    }
  }

  close() {
    // No-op for ad-hoc connections
  }
}

export class TursoAdapter {
  constructor(options = {}) {
    this.options = options;
    this.provider = 'turso';
    this.isAsync = true;
    this._client = options.client || null;
  }

  _getClient() {
    if (this._client) return this._client;
    this._client = getTursoClient(this.options);
    return this._client;
  }

  async checkHealth() {
    const client = this._getClient();
    await initTursoDatabase(client);
    const result = await client.execute('SELECT 1 AS ok');
    const ok = result.rows[0]?.ok === 1 || result.rows[0]?.[0] === 1;
    return { ok: Boolean(ok), provider: 'turso' };
  }

  async getSchema() {
    const client = this._getClient();
    const schema = await introspectTurso(client);
    return { ...schema, compact: compactSchema(schema) };
  }

  async getExplorerData(tableName = null) {
    const client = this._getClient();
    return await getTursoExplorerData(client, tableName);
  }

  async execute(sql, parameters = [], { maxRows = 100 } = {}) {
    const client = this._getClient();
    return await executeTursoSql(client, sql, parameters, { maxRows });
  }

  async close() {
    if (this._client?.close) {
      await this._client.close();
    }
  }
}

class UnconfiguredServerlessAdapter {
  constructor() {
    this.provider = 'unconfigured';
    this.isAsync = false;
  }

  _throw() {
    const error = new Error(
      'Database not configured: In production/Vercel serverless environments, TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured. Local filesystem database storage (/var/task) cannot be used.'
    );
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }

  checkHealth() {
    return {
      ok: false,
      provider: 'unconfigured',
      error: 'TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured in Vercel environment variables.',
    };
  }

  getSchema() {
    this._throw();
  }

  getExplorerData() {
    this._throw();
  }

  execute() {
    this._throw();
  }

  close() {}
}

/**
 * Returns the appropriate database adapter for the current environment.
 * Local development: SqliteAdapter (better-sqlite3)
 * Production/Vercel: TursoAdapter (libSQL)
 */
export function getDatabaseAdapter(options = {}) {
  if (isTursoConfigured()) {
    return new TursoAdapter(options);
  }

  if (isServerlessEnvironment() && !options.allowLocal) {
    return new UnconfiguredServerlessAdapter();
  }

  return new SqliteAdapter(options);
}
