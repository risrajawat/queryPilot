import dotenv from 'dotenv';
import { getTursoClient, initTursoDatabase } from '../src/lib/db/turso.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('Error: TURSO_DATABASE_URL environment variable is required.');
  console.error('Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local or your environment.');
  process.exit(1);
}

async function main() {
  console.log(`Connecting to Turso database: ${url.replace(/:[^:@]+@/, ':***@')}...`);
  const client = getTursoClient({ url, authToken });

  console.log('Applying schema and seeding deterministic synthetic data...');
  await initTursoDatabase(client, { force: true });

  const tables = ['categories', 'customers', 'products', 'orders', 'order_items', 'payments'];
  console.log('\nSeed verification:');
  for (const table of tables) {
    const res = await client.execute(`SELECT COUNT(*) AS count FROM ${table}`);
    const count = res.rows[0]?.count ?? res.rows[0]?.[0] ?? 0;
    console.log(`  ✓ ${table.padEnd(14)} ${count} rows`);
  }

  console.log('\nTurso production database initialized successfully!');
  if (client.close) await client.close();
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
