import { describe, expect, it } from 'vitest';
import { createTurn, finishTurn, normalizeChoice, resolveTurn, updateTurn } from '../src/lib/ui/turns.js';

describe('turn UI state', () => {
  it('normalizes server choices without depending on React', () => {
    expect([normalizeChoice('Revenue'), normalizeChoice({ text: 'Orders', value: 'order_count' })]).toEqual([
      { label: 'Revenue', value: 'Revenue' }, { label: 'Orders', value: 'order_count' },
    ]);
  });

  it('updates one turn while retaining independent chronological turns', () => {
    const first = createTurn('first', 'one');
    const second = createTurn('second', 'two');
    const turns = updateTurn([first, second], 'one', { results: { rowCount: 1 }, loading: false });
    expect(turns.map(({ userMessage }) => userMessage)).toEqual(['first', 'second']);
    expect(turns[0].results).toEqual({ rowCount: 1 });
    expect(turns[1].results).toBeNull();
    expect(finishTurn(turns, 'two')[1].loading).toBe(false);
  });

  it('resolves a clarification turn without affecting later turns', () => {
    const first = { ...createTurn('best customers', 'one'), choices: [{ label: 'Highest total revenue', value: 'Highest total revenue' }], clarification: 'What do you mean?' };
    const second = createTurn('Most orders', 'two');
    const turns = resolveTurn([first, second], 'one');
    expect(turns[0]).toMatchObject({ choices: [], clarification: '' });
    expect(turns[1].userMessage).toBe('Most orders');
    expect(turns[1].choices).toEqual([]);
  });
});
