import { describe, expect, it } from 'vitest';
import handler from '../pages/api/explorer.js';

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('database explorer API boundary', () => {
  it('rejects arbitrary SQL input', () => {
    const response = responseMock();
    handler({ method: 'GET', query: { sql: 'DROP TABLE customers' } }, response);
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/SQL is not accepted/);
  });

  it('rejects unknown table identifiers', () => {
    const response = responseMock();
    handler({ method: 'GET', query: { table: 'customers; DROP TABLE customers' } }, response);
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Invalid table');
  });

  it('allows only GET requests', () => {
    const response = responseMock();
    handler({ method: 'POST', query: {} }, response);
    expect(response.statusCode).toBe(405);
    expect(response.headers.Allow).toBe('GET');
  });
});
