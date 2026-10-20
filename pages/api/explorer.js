import { getDatabase } from '../../src/lib/db/index.js';
import { getExplorerData } from '../../src/lib/db/explorer.js';

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

  let database;
  try {
    database = getDatabase();
    return response.status(200).json(getExplorerData(database, table || null));
  } catch (error) {
    if (error.code === 'UNKNOWN_TABLE') return response.status(400).json({ error: 'Unknown table' });
    return response.status(500).json({ error: 'Unable to read database explorer data' });
  } finally {
    database?.close();
  }
}
