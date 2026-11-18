/* npm run db:backup [-- --out <folder>]
 * Full copy of the database, one Extended JSON file per collection (canonical mode, so ObjectIds and
 * dates come back exactly), plus _meta.json with each collection's validator options and indexes.
 * Default folder: ~/ABCallOutreach-backups/<db>-<timestamp>/. Restore it with npm run db:restore.
 * Reads MONGODB_URI and MONGODB_DB from .env.local. */
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { BSON, MongoClient } from 'mongodb';

const { EJSON } = BSON;

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'calloutreach';
if (!uri) { console.error('MONGODB_URI is not set (add it to .env.local)'); process.exit(1); }

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = arg('--out') || join(homedir(), 'ABCallOutreach-backups', `${dbName}-${stamp}`);

const client = new MongoClient(uri, { appName: 'calloutreach-backup' });
try {
  await client.connect();
  const db = client.db(dbName);
  await mkdir(out, { recursive: true, mode: 0o700 });
  const meta: Record<string, unknown> = { db: dbName, at: new Date().toISOString(), collections: {} };
  const infos = await db.listCollections({ type: 'collection' }).toArray();
  for (const info of infos.sort((a, b) => a.name.localeCompare(b.name))) {
    const c = db.collection(info.name);
    const docs = await c.find({}).toArray();
    const indexes = await c.indexes();
    await writeFile(join(out, `${info.name}.json`), EJSON.stringify(docs, undefined, 0, { relaxed: false }), { mode: 0o600 });
    (meta.collections as Record<string, unknown>)[info.name] = { count: docs.length, options: 'options' in info ? info.options : {}, indexes };
    console.log(`  ${info.name.padEnd(14)} ${docs.length}`);
  }
  await writeFile(join(out, '_meta.json'), EJSON.stringify(meta, undefined, 2, { relaxed: false }), { mode: 0o600 });
  console.log(`Backup of "${dbName}" in ${out}`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await client.close();
}
