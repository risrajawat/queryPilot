const bestCustomer = /\bbest customers?\b/i;

export function analyzeIntent(message, context = {}) {
  const text = String(message || '').trim();
  const normalized = text.toLowerCase();
  if (bestCustomer.test(text)) {
    return { status: 'ambiguous', name: 'customer_ranking', subject: 'customers', metric: null, confidence: 0.45, ambiguous: true, ambiguities: ['ranking_metric'], clarificationQuestion: null, schemaAvailable: Boolean(context.schema) };
  }
  if (/highest\s+(?:total\s+)?revenue|most\s+revenue|highest[- ]revenue/i.test(text)) {
    return { status: 'clear', name: 'customer_ranking', subject: 'customers', metric: 'total_revenue', confidence: 0.99, ambiguous: false, ambiguities: [], clarificationQuestion: null, schemaAvailable: Boolean(context.schema) };
  }
  if (/most\s+orders|most frequent|frequent buyers/i.test(text)) {
    return { status: 'clear', name: 'customer_ranking', subject: 'customers', metric: 'order_count', confidence: 0.99, ambiguous: false, ambiguities: [], clarificationQuestion: null, schemaAvailable: Boolean(context.schema) };
  }
  if (/most recent purchases?|recently purchased|latest purchases?/i.test(text)) {
    return { status: 'clear', name: 'customer_ranking', subject: 'customers', metric: 'last_purchase', confidence: 0.99, ambiguous: false, ambiguities: [], clarificationQuestion: null, schemaAvailable: Boolean(context.schema) };
  }
  if (/customers?/i.test(normalized)) return { status: 'clear', name: 'customer_list', subject: 'customers', confidence: 0.9, ambiguous: false, ambiguities: [], clarificationQuestion: null, schemaAvailable: Boolean(context.schema) };
  if (/orders?/i.test(normalized)) return { status: 'clear', name: 'order_summary', subject: 'orders', confidence: 0.85, ambiguous: false, ambiguities: [], clarificationQuestion: null, schemaAvailable: Boolean(context.schema) };
  if (/products?|inventory|stock/i.test(normalized)) return { status: 'clear', name: 'product_inventory', subject: 'products', confidence: 0.85, ambiguous: false, ambiguities: [], clarificationQuestion: null, schemaAvailable: Boolean(context.schema) };
  if (context.currentIntent) return { ...context.currentIntent, status: context.currentIntent.status || 'clear', confidence: 0.7, inherited: true, schemaAvailable: Boolean(context.schema) };
  return { status: 'clear', name: 'unknown', subject: null, confidence: 0, ambiguous: false, ambiguities: [], clarificationQuestion: null, schemaAvailable: Boolean(context.schema) };
}
