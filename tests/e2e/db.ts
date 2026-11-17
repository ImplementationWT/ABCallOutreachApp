/* The e2e tests run against their own database (E2E_DB), reseeded before each walk that writes. */
import { MongoClient } from 'mongodb';
import { seedDatabase } from '../../lib/db/seed';

export const E2E_DB = 'calloutreach_e2e';
export async function withDb<T>(fn: (db: import('mongodb').Db) => Promise<T>) {
  const client = new MongoClient(process.env.MONGODB_URI!, { appName: 'calloutreach-e2e' });
  try { await client.connect(); return await fn(client.db(E2E_DB)); } finally { await client.close(); }
}
export const reseed = () => withDb(db => seedDatabase(db, { reset: true }));
