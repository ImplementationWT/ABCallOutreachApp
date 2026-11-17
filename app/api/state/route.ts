import { connection } from 'next/server';
import type { AnyBulkWriteOperation } from 'mongodb';
import { getDb } from '@/lib/db/mongodb';
import { currentUserDoc, forbidden, unauthorized } from '@/lib/auth/session';
import type { Perm } from '@/lib/auth/roles';
import { COLLECTIONS, type CollectionName, type Doc, type Snapshot } from '@/lib/domain';

/* GET /api/state: every collection, to build the app's state (lib/state/persist.ts).
 * POST /api/state: the documents that changed after an action, { changes: { [collection]: { upsert, delete } } }.
 * Both need a session (POST /api/auth/login). */

export async function GET() {
  await connection();
  try {
    if (!(await currentUserDoc())) return unauthorized();
    const db = await getDb();
    const entries = await Promise.all(COLLECTIONS.map(async n => [n, await db.collection<Doc>(n).find({}).toArray()] as const));
    return Response.json(Object.fromEntries(entries) as Snapshot);
  } catch (e) {
    console.error('GET /api/state failed', e);
    return Response.json({ error: 'Could not read the database' }, { status: 503 });
  }
}

type Change = { upsert?: Doc[]; delete?: (string | number)[] };
/** Collections only some roles may write (the rest change with the reps' daily work). */
const WRITE_PERM: Partial<Record<CollectionName, Perm>> = { campaigns: 'mgr.manage', rules: 'mgr.manage', reps: 'users.manage' };
const MAX_DOCS = 2000;

export async function POST(req: Request) {
  let user;
  try { user = await currentUserDoc(); } catch { return Response.json({ error: 'Could not reach the database' }, { status: 503 }); }
  if (!user) return unauthorized();
  let body: { changes?: Partial<Record<CollectionName, Change>> };
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const changes = body.changes || {};
  const names = Object.keys(changes);
  if (names.some(n => !(COLLECTIONS as readonly string[]).includes(n))) return Response.json({ error: 'Unknown collection' }, { status: 400 });
  if (names.some(n => WRITE_PERM[n as CollectionName] && !user.perms.includes(WRITE_PERM[n as CollectionName]!))) return forbidden();
  const total = names.reduce((a, n) => a + (changes[n as CollectionName]!.upsert?.length || 0) + (changes[n as CollectionName]!.delete?.length || 0), 0);
  if (total > MAX_DOCS) return Response.json({ error: 'Too many changes' }, { status: 413 });
  try {
    const db = await getDb();
    const result: Record<string, { upserted: number; deleted: number }> = {};
    for (const n of names as CollectionName[]) {
      const ch = changes[n]!;
      const ops: AnyBulkWriteOperation<Doc>[] = [
        ...(ch.upsert || []).filter(d => d && d._id != null).map(d => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
        ...(ch.delete || []).map(id => ({ deleteOne: { filter: { _id: id } } })),
      ];
      if (ops.length) await db.collection<Doc>(n).bulkWrite(ops, { ordered: true });
      result[n] = { upserted: ch.upsert?.length || 0, deleted: ch.delete?.length || 0 };
    }
    return Response.json({ ok: true, result });
  } catch (e) {
    const details = (e as { writeErrors?: { err?: { op?: { _id?: unknown }; errInfo?: unknown } }[] }).writeErrors?.map(w => ({ _id: w.err?.op?._id, errInfo: w.err?.errInfo }));
    console.error('POST /api/state failed', details ? JSON.stringify(details) : e);
    return Response.json({ error: 'Could not write to the database' }, { status: 500 });
  }
}
