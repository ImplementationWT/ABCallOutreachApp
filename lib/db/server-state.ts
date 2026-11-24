import 'server-only';
/* The domain run on the server, on the database's current state, one action at a time.
 * Every write of a rep (allocation, saving a result, starting and ending the day) and the manager's
 * Reassign go through here (lib/db/allocate.ts, lib/db/work.ts): the action is validated against
 * what the database really has, and only the documents it changed are written. */
import type { AnyBulkWriteOperation, Db } from 'mongodb';
import { COLLECTIONS, D, fromDocs, setClock, setToday, toDocs, type CollectionName, type Doc, type Snapshot } from '@/lib/domain';

/** The browser's local time, sent with every action: 'YYYY-MM-DDTHH:MM'. */
export const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** An expected refusal (validation, permission): the route answers with this status and message. */
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

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

/** Loads the database into the domain at the user's local time (`now`, 'YYYY-MM-DDTHH:MM'), runs
 * `act` and returns its result with the changes to write. If `act` throws, nothing is written. */
export async function runDomain<T>(db: Db, now: string, act: (snap: Snapshot) => T): Promise<{ out: T; changes: Changes }> {
  const snap = await readSnapshot(db);
  const at = D(now)!;
  setToday(at); setClock(at);
  try {
    fromDocs(snap);
    const before = hashes(toDocs());
    const out = act(snap);
    const after = hashes(toDocs());
    const changes: Changes = {};
    for (const n of COLLECTIONS) {
      const ops: AnyBulkWriteOperation<Doc>[] = [];
      for (const [id, h] of after[n]) if (before[n].get(id) !== h) { const d = JSON.parse(h) as Doc; ops.push({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } }); }
      for (const [id] of before[n]) if (!after[n].has(id)) ops.push({ deleteOne: { filter: { _id: JSON.parse(before[n].get(id)!)._id } } });
      if (ops.length) changes[n] = ops;
    }
    return { out, changes };
  } finally { setClock(null); }
}

export async function writeChanges(db: Db, changes: Changes) {
  for (const [n, ops] of Object.entries(changes)) if (ops?.length) await db.collection<Doc>(n).bulkWrite(ops, { ordered: true });
}

/** Runs `act` in the lock and writes what it changed. */
export const withState = <T>(db: Db, now: string, act: (snap: Snapshot) => T) =>
  locked(async () => { const { out, changes } = await runDomain(db, now, act); await writeChanges(db, changes); return out; });
