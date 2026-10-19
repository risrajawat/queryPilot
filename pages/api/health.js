import { getDatabase } from '../../src/lib/db/index.js';

export default function handler(_request, response) {
  const database = getDatabase();
  const result = database.prepare('SELECT 1 AS ok').get();
  database.close();
  response.status(200).json({ status: result.ok === 1 ? 'ok' : 'error' });
}
