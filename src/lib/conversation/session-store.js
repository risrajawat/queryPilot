import { randomUUID } from 'node:crypto';

// API routes are bundled separately by Next.js. Keep the demo store on the
// process global so a conversation created by one route is visible to the
// message route too. This is intentionally an in-memory MVP store; a durable
// store can replace it without changing the session API.
const sessions = globalThis.__queryPilotSessions || new Map();
globalThis.__queryPilotSessions = sessions;

function copy(session) {
  return structuredClone(session);
}

export function createSession({ schema = null } = {}) {
  const session = {
    id: randomUUID(),
    messages: [],
    currentIntent: null,
    clarification: { pending: false, question: null, choices: [] },
    resolvedContext: {},
    schema,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  sessions.set(session.id, session);
  return copy(session);
}

export function getSession(id) {
  const session = sessions.get(id);
  return session ? copy(session) : null;
}

export function updateSession(id, updater) {
  const session = sessions.get(id);
  if (!session) return null;
  const next = updater(session) || session;
  next.updatedAt = new Date().toISOString();
  sessions.set(id, next);
  return copy(next);
}

export function clearSessions() {
  sessions.clear();
}
