import 'server-only';
/* The rep's writes, on the server (POST /api/work): save a call result, end and reopen the workday,
 * and the manager's Reassign. Each one is checked against the database (the contact must be in that
 * rep's list today) and runs in the same lock as the allocation (lib/db/server-state.ts). */
import type { Db } from 'mongodb';
import { C, CALLS, DAY, OUT, PEO, PRANK, TODAY, ctsOf, endDay, openOf, ownerOf, priOf, saveOutcome, syncLog, type RepKey } from '@/lib/domain';
import { HttpError, withState } from './server-state';

export type SaveInput = { ct: string; out: string; note?: string; fu?: string | null; key?: string };
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Saves the result of a call on a contact of the rep's list today. Checks, in this order: the
 * contact is in the rep's list; the result is an active outcome of the catalog; the follow-up date
 * and time when the outcome needs one, and never in the past; and the same save (same key) is not
 * written twice (a double click or a retry answers with the first one). */
export const saveResult = (db: Db, now: string, rep: RepKey, x: SaveInput) => withState(db, now, () => {
  const c = C(x.ct);
  if (!c) throw new HttpError(404, 'Contact not found');
  if (!DAY[rep].list.includes(c.k)) throw new HttpError(403, 'This contact is not in your list today');
  if (x.key) { const dup = CALLS.find(k => k.key === x.key); if (dup) return { ok: true, call: dup.id, dup: true }; }
  if (!x.out) throw new HttpError(400, 'Pick a result');
  const d = OUT[x.out];
  if (!d || !d.active) throw new HttpError(400, 'Pick a result from the list');
  let fu: string | null = null;
  if (d.needsFollowUp) {
    if (!x.fu || !DATE_TIME.test(x.fu)) throw new HttpError(400, 'Pick the date and time of the follow-up');
    if (x.fu <= now.slice(0, 16)) throw new HttpError(400, 'The follow-up must be later than now');
    fu = x.fu;
  }
  const fx = saveOutcome(c.k, rep, x.out, String(x.note ?? ''), fu);
  const call = CALLS[CALLS.length - 1];
  call.fx = fx;
  if (x.key) call.key = x.key.slice(0, 64);
  return { ok: true, call: call.id };
});

/** End Workday: what was not called goes back to the pool (rules: endDay). */
export const endWorkday = (db: Db, now: string, rep: RepKey) => withState(db, now, () => ({ ok: true, n: endDay(rep) }));

/** "Back to my list" after ending the day. */
export const reopenWorkday = (db: Db, now: string, rep: RepKey) => withState(db, now, () => {
  if (DAY[rep].st !== 'ended') throw new HttpError(409, 'The workday is not ended');
  DAY[rep].st = 'started';
  return { ok: true };
});

/** Reassign: up to `n` contacts not called yet move from one rep to another, with their whole property. */
export const reassign = (db: Db, now: string, from: RepKey, to: RepKey, n: number) => withState(db, now, () => {
  if (from === to) throw new HttpError(400, 'Pick another rep');
  const open = openOf(from).filter(c => ownerOf(c) !== from).sort((a, b) => PRANK[priOf(b)] - PRANK[priOf(a)]);
  let moved = 0;
  for (const c of open) {
    if (moved >= n) break;
    if (!DAY[from].list.includes(c.k)) continue;
    const sib = ctsOf(c.prop).filter(x => DAY[from].list.includes(x.k) && !DAY[from].done[x.k]);
    sib.forEach(x => { DAY[from].list = DAY[from].list.filter(k => k !== x.k); x.res = { rep: to, date: TODAY }; DAY[to].list.push(x.k); moved++; });
  }
  syncLog('Fire Rebuild Contacts', 'Reassign', `${moved} contacts moved from ${PEO[from].n} to ${PEO[to].n}`);
  return { ok: true, n: moved };
});
