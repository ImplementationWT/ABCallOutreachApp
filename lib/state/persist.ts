'use client';
/* The app's link to MongoDB.
 * loadState(): GET /api/state, then fromDocs() fills the domain (until then the views show "Loading").
 * On the first load of a day the server runs the morning allocation for today's campaigns (allocate()).
 * After that, every state change (each bump of the store) runs a diff of toDocs() against what the
 * database already has and POSTs only the documents that changed or disappeared. Writes go one at
 * a time, in order; a failed write is retried with the next change. */
import { create } from 'zustand';
import { COLLECTIONS, TODAY, fromDocs, isoT, setToday, toDocs, type CollectionName, type Doc, type RepKey, type Snapshot } from '@/lib/domain';
import { bump, toast, useRev } from './store';
import { getMe } from './auth';
import { isLockedRep } from '@/lib/auth/roles';

type Status = 'loading' | 'ready' | 'error';
export const useData = create<{ status: Status; error?: string }>(() => ({ status: 'loading' }));

type Hashes = Record<CollectionName, Map<string | number, string>>;
let saved: Hashes | null = null;
let busy = false, again = false, unsub: (() => void) | null = null;

const hashes = (s: Snapshot): Hashes =>
  Object.fromEntries(COLLECTIONS.map(n => [n, new Map(s[n].map(d => [d._id, JSON.stringify(d)]))])) as Hashes;

/** quiet: reload the data in place (after an allocation), without the "Loading" screen. */
export async function loadState(quiet = false, morningAsked = false) {
  if (!quiet) useData.setState({ status: 'loading', error: undefined });
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (res.status === 401) { toLogin(); return; }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    const snap = (await res.json()) as Snapshot;
    setToday(new Date());
    // First load of the day: the server allocates (one at a time, so two browsers do not both do it)
    if (!morningAsked && !snap.workdays.some(w => w.date === TODAY)) { await allocate({ kind: 'morning' }); return loadState(quiet, true); }
    fromDocs(snap);
    // What the database has: only ids it sent count as saved, so a new day's documents get written
    const now = hashes(toDocs());
    for (const n of COLLECTIONS) { const ids = new Set(snap[n].map(d => d._id)); for (const id of [...now[n].keys()]) if (!ids.has(id)) now[n].delete(id); }
    saved = now;
    useData.setState({ status: 'ready' });
    unsub?.();
    unsub = useRev.subscribe(() => { void persist(); });
    bump();
  } catch (e) {
    useData.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

/** Asks the server to allocate (POST /api/allocate) after the pending writes are saved. null if it failed. */
export async function allocate(body: { kind: 'morning' } | { kind: 'more' | 'start'; rep: RepKey }): Promise<{ ok?: boolean; n?: number; ran?: boolean } | null> {
  while (busy) await new Promise(r => setTimeout(r, 50));
  await persist();
  try {
    const res = await fetch('/api/allocate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, now: isoT(new Date()) }) });
    if (res.status === 401) { toLogin(); return null; }
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

/** A rep or manager action on the server (POST /api/work), after the pending writes are saved.
 * Returns the answer, or { error } with the server's message. */
export async function work(body: Record<string, unknown>): Promise<Record<string, unknown> & { error?: string }> {
  while (busy) await new Promise(r => setTimeout(r, 50));
  await persist();
  try {
    const res = await fetch('/api/work', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, now: isoT(new Date()) }) });
    if (res.status === 401) { toLogin(); return { error: 'Sign in first' }; }
    const d = await res.json().catch(() => ({}));
    return res.ok ? d : { error: d.error || 'Could not save. Try again' };
  } catch { return { error: 'Could not reach the server. Try again' }; }
}

/** The session expired or was closed: back to the login, then to this same page. */
// eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload on purpose (fresh session and state)
const toLogin = () => { location.href = '/login?next=' + encodeURIComponent(location.pathname); };

type Change = { upsert: Doc[]; delete: (string | number)[] };
function diff(now: Hashes): Partial<Record<CollectionName, Change>> | null {
  const out: Partial<Record<CollectionName, Change>> = {};
  let any = false;
  for (const n of COLLECTIONS) {
    if (SERVER_ONLY.includes(n)) continue;
    const before = saved![n], after = now[n], ch: Change = { upsert: [], delete: [] };
    for (const [id, h] of after) if (before.get(id) !== h) ch.upsert.push(JSON.parse(h));
    for (const id of before.keys()) if (!after.has(id)) ch.delete.push(id);
    if (ch.upsert.length || ch.delete.length) { out[n] = ch; any = true; }
  }
  return any ? out : null;
}

/** Collections the browser never writes: the server actions save them (/api/work, /api/allocate). */
const SERVER_ONLY: CollectionName[] = ['call_log', 'outcomes', 'reservations'];
/** A rep's browser writes nothing here: every rep action is a server action. */
const writesState = () => { const me = getMe(); return !!me && !isLockedRep(me); };

export async function persist() {
  if (!saved || !writesState()) return;
  if (busy) { again = true; return; }
  busy = true;
  try {
    do {
      again = false;
      const now = hashes(toDocs());
      const changes = diff(now);
      if (!changes) break;
      const res = await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes }), keepalive: true });
      if (res.status === 401) { toLogin(); return; }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      saved = now;
    } while (again);
  } catch (e) {
    console.error('Saving to MongoDB failed', e);
    toast('Could not save to the database. It will retry with the next change');
  } finally {
    busy = false;
  }
}
