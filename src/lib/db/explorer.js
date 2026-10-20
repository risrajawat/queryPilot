import { introspectDatabase } from './schema-introspection.js';

const MAX_ROWS = 50;

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

export function getExplorerData(database, requestedTable = null) {
  const schema = introspectDatabase(database);
  const tables = schema.tables.map((table) => ({
    name: table.name,
    rowCount: database.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table.name)}`).get().count,
  }));

  if (!requestedTable) return { tables };
  const table = schema.tables.find(({ name }) => name === requestedTable);
  if (!table) {
    const error = new Error('Unknown table');
    error.code = 'UNKNOWN_TABLE';
    throw error;
  }

  const columns = table.columns.map((column) => column.name);
  const selectList = columns.map(quoteIdentifier).join(', ');
  const rows = database.prepare(`SELECT ${selectList} FROM ${quoteIdentifier(table.name)} LIMIT ${MAX_ROWS}`).all();
  return {
    tables,
    table: { ...table, rowCount: tables.find(({ name }) => name === table.name).rowCount },
    columns,
    rows,
    rowCount: rows.length,
    limit: MAX_ROWS,
  };
}

export { MAX_ROWS };
