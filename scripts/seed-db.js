import { getDatabase, defaultDbPath } from '../src/lib/db/index.js';

const database = getDatabase(defaultDbPath);
console.log(`Database ready at ${defaultDbPath} (${database.prepare('SELECT COUNT(*) AS count FROM orders').get().count} orders)`);
database.close();
