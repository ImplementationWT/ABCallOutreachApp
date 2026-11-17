'use client';
/* The app's link to MongoDB.
 * loadState(): GET /api/state, then fromDocs() fills the domain (until then the views show "Loading").
 * After that, every state change (each bump of the store) runs a diff of toDocs() against what the
 * database already has and POSTs only the documents that changed or disappeared. Writes go one at
 * a time, in order; a failed write is retried with the next change. */
import { create } from 'zustand';
import { COLLECTIONS, fromDocs, toDocs, type CollectionName, type Doc, type Snapshot } from '@/lib/domain';
import { bump, toast, useRev } from './store';

type Status = 'loading' | 'ready' | 'error';
export const useData = create<{ status: Status; error?: string }>(() => ({ status: 'loading' }));

type Hashes = Record<CollectionName, Map<string | number, string>>;
let saved: Hashes | null = null;
let busy = false, again = false, unsub: (() => void) | null = null;

const hashes = (s: Snapshot): Hashes =>
  Object.fromEntries(COLLECTIONS.map(n => [n, new Map(s[n].map(d => [d._id, JSON.stringify(d)]))])) as Hashes;

export async function loadState() {
  useData.setState({ status: 'loading', error: undefined });
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    const snap = (await res.json()) as Snapshot;
    fromDocs(snap);
    saved = hashes(toDocs());
    useData.setState({ status: 'ready' });
    unsub?.();
    unsub = useRev.subscribe(() => { void persist(); });
    bump();
  } catch (e) {
    useData.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

type Change = { upsert: Doc[]; delete: (string | number)[] };
function diff(now: Hashes): Partial<Record<CollectionName, Change>> | null {
  const out: Partial<Record<CollectionName, Change>> = {};
  let any = false;
  for (const n of COLLECTIONS) {
    const before = saved![n], after = now[n], ch: Change = { upsert: [], delete: [] };
    for (const [id, h] of after) if (before.get(id) !== h) ch.upsert.push(JSON.parse(h));
    for (const id of before.keys()) if (!after.has(id)) ch.delete.push(id);
    if (ch.upsert.length || ch.delete.length) { out[n] = ch; any = true; }
  }
  return any ? out : null;
}

export async function persist() {
  if (!saved) return;
  if (busy) { again = true; return; }
  busy = true;
  try {
    do {
      again = false;
      const now = hashes(toDocs());
      const changes = diff(now);
      if (!changes) break;
      const res = await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes }), keepalive: true });
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
