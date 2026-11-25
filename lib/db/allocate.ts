import 'server-only';
/* Allocation on the server, one at a time (POST /api/allocate).
 * The engine is the same as in the browser (lib/domain), but here it runs on the database's current
 * state, inside a lock (lib/db/server-state.ts): two reps asking for more at the same moment, or two
 * browsers opening the day together, are served one after the other, and the second one sees the
 * first one's reservations. So a contact is never in two lists. */
import type { Db } from 'mongodb';
import { PEO, TODAY, requestMore, startAlloc, startNewDay, syncLog, type RepKey } from '@/lib/domain';
import { withState } from './server-state';

/** The first load of a day: the morning allocation, only if nobody ran it yet. */
export const allocateMorning = (db: Db, now: string) => withState(db, now, snap => {
  if (snap.workdays.some(w => w.date === TODAY)) return { ran: false };
  startNewDay();
  return { ran: true };
});

/** Start Workday for a rep: the first batch if their list is empty. */
export const allocateStart = (db: Db, now: string, rep: RepKey) => withState(db, now, () => {
  const n = startAlloc(rep);
  if (n) syncLog('Fire Rebuild Contacts', 'Start of workday', `${n} contacts reserved for ${PEO[rep].n}`);
  return { ok: true, n };
});

/** "Request more" for a rep: { ok: false, n } while their list still has contacts without a result. */
export const allocateMore = (db: Db, now: string, rep: RepKey) => withState(db, now, () => {
  const r = requestMore(rep);
  if (r.ok && r.n) syncLog('Fire Rebuild Contacts', 'Request more', `${r.n} more contacts reserved for ${PEO[rep].n}`);
  return r;
});
