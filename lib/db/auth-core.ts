/* Users and sessions in MongoDB, without Next (used by the API, the seed script and the tests).
 * Passwords: scrypt with a random salt, stored as "scrypt$<salt>$<hash>".
 * Sessions: a random token in an httpOnly cookie; the database keeps only its SHA-256, with a TTL. */
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Db } from 'mongodb';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const DEFAULT_ADMIN = { username: 'admin', password: 'adminmaster123' };
import { MIN_PASSWORD } from './auth-rules';
export { MIN_PASSWORD };
export const SESSION_DAYS = 7;
const MAX_FAILS = 5, LOCK_MINUTES = 5;

export type UserDoc = { _id: string; username: string; password: string; updatedAt: Date; failed: number; lockedUntil: Date | null };
export type SessionDoc = { _id: string; user: string; createdAt: Date; expiresAt: Date };

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await scrypt(pw, salt, 64)).toString('base64')}`;
}
export async function verifyPassword(pw: string, stored: string) {
  const [alg, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'base64');
  const got = await scrypt(pw, Buffer.from(salt, 'base64'), want.length);
  return timingSafeEqual(got, want);
}
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export const AUTH_SCHEMAS = {
  users: { bsonType: 'object', required: ['_id', 'username', 'password', 'updatedAt', 'failed'], properties: {
    _id: { bsonType: 'string' }, username: { bsonType: 'string', minLength: 1 }, password: { bsonType: 'string', pattern: '^scrypt\\$' },
    updatedAt: { bsonType: 'date' }, failed: { bsonType: 'number' }, lockedUntil: { bsonType: ['date', 'null'] } } },
  sessions: { bsonType: 'object', required: ['_id', 'user', 'createdAt', 'expiresAt'], properties: {
    _id: { bsonType: 'string' }, user: { bsonType: 'string' }, createdAt: { bsonType: 'date' }, expiresAt: { bsonType: 'date' } } },
};

/** Creates users and sessions (validators, a TTL on sessions) and the admin user if there is none. */
export async function ensureAuth(db: Db, { resetAdmin = false } = {}) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  for (const [name, schema] of Object.entries(AUTH_SCHEMAS)) {
    const opts = { validator: { $jsonSchema: schema }, validationLevel: 'strict' as const, validationAction: 'error' as const };
    if (existing.has(name)) await db.command({ collMod: name, ...opts }); else await db.createCollection(name, opts);
  }
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('sessions').createIndexes([{ key: { expiresAt: 1 }, expireAfterSeconds: 0 }, { key: { user: 1 } }]);
  const users = db.collection<UserDoc>('users');
  if (resetAdmin || !(await users.findOne({ username: DEFAULT_ADMIN.username }))) {
    await users.replaceOne({ _id: DEFAULT_ADMIN.username }, { username: DEFAULT_ADMIN.username, password: await hashPassword(DEFAULT_ADMIN.password), updatedAt: new Date(), failed: 0, lockedUntil: null }, { upsert: true });
    if (resetAdmin) await db.collection('sessions').deleteMany({});
  }
}

export type LoginResult = { ok: true; token: string; user: string } | { ok: false; reason: 'invalid' | 'locked' };
export async function login(db: Db, username: string, password: string): Promise<LoginResult> {
  const users = db.collection<UserDoc>('users');
  const u = await users.findOne({ username });
  if (!u) { await verifyPassword(password, `scrypt$${'A'.repeat(24)}$${'A'.repeat(88)}`); return { ok: false, reason: 'invalid' }; }
  if (u.lockedUntil && u.lockedUntil > new Date()) return { ok: false, reason: 'locked' };
  if (!(await verifyPassword(password, u.password))) {
    const failed = (u.failed || 0) + 1;
    await users.updateOne({ _id: u._id }, { $set: failed >= MAX_FAILS ? { failed: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) } : { failed } });
    return { ok: false, reason: failed >= MAX_FAILS ? 'locked' : 'invalid' };
  }
  await users.updateOne({ _id: u._id }, { $set: { failed: 0, lockedUntil: null } });
  return { ok: true, token: await createSession(db, u._id), user: u.username };
}
export async function createSession(db: Db, user: string) {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  await db.collection<SessionDoc>('sessions').insertOne({ _id: tokenHash(token), user, createdAt: now, expiresAt: new Date(now.getTime() + SESSION_DAYS * 864e5) });
  return token;
}
export async function sessionUser(db: Db, token: string | undefined) {
  if (!token) return null;
  const s = await db.collection<SessionDoc>('sessions').findOne({ _id: tokenHash(token), expiresAt: { $gt: new Date() } });
  return s ? s.user : null;
}
export async function endSession(db: Db, token: string | undefined) {
  if (token) await db.collection<SessionDoc>('sessions').deleteOne({ _id: tokenHash(token) });
}
export type ChangeResult = { ok: true } | { ok: false; error: string };
/** Changes the password and closes every other session of that user. */
export async function changePassword(db: Db, user: string, current: string, next: string, keepToken: string): Promise<ChangeResult> {
  if (next.length < MIN_PASSWORD) return { ok: false, error: `The new password needs at least ${MIN_PASSWORD} characters` };
  const users = db.collection<UserDoc>('users');
  const u = await users.findOne({ _id: user });
  if (!u || !(await verifyPassword(current, u.password))) return { ok: false, error: 'The current password is not correct' };
  if (current === next) return { ok: false, error: 'The new password must be different from the current one' };
  await users.updateOne({ _id: user }, { $set: { password: await hashPassword(next), updatedAt: new Date(), failed: 0, lockedUntil: null } });
  await db.collection<SessionDoc>('sessions').deleteMany({ user, _id: { $ne: tokenHash(keepToken) } });
  return { ok: true };
}
