import { getDatabase } from '../db/index.js';
import { validateSql } from './validator.js';

/** Hard upper bound for rows returned by one query execution. */
export const MAX_RESULT_ROWS = 100;

function failure(reason, message, validation) {
  return { success: false, reason, message, columns: [], rows: [], rowCount: 0, ...(validation ? { validation } : {}) };
}

function isSafeParameter(value) {
  return value === null || typeof value === 'string' || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value));
}

function jsonSafe(value) {
  if (typeof value === 'bigint') return Number(value);
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  return value;
}

/**
 * Execute one validated, schema-bound SELECT against the seeded SQLite DB.
 * Validation is repeated here so direct callers cannot bypass the final
 * security gate. Errors are generic and never expose paths or stack traces.
 */
export function executeSql(sqlOrInput, parametersOrSchema = [], schemaOrOptions, executionOptions = {}) {
  const input = sqlOrInput && typeof sqlOrInput === 'object' ? sqlOrInput : null;
  const sql = input ? input.sql : sqlOrInput;
  const parameters = input ? input.parameters : parametersOrSchema;
  const schema = input ? input.schema : schemaOrOptions;
  const databaseFactory = input?.databaseFactory || executionOptions.databaseFactory || getDatabase;

  const validation = validateSql(sql, schema);
  if (!validation.valid) return failure('sql_validation_failed', validation.error, validation);
  if (!Array.isArray(parameters) || !parameters.every(isSafeParameter)) {
    const parameterValidation = { valid: false, error: 'SQL parameters are invalid.' };
    return failure('sql_validation_failed', parameterValidation.error, parameterValidation);
  }

  let database;
  try {
    database = databaseFactory();
    const statement = database.prepare(sql);
    const rows = statement.all(...parameters).slice(0, MAX_RESULT_ROWS).map(jsonSafe);
    const columns = statement.columns().map(({ name }) => name);
    return { success: true, columns, rows, rowCount: rows.length };
  } catch (_error) {
    return failure('execution_error', 'The query could not be executed.');
  } finally {
    database?.close();
  }
}

export const executeQuery = executeSql;
