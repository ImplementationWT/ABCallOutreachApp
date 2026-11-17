/* npm run db:seed [-- --reset]
 * Creates the collections (validators and indexes) and loads the demo data into MONGODB_DB.
 * Reads MONGODB_URI and MONGODB_DB from .env.local. Without --reset it refuses to touch a database
 * that already has data. */
import { MongoClient } from 'mongodb';
import { seedDatabase } from '@/lib/db/seed';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'calloutreach';
if (!uri) { console.error('MONGODB_URI is not set (add it to .env.local)'); process.exit(1); }

const client = new MongoClient(uri, { appName: 'calloutreach-seed' });
try {
  await client.connect();
  const counts = await seedDatabase(client.db(dbName), { reset: process.argv.includes('--reset') });
  console.log(`Seeded "${dbName}":`);
  for (const [k, n] of Object.entries(counts)) console.log(`  ${k.padEnd(14)} ${n}`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await client.close();
}
