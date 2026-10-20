function tablesFromSchema(schema) {
  if (schema && Array.isArray(schema.tables)) return schema.tables.map((table) => ({ name: table.name, columns: (table.columns || []).map((column) => typeof column === 'string' ? column : column.name) }));
  const text = typeof schema === 'string' ? schema : schema?.compact;
  const result = []; let current;
  for (const line of String(text || '').split(/\r?\n/)) {
    const table = line.match(/^TABLE\s+([\w]+)\s*$/i);
    if (table) { current = { name: table[1], columns: [] }; result.push(current); continue; }
    if (/^RELATIONSHIPS\s*$/i.test(line)) { current = null; continue; }
    const column = line.match(/^\s*-\s*([\w]+)(?:\s|$)/);
    if (column && current) current.columns.push(column[1]);
  }
  return result;
}
const keywords = new Set('SELECT FROM JOIN LEFT RIGHT INNER OUTER ON WHERE GROUP BY ORDER HAVING LIMIT OFFSET AS ASC DESC AND OR NOT NULL IS IN LIKE BETWEEN CASE WHEN THEN ELSE END DISTINCT ALL UNION INTERSECT EXCEPT COLLATE EXISTS TRUE FALSE'.split(' '));
const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE|ATTACH|DETACH|PRAGMA|VACUUM|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b/i;
function unquote(value) { return value.replace(/^"|"$/g, '').replaceAll('""', '"'); }
function invalid(reason) { return { valid: false, error: reason }; }

export function validateSql(sql, schema) {
  if (typeof sql !== 'string' || !sql.trim()) return invalid('SQL is empty.');
  if (/--|\/\*/.test(sql)) return invalid('SQL comments are not allowed.');
  const stripped = sql.trim().replace(/;\s*$/, '');
  if (stripped.includes(';')) return invalid('Multiple SQL statements are not allowed.');
  if (!/^SELECT\b/i.test(stripped)) return invalid('Only SELECT statements are allowed.');
  if (forbidden.test(stripped)) return invalid('The SQL statement contains a forbidden operation.');
  const tables = tablesFromSchema(schema);
  const tableMap = new Map(tables.map((table) => [table.name.toLowerCase(), table]));
  const aliases = new Map();
  const tablePattern = /\b(?:FROM|JOIN)\s+("(?:[^"]|"")+"|[A-Za-z_]\w*)(?:\s+(?:AS\s+)?("(?:[^"]|"")+"|[A-Za-z_]\w*))?/gi;
  let match;
  while ((match = tablePattern.exec(stripped))) {
    const tableName = unquote(match[1]); const table = tableMap.get(tableName.toLowerCase());
    if (!table) return invalid(`Unknown table: ${tableName}`);
    aliases.set(tableName.toLowerCase(), table);
    if (match[2] && !keywords.has(unquote(match[2]).toUpperCase())) aliases.set(unquote(match[2]).toLowerCase(), table);
  }
  if (!aliases.size) return invalid('A SELECT must reference a known table.');
  const knownColumns = new Set([...aliases.values()].flatMap((table) => table.columns.map((column) => column.toLowerCase())));
  const qualified = /("(?:[^"]|"")+"|[A-Za-z_]\w*)\s*\.\s*("(?:[^"]|"")+"|[A-Za-z_]\w*)/g;
  while ((match = qualified.exec(stripped))) {
    const table = aliases.get(unquote(match[1]).toLowerCase());
    if (!table) return invalid(`Unknown table or alias: ${unquote(match[1])}`);
    const column = unquote(match[2]); if (column !== '*' && !table.columns.some((item) => item.toLowerCase() === column.toLowerCase())) return invalid(`Unknown column: ${column}`);
  }
  const withoutStrings = stripped.replace(/'(?:''|[^'])*'/g, ' ');
  const identifiers = withoutStrings.match(/"(?:[^"]|"")+"|[A-Za-z_]\w*/g) || [];
  const aliasNames = new Set(aliases.keys());
  const outputAliases = new Set([...withoutStrings.matchAll(/\bAS\s+("(?:[^"]|"")+"|[A-Za-z_]\w*)/gi)].map((item) => unquote(item[1]).toLowerCase()));
  for (const token of identifiers) {
    const value = unquote(token); const lower = value.toLowerCase();
    if (keywords.has(value.toUpperCase()) || aliasNames.has(lower) || outputAliases.has(lower) || /^\d+$/.test(value) || /^(count|sum|max|min|avg|coalesce|date|datetime)$/i.test(value)) continue;
    if (stripped.slice(stripped.indexOf(token) - 1, stripped.indexOf(token)).trim() === '.') continue;
    if (!knownColumns.has(lower)) return invalid(`Unknown identifier: ${value}`);
  }
  return { valid: true, error: null };
}

export const validateSQL = validateSql;
