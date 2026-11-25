import 'server-only';
/* The domain run on the server, on the database's current state, one action at a time.
 * Every write of a rep (allocation, saving a result, starting and ending the day) and the manager's
 * Reassign go through here (lib/db/allocate.ts, lib/db/work.ts): the action is validated against
 * what the database really has, and only the documents it changed are written.
 *
 * Property lock (one property, one rep a day): every property in a list today has a document in
 * `property_locks` with _id "date:property" (unique by definition) and the rep. The reservations
 * and their locks are written in ONE transaction: if another server already holds the lock of a
 * property for another rep, the insert fails, nothing is written, and the action runs again on the
 * fresh state. The in-process queue (locked) avoids that race inside one server; MongoDB is what
 * makes it atomic across servers. */
import { MongoServerError, type AnyBulkWriteOperation, type ClientSession, type Db } from 'mongodb';
import { C, COLLECTIONS, D, DAY, TODAY, fromDocs, setClock, setLocks, setToday, toDocs, type CollectionName, type Doc, type RepKey, type Snapshot } from '@/lib/domain';

/** The browser's local time, sent with every action: 'YYYY-MM-DDTHH:MM'. */
export const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** An expected refusal (validation, permission): the route answers with this status and message. */
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
/** Another server holds the lock of a property: the action runs again on the fresh state. */
class LockConflict extends Error {}

let queue: Promise<unknown> = Promise.resolve();
/** Runs `fn` after every server action already queued (the domain is module state: one at a time). */
export function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

export async function readSnapshot(db: Db): Promise<Snapshot> {
  return Object.fromEntries(await Promise.all(COLLECTIONS.map(async n => [n, await db.collection<Doc>(n).find({}).toArray()] as const))) as Snapshot;
}

const hashes = (s: Snapshot) => Object.fromEntries(COLLECTIONS.map(n => [n, new Map(s[n].map(d => [String(d._id), JSON.stringify(d)]))])) as Record<CollectionName, Map<string, string>>;

/** The documents `act` changed, collection by collection (upserts and deletes). */
export type Changes = Partial<Record<CollectionName, AnyBulkWriteOperation<Doc>[]>>;
type LockDoc = { _id: string; date: string; prop: string; rep: RepKey };
/** A lock to take: `from` is the rep this action saw holding it (Reassign moves it), or null. */
type Take = LockDoc & { from: RepKey | null };
/** Today's property locks implied by the lists in memory: "date:property" -> rep. */
function locksOfLists(): Record<string, RepKey> {
  const out: Record<string, RepKey> = {};
  for (const r of Object.keys(DAY) as RepKey[]) for (const k of DAY[r].list) { const c = C(k); if (c) out[`${TODAY}:${c.prop}`] = r; }
  return out;
}

/** Loads the database into the domain at the user's local time (`now`, 'YYYY-MM-DDTHH:MM'), runs
 * `act` and returns its result with the changes to write. If `act` throws, nothing is written. */
export async function runDomain<T>(db: Db, now: string, act: (snap: Snapshot) => T) {
  const snap = await readSnapshot(db);
  const at = D(now)!;
  setToday(at); setClock(at);
  try {
    fromDocs(snap);
    const held = await db.collection<LockDoc>('property_locks').find({ date: TODAY }).toArray();
    setLocks(Object.fromEntries(held.map(l => [l.prop, l.rep])));
    const before = hashes(toDocs()), locks0 = locksOfLists();
    const out = act(snap);
    const after = hashes(toDocs()), locks1 = locksOfLists();
    const changes: Changes = {};
    for (const n of COLLECTIONS) {
      const ops: AnyBulkWriteOperation<Doc>[] = [];
      for (const [id, h] of after[n]) if (before[n].get(id) !== h) { const d = JSON.parse(h) as Doc; ops.push({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } }); }
      for (const [id] of before[n]) if (!after[n].has(id)) ops.push({ deleteOne: { filter: { _id: JSON.parse(before[n].get(id)!)._id } } });
      if (ops.length) changes[n] = ops;
    }
    const take: Take[] = Object.entries(locks1).filter(([k, r]) => locks0[k] !== r).map(([k, r]) => ({ _id: k, date: TODAY, prop: k.slice(TODAY.length + 1), rep: r, from: locks0[k] ?? null }));
    const free = Object.entries(locks0).filter(([k]) => !(k in locks1)).map(([k, r]) => ({ _id: k, rep: r }));
    return { out, changes, take, free };
  } finally { setClock(null); setLocks({}); }
}

/** Writes the changes and the property locks in one transaction. */
async function commit(db: Db, x: { changes: Changes; take: Take[]; free: { _id: string; rep: RepKey }[] }) {
  const session: ClientSession = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      const locks = db.collection<LockDoc>('property_locks');
      for (const l of x.free) await locks.deleteOne({ _id: l._id, rep: l.rep }, { session });
      for (const { from, ...l } of x.take) {
        const cur = await locks.findOne({ _id: l._id }, { session });
        if (!cur) {
          try { await locks.insertOne(l, { session }); } catch (e) { if (e instanceof MongoServerError && e.code === 11000) throw new LockConflict(l._id); throw e; }
        } else if (cur.rep !== l.rep) {
          // Only the action that saw the property in that rep's list may move it (Reassign)
          if (cur.rep !== from) throw new LockConflict(l._id);
          const r = await locks.updateOne({ _id: l._id, rep: cur.rep }, { $set: { rep: l.rep } }, { session });
          if (!r.modifiedCount) throw new LockConflict(l._id);
        }
      }
      for (const [n, ops] of Object.entries(x.changes)) if (ops?.length) await db.collection<Doc>(n).bulkWrite(ops, { ordered: true, session });
    });
  } finally { await session.endSession(); }
}

/** Runs `act` in the lock and writes what it changed, with its property locks, atomically. */
export const withState = <T>(db: Db, now: string, act: (snap: Snapshot) => T) =>
  locked(async () => {
    for (let i = 0; ; i++) {
      const r = await runDomain(db, now, act);
      try { await commit(db, r); return r.out; }
      catch (e) { if (e instanceof LockConflict && i < 3) continue; if (e instanceof LockConflict) throw new HttpError(409, 'Another rep took that property. Try again'); throw e; }
    }
  });
