export function normalizeChoice(choice) {
  if (typeof choice === 'string') return { label: choice, value: choice };
  if (!choice || typeof choice !== 'object') return { label: '', value: '' };
  const value = choice.value ?? choice.label ?? choice.text ?? '';
  const label = choice.label ?? choice.text ?? value;
  return { label: String(label), value: String(value) };
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
