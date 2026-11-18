/* npm run db:restore -- <backup folder> [--only a,b,c] [--yes]
 * Puts a backup made by npm run db:backup back into the database (MONGODB_DB from .env.local).
 * Each restored collection is emptied with deleteMany (its validator and indexes stay) and filled with
 * the backup's documents, with validation bypassed so old documents go back as they were.
 * Without --yes it only shows what it would do. --only limits it to some collections. */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { BSON, MongoClient, type Document } from 'mongodb';

const { EJSON } = BSON;

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'calloutreach';
if (!uri) { console.error('MONGODB_URI is not set (add it to .env.local)'); process.exit(1); }

const dir = process.argv.slice(2).find(a => !a.startsWith('--') && process.argv[process.argv.indexOf(a) - 1] !== '--only');
if (!dir) { console.error('Usage: npm run db:restore -- <backup folder> [--only a,b] [--yes]'); process.exit(1); }
const oi = process.argv.indexOf('--only');
const only = oi > 0 ? new Set(process.argv[oi + 1].split(',')) : null;
const apply = process.argv.includes('--yes');

const files = (await readdir(dir)).filter(f => f.endsWith('.json') && f !== '_meta.json');
const names = files.map(f => f.slice(0, -5)).filter(n => !only || only.has(n));
const client = new MongoClient(uri, { appName: 'calloutreach-restore' });
try {
  await client.connect();
  const db = client.db(dbName);
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  console.log(`${apply ? 'Restoring' : 'Would restore (add --yes to apply)'} "${dbName}" from ${dir}:`);
  for (const n of names) {
    const docs = EJSON.parse(await readFile(join(dir, `${n}.json`), 'utf8'), { relaxed: false }) as Document[];
    const now = existing.has(n) ? await db.collection(n).countDocuments() : 0;
    console.log(`  ${n.padEnd(14)} ${String(now).padStart(6)} now -> ${docs.length}`);
    if (!apply) continue;
    const c = db.collection(n);
    await c.deleteMany({});
    for (let i = 0; i < docs.length; i += 1000) await c.insertMany(docs.slice(i, i + 1000), { ordered: true, bypassDocumentValidation: true });
  }
  if (apply) console.log('Done.');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await client.close();
}
