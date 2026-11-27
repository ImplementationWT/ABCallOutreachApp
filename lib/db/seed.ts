/* Fills the database with the demo's seeded world, relative to the day it runs (or to `t0`).
 * Also creates users and sessions, with the admin user (admin / adminmaster123) if it is missing. */
import type { Db } from 'mongodb';
import { COLLECTIONS, buildWorld, toDocs, type Doc } from '@/lib/domain';
import { ensureAuth } from './auth-core';
import { ensureCollections } from './schema';
import { STEPS } from './migrations';

export type SeedResult = { seeded: boolean; counts: Record<string, number> };

export async function seedDatabase(db: Db, { reset = false, t0, resetAdmin = false }: { reset?: boolean; t0?: Date; resetAdmin?: boolean } = {}): Promise<SeedResult> {
  await ensureCollections(db);
  await ensureAuth(db, { resetAdmin });
  const existing = await db.collection('properties').countDocuments();
  if (existing && !reset) return { seeded: false, counts: { properties: existing } };
  buildWorld(t0);
  const docs = toDocs();
  if (reset) await db.collection('property_locks').deleteMany({});
  const counts: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    const col = db.collection<Doc>(name);
    if (reset) await col.deleteMany({});
    if (docs[name].length) await col.insertMany(docs[name]);
    counts[name] = docs[name].length;
  }
  // The seed is built with the current rules: every one-time migration is already applied
  const mig = db.collection<{ _id: string; at: string; what: string; result: string }>('migrations');
  if (reset) await mig.deleteMany({});
  for (const s of STEPS) await mig.updateOne({ _id: s.name }, { $setOnInsert: { at: new Date().toISOString(), what: s.what, result: 'seeded with the current rules' } }, { upsert: true });
  return { seeded: true, counts };
}
