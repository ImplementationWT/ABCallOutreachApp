/* Users, roles and sessions in MongoDB, without Next (used by the API, the scripts and the tests).
 * Passwords: scrypt with a random salt, stored as "scrypt$<salt>$<hash>".
 * Sessions: a random token in an httpOnly cookie; the database keeps only its SHA-256, with a TTL.
 * Users created by a manager, or whose password was reset, get a temporary password and must
 * choose their own on the next sign-in (mustChange). */
import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Db } from 'mongodb';
import { ALL_PERMS, PEOPLE, ROLES, ROLE_KEYS, type Me, type Perm, type Role } from '../auth/roles';
import { MIN_PASSWORD } from './auth-rules';

export { MIN_PASSWORD };
const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const DEFAULT_ADMIN = { username: 'admin', password: 'adminmaster123' };
export const SESSION_DAYS = 7;
const MAX_FAILS = 5, LOCK_MINUTES = 5;

export type UserDoc = {
  _id: string; username: string; name: string; password: string; role: Role; perms: Perm[]; person: string | null;
  active: boolean; mustChange: boolean; failed: number; lockedUntil: Date | null;
  createdAt: Date; updatedAt: Date; lastLoginAt: Date | null;
};
export type SessionDoc = { _id: string; user: string; createdAt: Date; expiresAt: Date };
/** A user as the Users screen sees it (never the password). */
export type UserView = Omit<UserDoc, 'password' | 'failed'> & { locked: boolean };

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
/** 12 characters, no look-alikes (0/O, 1/l/I). */
export function tempPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 12 }, () => abc[randomInt(abc.length)]).join('');
}

const str = { bsonType: 'string' };
export const AUTH_SCHEMAS = {
  users: { bsonType: 'object', required: ['_id', 'username', 'name', 'password', 'role', 'perms', 'active', 'mustChange', 'failed', 'createdAt', 'updatedAt'], properties: {
    _id: str, username: { bsonType: 'string', pattern: '^[a-z0-9._-]{2,32}$' }, name: { bsonType: 'string', minLength: 1 },
    password: { bsonType: 'string', pattern: '^scrypt\\$' }, role: { enum: ROLE_KEYS }, perms: { bsonType: 'array', items: { enum: ALL_PERMS } },
    person: { enum: [...PEOPLE, null] }, active: { bsonType: 'bool' }, mustChange: { bsonType: 'bool' }, failed: { bsonType: 'number' },
    lockedUntil: { bsonType: ['date', 'null'] }, createdAt: { bsonType: 'date' }, updatedAt: { bsonType: 'date' }, lastLoginAt: { bsonType: ['date', 'null'] } } },
  sessions: { bsonType: 'object', required: ['_id', 'user', 'createdAt', 'expiresAt'], properties: {
    _id: str, user: str, createdAt: { bsonType: 'date' }, expiresAt: { bsonType: 'date' } } },
};

/** The four people of the demo, as users. Created (with a temporary password) by ensureTeamUsers. */
export const TEAM: { username: string; name: string; role: Role; person: string }[] = [
  { username: 'andrew', name: 'Andrew Vaitkevicius', role: 'manager', person: 'and' },
  { username: 'maya', name: 'Maya Torres', role: 'rep', person: 'may' },
  { username: 'daniel', name: 'Daniel Brooks', role: 'rep', person: 'dan' },
  { username: 'priya', name: 'Priya Shah', role: 'rep', person: 'pri' },
];

/** Creates users and sessions (validators, TTL), updates older user documents to the current shape
 * and creates the admin user if it is missing. resetAdmin: default password and every session closed. */
export async function ensureAuth(db: Db, { resetAdmin = false } = {}) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  const users = db.collection<UserDoc>('users');
  if (existing.has('users')) {
    // Documents from before roles: fill the new fields before turning the new validator on
    await db.command({ collMod: 'users', validationLevel: 'off' });
    const now = new Date();
    for (const u of await users.find({ role: { $exists: false } }).toArray()) {
      await users.updateOne({ _id: u._id }, { $set: { name: u.username === 'admin' ? 'Administrator' : u.username, role: 'admin', perms: ALL_PERMS, person: null, active: true, mustChange: false, createdAt: u.updatedAt || now, lastLoginAt: null } });
    }
  }
  for (const [name, schema] of Object.entries(AUTH_SCHEMAS)) {
    const opts = { validator: { $jsonSchema: schema }, validationLevel: 'strict' as const, validationAction: 'error' as const };
    if (existing.has(name)) await db.command({ collMod: name, ...opts }); else await db.createCollection(name, opts);
  }
  await users.createIndex({ username: 1 }, { unique: true });
  await db.collection('sessions').createIndexes([{ key: { expiresAt: 1 }, expireAfterSeconds: 0 }, { key: { user: 1 } }]);
  const admin = await users.findOne({ username: DEFAULT_ADMIN.username });
  if (resetAdmin || !admin) {
    const now = new Date();
    await users.replaceOne({ _id: DEFAULT_ADMIN.username }, { username: DEFAULT_ADMIN.username, name: 'Administrator', password: await hashPassword(DEFAULT_ADMIN.password), role: 'admin', perms: ALL_PERMS, person: null, active: true, mustChange: false, failed: 0, lockedUntil: null, createdAt: admin?.createdAt || now, updatedAt: now, lastLoginAt: admin?.lastLoginAt || null }, { upsert: true });
    if (resetAdmin) await db.collection('sessions').deleteMany({ user: DEFAULT_ADMIN.username });
  }
}

