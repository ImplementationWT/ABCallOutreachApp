/* npm run db:seed [-- --reset] [-- --reset-admin]
 * Creates the collections (validators and indexes), users and sessions, and the admin user if it is
 * missing (admin / adminmaster123). On an empty database it also loads the demo data, dated relative
 * to today. --reset replaces all the data (users stay); --reset-admin puts the admin password back
 * to the default and closes every session. Reads MONGODB_URI and MONGODB_DB from .env.local. */
import { MongoClient } from 'mongodb';
import { seedDatabase } from '@/lib/db/seed';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'calloutreach';
if (!uri) { console.error('MONGODB_URI is not set (add it to .env.local)'); process.exit(1); }

const client = new MongoClient(uri, { appName: 'calloutreach-seed' });
try {
  await client.connect();
  const r = await seedDatabase(client.db(dbName), { reset: process.argv.includes('--reset'), resetAdmin: process.argv.includes('--reset-admin') });
  if (!r.seeded) console.log(`"${dbName}" already has data (${r.counts.properties} properties): collections, indexes and the admin user checked, data kept. Use --reset to replace it.`);
  else {
    console.log(`Seeded "${dbName}":`);
    for (const [k, n] of Object.entries(r.counts)) console.log(`  ${k.padEnd(14)} ${n}`);
  }
  if (process.argv.includes('--reset-admin')) console.log('Admin password set back to the default; every session was closed.');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await client.close();
}
