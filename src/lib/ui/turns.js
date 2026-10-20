export function normalizeChoice(choice) {
  if (typeof choice === 'string') return { label: choice, value: choice };
  if (!choice || typeof choice !== 'object') return { label: '', value: '' };
  const value = choice.value ?? choice.label ?? choice.text ?? '';
  const label = choice.label ?? choice.text ?? value;
  return { label: String(label), value: String(value) };
}

export function formatTime(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch (_e) {
    return '';
  }
}

export function formatRelativeTime(dateInput) {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export const CHOICE_METADATA = {
  total_revenue: {
    icon: 'bar_chart',
    title: 'Highest total revenue',
    description: 'Customers who have generated the most revenue',
  },
  order_count: {
    icon: 'shopping_cart',
    title: 'Most orders',
    description: 'Customers with the highest number of orders',
  },
  last_purchase: {
    icon: 'clock',
    title: 'Most recent purchases',
    description: 'Customers who purchased most recently',
  },
};

export function getChoiceMetadata(choice) {
  const normalized = normalizeChoice(choice);
  const key = normalized.value.toLowerCase().replace(/\s+/g, '_');
  if (CHOICE_METADATA[key]) return CHOICE_METADATA[key];

  if (/revenue/i.test(normalized.label)) return CHOICE_METADATA.total_revenue;
  if (/order/i.test(normalized.label)) return CHOICE_METADATA.order_count;
  if (/recent|purchase/i.test(normalized.label)) return CHOICE_METADATA.last_purchase;

  return {
    icon: 'sparkle',
    title: normalized.label,
    description: 'Select this clarification option',
  };
}

export function createTurn(userMessage, id = `turn-${Date.now()}-${Math.random().toString(36).slice(2)}`) {
  return {
    id,
    userMessage,
    assistant: '',
    clarification: '',
    choices: [],
    sqlPreview: null,
    results: null,
    explanation: '',
    explanationStatus: null,
    error: '',
    loading: true,
    stage: 'Generating query',
    timestamp: formatTime(),
    createdAt: Date.now(),
  };
}

export function updateTurn(turns, id, patch) {
  return turns.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn));
}

export function resolveTurn(turns, id) {
  return updateTurn(turns, id, { choices: [], clarification: '' });
}

export function finishTurn(turns, id) {
  return updateTurn(turns, id, { loading: false, stage: '' });
}