/** Creates the users of TEAM that do not exist yet. Returns their temporary passwords (shown once). */
export async function ensureTeamUsers(db: Db) {
  const created: { username: string; name: string; role: Role; password: string }[] = [];
  for (const t of TEAM) {
    if (await db.collection<UserDoc>('users').findOne({ username: t.username })) continue;
    const r = await createUser(db, { ...t, perms: [...ROLES[t.role].perms] });
    if (r.ok) created.push({ username: t.username, name: t.name, role: t.role, password: r.password });
  }
  return created;
}

const view = (u: UserDoc): UserView => {
  const { password: _pw, failed: _f, ...rest } = u;
  void _pw; void _f;
  return { ...rest, locked: !!(u.lockedUntil && u.lockedUntil > new Date()) };
};
export const meOf = (u: UserDoc): Me => ({ id: u._id, username: u.username, name: u.name, role: u.role, perms: u.perms, person: u.person, mustChange: u.mustChange });

export type LoginResult = { ok: true; token: string; me: Me } | { ok: false; reason: 'invalid' | 'locked' | 'inactive' };
export async function login(db: Db, username: string, password: string): Promise<LoginResult> {
  const users = db.collection<UserDoc>('users');
  const u = await users.findOne({ username: username.toLowerCase() });
  if (!u) { await verifyPassword(password, `scrypt$${'A'.repeat(24)}$${'A'.repeat(88)}`); return { ok: false, reason: 'invalid' }; }
  if (u.lockedUntil && u.lockedUntil > new Date()) return { ok: false, reason: 'locked' };
  if (!(await verifyPassword(password, u.password))) {
    const failed = (u.failed || 0) + 1;
    await users.updateOne({ _id: u._id }, { $set: failed >= MAX_FAILS ? { failed: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) } : { failed } });
    return { ok: false, reason: failed >= MAX_FAILS ? 'locked' : 'invalid' };
  }
  if (!u.active) return { ok: false, reason: 'inactive' };
  await users.updateOne({ _id: u._id }, { $set: { failed: 0, lockedUntil: null, lastLoginAt: new Date() } });
  return { ok: true, token: await createSession(db, u._id), me: meOf(u) };
}
export async function createSession(db: Db, user: string) {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  await db.collection<SessionDoc>('sessions').insertOne({ _id: tokenHash(token), user, createdAt: now, expiresAt: new Date(now.getTime() + SESSION_DAYS * 864e5) });
  return token;
}
/** The active user behind a session token, or null. */
export async function sessionUserDoc(db: Db, token: string | undefined) {
  if (!token) return null;
  const s = await db.collection<SessionDoc>('sessions').findOne({ _id: tokenHash(token), expiresAt: { $gt: new Date() } });
  if (!s) return null;
  const u = await db.collection<UserDoc>('users').findOne({ _id: s.user });
  return u && u.active ? u : null;
}
export async function sessionUser(db: Db, token: string | undefined) {
  return (await sessionUserDoc(db, token))?._id ?? null;
}
export async function endSession(db: Db, token: string | undefined) {
  if (token) await db.collection<SessionDoc>('sessions').deleteOne({ _id: tokenHash(token) });
}

