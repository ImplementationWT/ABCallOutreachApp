import 'server-only';
/* Allocation on the server, one at a time (POST /api/allocate).
 * The engine is the same as in the browser (lib/domain), but here it runs on the database's current
 * state, inside a lock: two reps asking for more at the same moment, or two browsers opening the day
 * together, are served one after the other, and the second one sees the first one's reservations.
 * So a contact is never in two lists. Only the documents the allocation changed are written. */
import type { AnyBulkWriteOperation, Db } from 'mongodb';
import { COLLECTIONS, D, TODAY, fromDocs, requestMore, setClock, setToday, startAlloc, startNewDay, toDocs, type CollectionName, type Doc, type RepKey, type Snapshot } from '@/lib/domain';

let queue: Promise<unknown> = Promise.resolve();
/** Runs `fn` after every allocation already queued (the domain is module state: one at a time). */
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

const hashes = (s: Snapshot) => Object.fromEntries(COLLECTIONS.map(n => [n, new Map(s[n].map(d => [String(d._id), JSON.stringify(d)]))])) as Record<CollectionName, Map<string, string>>;

/** Loads the database into the domain at the rep's local time, runs `act`, writes what changed. */
async function withState<T>(db: Db, now: string, act: (snap: Snapshot) => T) {
  const snap = Object.fromEntries(await Promise.all(COLLECTIONS.map(async n => [n, await db.collection<Doc>(n).find({}).toArray()] as const))) as Snapshot;
  const at = D(now)!;
  setToday(at); setClock(at);
  try {
    fromDocs(snap);
    const before = hashes(toDocs());
    const out = act(snap);
    const after = hashes(toDocs());
    for (const n of COLLECTIONS) {
      const ops: AnyBulkWriteOperation<Doc>[] = [];
      for (const [id, h] of after[n]) if (before[n].get(id) !== h) { const d = JSON.parse(h) as Doc; ops.push({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } }); }
      for (const [id] of before[n]) if (!after[n].has(id)) ops.push({ deleteOne: { filter: { _id: JSON.parse(before[n].get(id)!)._id } } });
      if (ops.length) await db.collection<Doc>(n).bulkWrite(ops, { ordered: true });
    }
    return out;
  } finally { setClock(null); }
}

/** The first load of a day: the morning allocation, only if nobody ran it yet. */
export const allocateMorning = (db: Db, now: string) => locked(() => withState(db, now, snap => {
  if (snap.workdays.some(w => w.date === TODAY)) return { ran: false };
  startNewDay();
  return { ran: true };
}));

/** Start Workday for a rep: the first batch if their list is empty. */
export const allocateStart = (db: Db, now: string, rep: RepKey) => locked(() => withState(db, now, () => ({ ok: true, n: startAlloc(rep) })));

/** "Request more" for a rep: { ok: false, n } while their list still has contacts without a result. */
export const allocateMore = (db: Db, now: string, rep: RepKey) => locked(() => withState(db, now, () => requestMore(rep)));
