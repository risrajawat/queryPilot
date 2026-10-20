import { getDatabaseAdapter } from '../../src/lib/db/index.js';

export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const query = request.query || {};
  if (query.sql !== undefined || query.query !== undefined) {
    return response.status(400).json({ error: 'SQL is not accepted by the database explorer' });
  }
  const table = query.table;
  if (Array.isArray(table)) return response.status(400).json({ error: 'Invalid table' });
  if (table !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
    return response.status(400).json({ error: 'Invalid table' });
  }

  try {
    const adapter = getDatabaseAdapter();
    const dataResult = adapter.getExplorerData(table || null);
    if (dataResult && typeof dataResult.then === 'function') {
      return dataResult
        .then((data) => response.status(200).json(data))
        .catch((error) => {
          if (error.code === 'UNKNOWN_TABLE') return response.status(400).json({ error: 'Unknown table' });
          console.error('[Explorer Error]:', error.message);
          return response.status(500).json({ error: 'Unable to read database explorer data' });
        });
    }
    return response.status(200).json(dataResult);
  } catch (error) {
    if (error.code === 'UNKNOWN_TABLE') return response.status(400).json({ error: 'Unknown table' });
    console.error('[Explorer Error]:', error.message);
    return response.status(500).json({ error: 'Unable to read database explorer data' });
  }
}
