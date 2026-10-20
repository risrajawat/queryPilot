import { getDatabase } from '../../../src/lib/db/index.js';
import { getDatabaseSchema } from '../../../src/lib/db/schema-introspection.js';
import { createSession } from '../../../src/lib/conversation/session-store.js';

export default function handler(request, response) {
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return response.status(405).json({ error: 'Method not allowed' }); }
  let database;
  try {
    database = getDatabase(undefined, { seed: false });
    const schema = getDatabaseSchema(database);
    const session = createSession({ schema: schema.compact });
    return response.status(201).json({ conversation: session });
  } catch (_error) { return response.status(500).json({ error: 'Unable to start conversation' }); }
  finally { database?.close(); }
}
