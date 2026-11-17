/* Fills the database with the demo's seeded world (the same data as artifact/app.html). */
import type { Db } from 'mongodb';
import { COLLECTIONS, buildWorld, toDocs, type Doc } from '@/lib/domain';
import { ensureCollections } from './schema';

export async function seedDatabase(db: Db, { reset = false } = {}) {
  await ensureCollections(db);
  const existing = await db.collection('properties').countDocuments();
  if (existing && !reset) throw new Error(`The database "${db.databaseName}" already has ${existing} properties. Run with --reset to replace everything.`);
  buildWorld();
  const docs = toDocs();
  const counts: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    const col = db.collection<Doc>(name);
    if (reset) await col.deleteMany({});
    if (docs[name].length) await col.insertMany(docs[name]);
    counts[name] = docs[name].length;
  }
  return counts;
}
