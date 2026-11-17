/* The e2e tests run against their own database (E2E_DB), reseeded before each walk that writes.
 * The seed is dated on the artifact's demo day and the browser clock is fixed there too
 * (targets.ts), so screens can be compared with artifact/app.html. */
import { MongoClient, type Db } from 'mongodb';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createSession, ensureAuth } from '../../lib/db/auth-core';
import { seedDatabase } from '../../lib/db/seed';

export const E2E_DB = 'calloutreach_e2e';
export const ARTIFACT_DAY = new Date(2026, 10, 2, 8, 20);
export async function withDb<T>(fn: (db: Db) => Promise<T>) {
  const client = new MongoClient(process.env.MONGODB_URI!, { appName: 'calloutreach-e2e' });
  try { await client.connect(); return await fn(client.db(E2E_DB)); } finally { await client.close(); }
}
/** Only the admin user left (other users and their sessions removed). */
export const resetUsers = () => withDb(async db => { await db.collection('users').deleteMany({ _id: { $ne: 'admin' } as never }); await db.collection('sessions').deleteMany({ user: { $ne: 'admin' } }); });
export const reseed = () => withDb(db => seedDatabase(db, { reset: true, t0: ARTIFACT_DAY }));
/** Signed-in browser state used by every test (config use.storageState and manual pages). */
export const STORAGE = 'playwright/.auth/admin.json';
/** Admin back to the default password, every session closed, and a new session in STORAGE. */
export async function resetAdmin() {
  const token = await withDb(async db => { await ensureAuth(db, { resetAdmin: true }); await db.collection('sessions').deleteMany({}); return createSession(db, 'admin'); });
  mkdirSync('playwright/.auth', { recursive: true });
  writeFileSync(STORAGE, JSON.stringify({ cookies: [{ name: 'ab_session', value: token, domain: 'localhost', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] }));
}
