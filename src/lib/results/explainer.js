import { getProvider } from '../ai/provider.js';

export const MAX_EXPLANATION_ROWS = 20;

const SYSTEM_INSTRUCTION = `You are explaining a verified database result to the user.
Use ONLY the supplied question, intent, columns, and rows.
Do not invent information or claim facts unsupported by the supplied result.
Mention important values when useful. If there are no rows, say that no matching results were found.
If the result contains ranking data, summarize the ranking. If it contains a single aggregate value, explain it directly.
Keep the answer concise and useful.`;

function valueText(value) {
  return value === null || value === undefined ? 'null' : String(value);
}

function deterministicExplanation(input) {
  const { columns, rows, rowCount } = input;
  if (rowCount === 0) return 'No results found for this query.';
  if (!rows.length) return `The query returned ${rowCount} result${rowCount === 1 ? '' : 's'}.`;

  const nameColumns = ['first_name', 'last_name', 'name', 'customer_name', 'product_name'];
  const metricColumns = ['total_revenue', 'order_count', 'last_purchase', 'total_cents', 'stock_quantity'];
  const nameColumn = nameColumns.find((column) => columns.includes(column));
  const first = rows[0];
  const metricColumn = metricColumns.find((column) => columns.includes(column));
  if (nameColumn && metricColumn) {
    const label = nameColumn === 'first_name' && columns.includes('last_name')
      ? `${valueText(first.first_name)} ${valueText(first.last_name)}`
      : valueText(first[nameColumn]);
    const phrases = {
      total_revenue: 'revenue',
      order_count: 'orders',
      last_purchase: 'last purchase',
      total_cents: 'total',
      stock_quantity: 'stock',
    };
    const more = rows.length > 1 ? `, followed by ${rows.slice(1, 3).map((row) => `${valueText(row[nameColumn])} with ${valueText(row[metricColumn])}`).join(' and ')}` : '';
    return `Here are the top results. ${label} leads with ${valueText(first[metricColumn])} in ${phrases[metricColumn] || metricColumn}${more}.`;
  }
  if (rows.length === 1 && columns.length === 1) return `The result is ${valueText(first[columns[0]])}.`;
  return `The query returned ${rowCount} result${rowCount === 1 ? '' : 's'}.`;
}

export async function explainVerifiedResult(input, { provider = getProvider() } = {}) {
  if (!input || !Array.isArray(input.columns) || !Array.isArray(input.rows) || !Number.isInteger(input.rowCount)) {
    return { success: false, reason: 'invalid_result', message: 'Verified result data is incomplete.' };
  }
  if (input.rowCount === 0) return { success: true, explanation: 'No results found for this query.' };

  const limitedRows = input.rows.slice(0, MAX_EXPLANATION_ROWS);
  const payload = {
    question: String(input.question || '').slice(0, 1000),
    intent: input.intent || {},
    columns: input.columns,
    rows: limitedRows,
    rowCount: input.rowCount,
    sampleLimited: input.rowCount > limitedRows.length,
  };
  try {
    if (typeof provider.explainResult === 'function') {
      const explanation = await provider.explainResult({ system: SYSTEM_INSTRUCTION, ...payload });
      if (typeof explanation === 'string' && explanation.trim()) return { success: true, explanation: explanation.trim() };
    }
    return { success: true, explanation: deterministicExplanation(payload) };
  } catch (_error) {
    return { success: false, reason: 'explanation_unavailable', message: 'The query executed successfully, but an explanation could not be generated.' };
  }
}

export { SYSTEM_INSTRUCTION };
