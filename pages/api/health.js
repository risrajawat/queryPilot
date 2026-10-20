import { getDatabaseAdapter } from '../../src/lib/db/index.js';

export default function handler(_request, response) {
  try {
    const adapter = getDatabaseAdapter();
    const health = adapter.checkHealth();
    if (health && typeof health.then === 'function') {
      return health
        .then((result) => {
          if (!result.ok) {
            return response.status(500).json({ status: 'error', provider: result.provider, message: result.error || 'Health check failed' });
          }
          return response.status(200).json({ status: 'ok', provider: result.provider });
        })
        .catch((err) => {
          console.error('[Health Check Error]:', err.message);
          return response.status(500).json({ status: 'error', message: 'Unable to connect to database' });
        });
    }

    if (!health.ok) {
      return response.status(500).json({ status: 'error', provider: health.provider, message: health.error || 'Health check failed' });
    }
    return response.status(200).json({ status: 'ok', provider: health.provider });
  } catch (err) {
    console.error('[Health Check Error]:', err.message);
    return response.status(500).json({ status: 'error', message: 'Database is unavailable' });
  }
}
