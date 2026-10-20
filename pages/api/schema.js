import { getDatabase } from '../../src/lib/db/index.js';
import { getDatabaseSchema } from '../../src/lib/db/schema-introspection.js';

export default function handler(request, response) {
  if (request.method && request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  let database;
  try {
    database = getDatabase(undefined, { seed: false });
    const schema = getDatabaseSchema(database);
    return response.status(200).json({ schema, compactSchema: schema.compact });
  } catch (_error) {
    return response.status(500).json({ error: 'Unable to read database schema' });
  } finally {
    database?.close();
  }
}
