export const BEST_CUSTOMER_CHOICES = [
  { id: 'total_revenue', label: 'Highest total revenue' },
  { id: 'order_count', label: 'Most orders' },
  { id: 'last_purchase', label: 'Most recent purchases' },
];

function normalizeChoiceText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[“”"'.,!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  const text = normalizeChoiceText(message);
  const choice = BEST_CUSTOMER_CHOICES.find((item) =>
    text === normalizeChoiceText(item.label) ||
    text === normalizeChoiceText(item.id.replaceAll('_', ' ')) ||
    (item.id === 'total_revenue' && text === 'highest revenue') ||
    (item.id === 'order_count' && text === 'most orders') ||
    (item.id === 'last_purchase' && text === 'recent purchases'),
  );
  return choice ? { status: 'clear', name: 'customer_ranking', subject: 'customers', metric: choice.id, confidence: 1, ambiguous: false, ambiguities: [], clarificationQuestion: null } : null;
}
