import { getDatabaseAdapter } from '../../src/lib/db/index.js';

export default function handler(request, response) {
  if (request.method && request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adapter = getDatabaseAdapter();
    const schemaResult = adapter.getSchema();
    if (schemaResult && typeof schemaResult.then === 'function') {
      return schemaResult
        .then((schema) => response.status(200).json({ schema, compactSchema: schema.compact }))
        .catch((err) => {
          console.error('[Schema Error]:', err.message);
          return response.status(500).json({ error: 'Unable to read database schema' });
        });
    }
    return response.status(200).json({ schema: schemaResult, compactSchema: schemaResult.compact });
  } catch (err) {
    console.error('[Schema Error]:', err.message);
    return response.status(500).json({ error: 'Unable to read database schema' });
  }
}
