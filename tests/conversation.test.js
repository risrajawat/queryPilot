import { afterEach, describe, expect, it } from 'vitest';
import { analyzeIntent } from '../src/lib/conversation/intent-analysis.js';
import { clarificationFor, resolveClarification } from '../src/lib/conversation/clarification-engine.js';
import { processMessage } from '../src/lib/conversation/engine.js';
import { clearSessions, createSession, getSession, updateSession } from '../src/lib/conversation/session-store.js';
import { getDatabase, createDatabase } from '../src/lib/db/index.js';
import { getDatabaseSchema } from '../src/lib/db/schema-introspection.js';
import { DeterministicProvider, Gpt6AstraProvider } from '../src/lib/ai/provider.js';

afterEach(() => clearSessions());

describe('intent and clarification', () => {
  it('recognizes a clear customer ranking intent', () => {
     expect(analyzeIntent('Show customers with the highest revenue', { schema: 'TABLE customers' })).toMatchObject({ status: 'clear', name: 'customer_ranking', metric: 'total_revenue', ambiguous: false, schemaAvailable: true });
  });
  it('identifies best customers as ambiguous and offers all choices', () => {
     const clarification = clarificationFor(analyzeIntent('Who are our best customers?'));
    expect(clarification).toMatchObject({ pending: true });
     expect(clarification.question).toContain('best customers');
    expect(clarification.choices.map(({ label }) => label)).toEqual(['Highest total revenue', 'Most orders', 'Most recent purchases']);
  });
  it('resolves the natural-language follow-up Highest revenue', () => {
    const ambiguous = processMessage(createSession(), 'best customers');
    const result = resolveClarification('Highest total revenue', ambiguous.clarification);
    expect(result).toMatchObject({ status: 'clear', name: 'customer_ranking', subject: 'customers', metric: 'total_revenue', ambiguous: false });
  });
  it.each([
    ['Highest total revenue', 'total_revenue'],
    ['Most orders', 'order_count'],
    ['Most recent purchases', 'last_purchase'],
  ])('resolves exact UI choice "%s" to %s', (answer, metric) => {
    const ambiguous = processMessage(createSession(), 'Show me the best customers');
    const result = processMessage({ ...createSession(), currentIntent: ambiguous.intent, clarification: ambiguous.clarification, resolvedContext: ambiguous.resolvedContext }, answer);
    expect(result.intent).toMatchObject({ status: 'clear', name: 'customer_ranking', subject: 'customers', metric, ambiguous: false });
    expect(result.clarification.pending).toBe(false);
  });
  it('retains previous context for follow-up questions', () => {
    const session = createSession();
    const first = processMessage(session, 'best customers');
    const second = processMessage({ ...session, currentIntent: first.intent, clarification: first.clarification, resolvedContext: first.resolvedContext }, 'Most orders');
    expect(second.intent).toMatchObject({ name: 'customer_ranking', metric: 'order_count' });
    expect(second.resolvedContext).toMatchObject({ subject: 'customers', metric: 'order_count' });
  });
  it('keeps conversation messages in chronological order', () => {
    const session = createSession();
    updateSession(session.id, (value) => {
      value.messages.push({ role: 'user', content: 'Show me the best customers' });
      value.messages.push({ role: 'assistant', content: 'What do you mean by “best customers”?' });
      value.messages.push({ role: 'user', content: 'Highest total revenue' });
      return value;
    });
    expect(getSession(session.id).messages.map(({ content }) => content)).toEqual([
      'Show me the best customers',
      'What do you mean by “best customers”?',
      'Highest total revenue',
    ]);
  });
});

describe('conversation persistence', () => {
  it('persists state and returns defensive copies', () => {
    const session = createSession({ schema: 'TABLE customers' });
    updateSession(session.id, (value) => { value.messages.push({ role: 'user', content: 'hello' }); return value; });
    const loaded = getSession(session.id);
    expect(loaded.messages).toHaveLength(1);
    loaded.messages.push({ role: 'user', content: 'mutated copy' });
    expect(getSession(session.id).messages).toHaveLength(1);
  });
});

describe('provider and schema boundaries', () => {
  it('provides deterministic offline fallback and isolated future adapter', async () => {
    expect(await new DeterministicProvider().complete({ messages: [] })).toBe('');
    await expect(new Gpt6AstraProvider({ apiKey: 'test-only' }).complete()).rejects.toThrow(/not configured/);
  });
  it('makes compact schema available without rows', () => {
    const database = createDatabase();
    const schema = getDatabaseSchema(database);
    expect(schema.compact).toContain('TABLE customers');
    expect(schema.compact).not.toContain('Maya');
    database.close();
  });
});
