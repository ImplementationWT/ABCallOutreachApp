/* Brings an existing database up to date with the code: validators and indexes of every collection
 * (lib/db/schema.ts), the call outcome catalog seed if it is empty (lib/db/outcomes.ts), and the
 * one-time data changes not run yet (lib/db/migrations.ts).
 * Safe to run more than once. Run it before deploying a version that needs it:
 *   npm run db:migrate */
import { MongoClient } from 'mongodb';
import { ensureCollections } from '@/lib/db/schema';
import { DEFAULT_OUTCOMES } from '@/lib/domain/outcomes';
import { runMigrations } from '@/lib/db/migrations';

const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
try {
  const db = client.db(process.env.MONGODB_DB || 'calloutreach');
  await ensureCollections(db);
  const col = db.collection('outcomes');
  if (!(await col.estimatedDocumentCount())) {
    await col.insertMany(DEFAULT_OUTCOMES.map(([k, d], pos) => ({ _id: k as never, ...d, pos })));
    console.log(`outcomes: ${DEFAULT_OUTCOMES.length} seeded`);
  } else console.log('outcomes: already there');
  for (const m of await runMigrations(db)) console.log(`${m.name}: ${m.result}`);
  console.log(`Migrated "${db.databaseName}"`);
} finally { await client.close(); }
