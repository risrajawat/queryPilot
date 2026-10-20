export const BEST_CUSTOMER_CHOICES = [
  { id: 'total_revenue', label: 'Highest total revenue' },
  { id: 'order_count', label: 'Most orders' },
  { id: 'last_purchase', label: 'Most recent purchases' },
];

export function clarificationFor(intent) {
  if (intent?.name !== 'customer_ranking' || !intent.ambiguous) return null;
  return {
    pending: true,
    question: 'What do you mean by “best customers”?',
    choices: BEST_CUSTOMER_CHOICES,
  };
}

export function resolveClarification(message, pending) {
  if (!pending?.pending) return null;
  const text = String(message || '').toLowerCase();
  const choice = BEST_CUSTOMER_CHOICES.find((item) =>
    text.includes(item.id.replace('_', ' ')) || text.includes(item.label.toLowerCase()) ||
    (item.id === 'total_revenue' && /highest|revenue/.test(text)) ||
    (item.id === 'order_count' && /most orders?/.test(text)) ||
    (item.id === 'last_purchase' && /recent/.test(text)),
  );
  return choice ? { status: 'clear', name: 'customer_ranking', subject: 'customers', metric: choice.id, confidence: 1, ambiguous: false, ambiguities: [], clarificationQuestion: null } : null;
}
