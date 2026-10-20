/** Deterministic, schema-bound SQL generation for the supported Phase 3 intents. */

function schemaTables(schema) {
  if (schema && Array.isArray(schema.tables)) return schema.tables.map((table) => ({ name: table.name, columns: (table.columns || []).map((column) => typeof column === 'string' ? column : column.name) }));
  const text = typeof schema === 'string' ? schema : schema?.compact;
  if (!text) return [];
  const tables = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const table = line.match(/^TABLE\s+([\w]+)\s*$/i);
    if (table) { current = { name: table[1], columns: [] }; tables.push(current); continue; }
    if (/^RELATIONSHIPS\s*$/i.test(line)) { current = null; continue; }
    const column = line.match(/^\s*-\s*([\w]+)(?:\s|$)/);
    if (column && current) current.columns.push(column[1]);
  }
  return tables;
}

function quote(name) { return `"${String(name).replaceAll('"', '""')}"`; }
function findTable(tables, names) { return tables.find((table) => names.includes(table.name.toLowerCase())); }
function findColumn(table, names) { return table?.columns.find((column) => names.includes(column.toLowerCase())); }
function required(tables, tableNames, columnNames) {
  const table = findTable(tables, tableNames);
  if (!table) return null;
  const columns = Object.fromEntries(Object.entries(columnNames).map(([key, names]) => [key, findColumn(table, names)]));
  return Object.values(columns).every(Boolean) ? { table, columns } : null;
}
function unsupported(reason = 'The requested intent cannot be represented by the provided schema.') {
  return { success: false, unsupported_intent: true, sql: null, parameters: [], explanation: reason };
}

function filters(context, table, alias) {
  const values = context?.filters && typeof context.filters === 'object' ? context.filters : context || {};
  const clauses = [];
  const parameters = [];
  const candidates = [
    ['customer_id', ['customer_id', 'customerId']], ['status', ['status']], ['category_id', ['category_id', 'categoryId']],
  ];
  for (const [key, keys] of candidates) {
    const column = findColumn(table, [key]);
    const value = keys.map((item) => values[item]).find((item) => item !== undefined && item !== null && item !== '');
    if (column && value !== undefined) { clauses.push(`${alias}.${quote(column)} = ?`); parameters.push(value); }
  }
  return { clauses, parameters };
}

export function generateSql(intent, compactSchema, conversationContext = {}) {
  const tables = schemaTables(compactSchema);
  const name = intent?.name;
  if (!name || intent?.ambiguous || intent?.status === 'ambiguous') return unsupported('A clarification is required before SQL can be generated.');

  if (name === 'customer_list') {
    const customer = findTable(tables, ['customers', 'customer']);
    const id = findColumn(customer, ['id']);
    if (!customer || !id) return unsupported('The schema does not contain a usable customer table.');
    const selected = ['first_name', 'last_name', 'email'].map((key) => findColumn(customer, [key])).filter(Boolean);
    const columns = [id, ...selected];
    const where = filters(conversationContext, customer, 'c');
    const country = conversationContext?.filters?.country ?? conversationContext?.country;
    const countryColumn = findColumn(customer, ['country']);
    if (countryColumn && country !== undefined && country !== null && country !== '') {
      where.clauses.push(`c.${quote(countryColumn)} = ?`);
      where.parameters.push(country);
    }
    return { success: true, sql: `SELECT ${columns.map((column) => `c.${quote(column)}`).join(', ')} FROM ${quote(customer.name)} c${where.clauses.length ? ` WHERE ${where.clauses.join(' AND ')}` : ''} ORDER BY c.${quote(id)}`, parameters: where.parameters, explanation: 'Lists customers using only columns present in the provided schema.' };
  }

  if (name === 'order_summary') {
    const order = required(tables, ['orders', 'order'], { id: ['id'], customer: ['customer_id'], status: ['status'], total: ['total_cents', 'total'], date: ['ordered_at', 'created_at'] });
    if (!order) return unsupported('The schema does not contain the columns required for an order summary.');
    const c = order.columns;
     const where = filters(conversationContext, order.table, 'o');
    return { success: true, sql: `SELECT o.${quote(c.id)} AS order_id, o.${quote(c.customer)} AS customer_id, o.${quote(c.status)} AS status, o.${quote(c.total)} AS total_cents, o.${quote(c.date)} AS ordered_at FROM ${quote(order.table.name)} o${where.clauses.length ? ` WHERE ${where.clauses.join(' AND ')}` : ''} ORDER BY o.${quote(c.date)} DESC`, parameters: where.parameters, explanation: 'Summarizes orders using schema-backed order fields.' };
  }

  if (name === 'product_inventory') {
    const product = required(tables, ['products', 'product'], { id: ['id'], name: ['name'], stock: ['stock_quantity', 'stock', 'quantity'] });
    if (!product) return unsupported('The schema does not contain the columns required for product inventory.');
    const c = product.columns;
    const sku = findColumn(product.table, ['sku']);
    const where = filters(conversationContext, product.table, 'p');
    const columns = [c.id, ...(sku ? [sku] : []), c.name, c.stock];
    return { success: true, sql: `SELECT ${columns.map((column) => `p.${quote(column)}`).join(', ')} FROM ${quote(product.table.name)} p${where.clauses.length ? ` WHERE ${where.clauses.join(' AND ')}` : ''} ORDER BY p.${quote(c.stock)} ASC`, parameters: where.parameters, explanation: 'Lists inventory quantities from the provided product schema.' };
  }

  if (name === 'customer_ranking') {
    const customer = required(tables, ['customers', 'customer'], { id: ['id'], first: ['first_name'], last: ['last_name'] });
    const order = required(tables, ['orders', 'order'], { customer: ['customer_id'], id: ['id'], total: ['total_cents', 'total'], date: ['ordered_at', 'created_at'] });
    const metric = intent.metric || conversationContext.metric;
    if (!customer || !order || !['total_revenue', 'order_count', 'last_purchase'].includes(metric)) return unsupported('The schema or ranking metric is not supported.');
    const aggregate = metric === 'total_revenue' ? `SUM(o.${quote(order.columns.total)})` : metric === 'order_count' ? `COUNT(o.${quote(order.columns.id)})` : `MAX(o.${quote(order.columns.date)})`;
    const label = metric === 'total_revenue' ? 'total_revenue' : metric === 'order_count' ? 'order_count' : 'last_purchase';
     const where = filters(conversationContext, order.table, 'o');
     const completedStatus = findColumn(order.table, ['status']) ? `o.${quote(findColumn(order.table, ['status']))} = 'delivered'` : null;
     if (completedStatus) where.clauses.push(completedStatus);
    return { success: true, sql: `SELECT c.${quote(customer.columns.id)} AS customer_id, c.${quote(customer.columns.first)} AS first_name, c.${quote(customer.columns.last)} AS last_name, ${aggregate} AS ${label} FROM ${quote(customer.table.name)} c JOIN ${quote(order.table.name)} o ON o.${quote(order.columns.customer)} = c.${quote(customer.columns.id)}${where.clauses.length ? ` WHERE ${where.clauses.join(' AND ')}` : ''} GROUP BY c.${quote(customer.columns.id)}, c.${quote(customer.columns.first)}, c.${quote(customer.columns.last)} ORDER BY ${label} DESC`, parameters: where.parameters, explanation: `Ranks customers by ${metric.replaceAll('_', ' ')} using the provided schema.` };
  }
  return unsupported(`Intent "${name || 'unknown'}" is not supported.`);
}

export const generateSQL = generateSql;
