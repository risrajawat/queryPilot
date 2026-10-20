import { getDatabaseAdapter } from '../../../src/lib/db/index.js';
import { createSession, listSessions } from '../../../src/lib/conversation/session-store.js';

export default function handler(request, response) {
  if (request.method === 'GET') {
    return response.status(200).json({ conversations: listSessions() });
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adapter = getDatabaseAdapter();
    const schemaResult = adapter.getSchema();
    if (schemaResult && typeof schemaResult.then === 'function') {
      return schemaResult
        .then((schema) => {
          const session = createSession({ schema: schema.compact });
          return response.status(201).json({ conversation: session, id: session.id });
        })
        .catch((err) => {
          console.error('[Create Conversation Error]:', err.message);
          return response.status(500).json({ error: 'Unable to start conversation' });
        });
    }

    const session = createSession({ schema: schemaResult.compact });
    return response.status(201).json({ conversation: session, id: session.id });
  } catch (err) {
    console.error('[Create Conversation Error]:', err.message);
    return response.status(500).json({ error: 'Unable to start conversation' });
  }
}