export type ChangeResult = { ok: true } | { ok: false; error: string };
/** The user changes their own password; their other sessions are closed. */
export async function changePassword(db: Db, user: string, current: string, next: string, keepToken: string): Promise<ChangeResult> {
  if (next.length < MIN_PASSWORD) return { ok: false, error: `The new password needs at least ${MIN_PASSWORD} characters` };
  const users = db.collection<UserDoc>('users');
  const u = await users.findOne({ _id: user });
  if (!u || !(await verifyPassword(current, u.password))) return { ok: false, error: 'The current password is not correct' };
  if (current === next) return { ok: false, error: 'The new password must be different from the current one' };
  await users.updateOne({ _id: user }, { $set: { password: await hashPassword(next), mustChange: false, updatedAt: new Date(), failed: 0, lockedUntil: null } });
  await db.collection<SessionDoc>('sessions').deleteMany({ user, _id: { $ne: tokenHash(keepToken) } });
  return { ok: true };
}

/* ----- Managing users (needs users.manage) ----- */
export type UserInput = { username?: string; name?: string; role?: Role; perms?: Perm[]; person?: string | null; active?: boolean };
const clean = (perms: unknown): Perm[] => Array.isArray(perms) ? ALL_PERMS.filter(p => perms.includes(p)) : [];

export async function listUsers(db: Db) {
  return (await db.collection<UserDoc>('users').find({}).sort({ createdAt: 1 }).toArray()).map(view);
}
export async function createUser(db: Db, input: UserInput): Promise<{ ok: true; user: UserView; password: string } | { ok: false; error: string }> {
  const username = String(input.username || '').trim().toLowerCase();
  const name = String(input.name || '').trim();
  const role = input.role && ROLE_KEYS.includes(input.role) ? input.role : null;
  if (!/^[a-z0-9._-]{2,32}$/.test(username)) return { ok: false, error: 'The user name needs 2 to 32 characters: letters, numbers, dot, dash or underscore' };
  if (!name) return { ok: false, error: 'Write the person’s name' };
  if (!role) return { ok: false, error: 'Pick a role' };
  const person = input.person && (PEOPLE as readonly string[]).includes(input.person) ? input.person : null;
  const users = db.collection<UserDoc>('users');
  if (await users.findOne({ username })) return { ok: false, error: `The user name "${username}" is taken` };
  const password = tempPassword(), now = new Date();
  const doc: UserDoc = { _id: username, username, name, password: await hashPassword(password), role, perms: input.perms ? clean(input.perms) : [...ROLES[role].perms], person, active: true, mustChange: true, failed: 0, lockedUntil: null, createdAt: now, updatedAt: now, lastLoginAt: null };
  await users.insertOne(doc);
  return { ok: true, user: view(doc), password };
}
/** Changes name, role, permissions, linked person or active. `by` is the manager making the change. */
export async function updateUser(db: Db, id: string, input: UserInput, by: string): Promise<{ ok: true; user: UserView } | { ok: false; error: string }> {
  const users = db.collection<UserDoc>('users');
  const u = await users.findOne({ _id: id });
  if (!u) return { ok: false, error: 'User not found' };
  const set: Partial<UserDoc> = { updatedAt: new Date() };
  if (input.name !== undefined) { const n = String(input.name).trim(); if (!n) return { ok: false, error: 'Write the person’s name' }; set.name = n; }
  if (input.role !== undefined) { if (!ROLE_KEYS.includes(input.role)) return { ok: false, error: 'Pick a role' }; set.role = input.role; }
  if (input.perms !== undefined) set.perms = clean(input.perms);
  if (input.person !== undefined) set.person = input.person && (PEOPLE as readonly string[]).includes(input.person) ? input.person : null;
  if (input.active !== undefined) set.active = !!input.active;
  const after = { ...u, ...set };
  if (id === by && (!after.active || !after.perms.includes('users.manage'))) return { ok: false, error: 'You cannot take away your own access to Users or deactivate yourself' };
  if (u.active && u.perms.includes('users.manage') && (!after.active || !after.perms.includes('users.manage'))) {
    const others = await users.countDocuments({ _id: { $ne: id }, active: true, perms: 'users.manage' });
    if (!others) return { ok: false, error: 'At least one active user must keep access to Users' };
  }
  await users.updateOne({ _id: id }, { $set: set });
  if (set.active === false) await db.collection('sessions').deleteMany({ user: id });
  return { ok: true, user: view(after) };
}
/** New temporary password; the user must choose their own at the next sign-in. Closes their sessions. */
export async function resetPassword(db: Db, id: string) {
  const users = db.collection<UserDoc>('users');
  if (!(await users.findOne({ _id: id }))) return { ok: false as const, error: 'User not found' };
  const password = tempPassword();
  await users.updateOne({ _id: id }, { $set: { password: await hashPassword(password), mustChange: true, failed: 0, lockedUntil: null, updatedAt: new Date() } });
  await db.collection('sessions').deleteMany({ user: id });
  return { ok: true as const, password };
}
