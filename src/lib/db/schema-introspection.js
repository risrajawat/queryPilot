/**
 * Read SQLite's catalog without selecting any application rows.
 * The returned structure is deliberately plain data so it can be passed to
 * an API or serialized for a downstream schema consumer.
 */

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function tableInfo(database, tableName) {
  return database.pragma(`table_info(${quoteIdentifier(tableName)})`);
}

function foreignKeyInfo(database, tableName) {
  return database.pragma(`foreign_key_list(${quoteIdentifier(tableName)})`);
}

/**
 * Introspect all user tables in a SQLite database.
 *
 * Only sqlite_master and PRAGMA metadata are read; no table rows are queried.
 */
export function introspectDatabase(database) {
  const tables = database
    .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map(({ name, sql }) => {
      const columns = tableInfo(database, name).map((column) => ({
        name: column.name,
        type: column.type || null,
        notNull: Boolean(column.notnull),
        defaultValue: column.dflt_value,
        primaryKey: column.pk > 0,
        primaryKeyPosition: column.pk || null,
      }));

      const foreignKeys = foreignKeyInfo(database, name)
        .sort((left, right) => (left.id - right.id) || (left.seq - right.seq))
        .map((foreignKey) => ({
          id: foreignKey.id,
          sequence: foreignKey.seq,
          column: foreignKey.from,
          referencedTable: foreignKey.table,
          referencedColumn: foreignKey.to,
          onUpdate: foreignKey.on_update,
          onDelete: foreignKey.on_delete,
        }));

      return {
        name,
        sql,
        columns,
        primaryKeys: columns.filter((column) => column.primaryKey).sort((left, right) => left.primaryKeyPosition - right.primaryKeyPosition).map((column) => column.name),
        foreignKeys,
      };
    });

  const relationships = tables.flatMap((table) => table.foreignKeys.map((foreignKey) => ({
    fromTable: table.name,
    fromColumn: foreignKey.column,
    toTable: foreignKey.referencedTable,
    toColumn: foreignKey.referencedColumn,
  })));

  return { tables, relationships };
}

/**
 * Produce a compact, row-free schema description for an LLM prompt.
 */
export function compactSchema(schema) {
  const tableLines = schema.tables.map((table) => {
    const columns = table.columns.map((column) => {
      const attributes = [];
      if (column.primaryKey) attributes.push('PK');
      if (column.notNull) attributes.push('NOT NULL');
      return `  - ${column.name} ${column.type || 'ANY'}${attributes.length ? ` (${attributes.join(', ')})` : ''}`;
    });
    return [`TABLE ${table.name}`, ...columns].join('\n');
  });

  const relationshipLines = schema.relationships.map((relationship) =>
    `- ${relationship.fromTable}.${relationship.fromColumn} -> ${relationship.toTable}.${relationship.toColumn}`,
  );

  return [
    ...tableLines,
    relationshipLines.length ? `RELATIONSHIPS\n${relationshipLines.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}

export function getDatabaseSchema(database) {
  const schema = introspectDatabase(database);
  return { ...schema, compact: compactSchema(schema) };
}
