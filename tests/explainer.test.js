import { describe, expect, it } from 'vitest';
import { explainVerifiedResult, MAX_EXPLANATION_ROWS } from '../src/lib/results/explainer.js';
import { clearSessions, createSession, updateSession } from '../src/lib/conversation/session-store.js';
import explainHandler from '../pages/api/conversations/[id]/explain.js';

const result = { question: 'best customers', intent: { name: 'customer_ranking', metric: 'total_revenue' }, columns: ['first_name', 'last_name', 'total_revenue'], rows: [{ first_name: 'Maya', last_name: 'Chen', total_revenue: 28337 }, { first_name: 'Aisha', last_name: 'Khan', total_revenue: 10498 }], rowCount: 2 };

describe('verified result explanation', () => {
  it('explains only supplied verified values with the deterministic provider', async () => {
    const response = await explainVerifiedResult(result);
    expect(response.success).toBe(true);
    expect(response.explanation).toContain('28337');
    expect(response.explanation).toContain('10498');
    expect(response.explanation).not.toContain('Alice');
  });

  it('handles empty results deterministically without a provider', async () => {
    await expect(explainVerifiedResult({ ...result, rows: [], rowCount: 0 })).resolves.toEqual({ success: true, explanation: 'No results found for this query.' });
  });

  it('limits rows passed to a provider and preserves total row count', async () => {
    let received;
    const rows = Array.from({ length: MAX_EXPLANATION_ROWS + 5 }, (_, index) => ({ first_name: `Name ${index}`, total_revenue: index }));
    const response = await explainVerifiedResult({ ...result, rows, rowCount: rows.length }, { provider: { explainResult: async (input) => { received = input; return 'verified summary'; } } });
    expect(response).toEqual({ success: true, explanation: 'verified summary' });
    expect(received.rows).toHaveLength(MAX_EXPLANATION_ROWS);
    expect(received.rowCount).toBe(rows.length);
    expect(received.sampleLimited).toBe(true);
  });

  it('does not execute SQL inside the explanation module', async () => {
    const response = await explainVerifiedResult(result, { provider: { explainResult: async () => 'safe' } });
    expect(response.explanation).toBe('safe');
  });

  it('keeps execution success separate from provider failure', async () => {
    const response = await explainVerifiedResult(result, { provider: { explainResult: async () => { throw new Error('offline'); } } });
    expect(response).toMatchObject({ success: false, reason: 'explanation_unavailable' });
  });
});

describe('explanation endpoint boundary', () => {
  it('loads and executes the verified server-side result instead of trusting browser data', async () => {
    const schema = `TABLE customers\n  - id INTEGER\n  - first_name TEXT\n  - last_name TEXT\nTABLE orders\n  - id INTEGER\n  - customer_id INTEGER\n  - status TEXT\n  - total_cents INTEGER\n  - ordered_at TEXT`;
    const session = createSession({ schema });
    updateSession(session.id, (value) => {
      value.currentIntent = { name: 'customer_ranking', metric: 'total_revenue', status: 'clear' };
      value.messages.push({ role: 'user', content: 'Show me the best customers' });
      return value;
    });
    const response = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} };
    await explainHandler({ method: 'POST', query: { id: session.id }, body: { rows: [{ fake: 'value' }], sql: 'DROP TABLE customers' } }, response);
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.explanation).not.toContain('fake');
    clearSessions();
  });

  it('returns a safe error for a missing conversation', async () => {
    const response = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} };
    await explainHandler({ method: 'POST', query: { id: 'missing' }, body: {} }, response);
    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: 'Conversation not found' });
  });
});
