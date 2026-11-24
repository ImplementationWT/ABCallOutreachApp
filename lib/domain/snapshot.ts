/* The domain as MongoDB documents, and back.
 *
 * toDocs() turns the in-memory state (the artifact's arrays and objects) into one array of documents
 * per collection; fromDocs() rebuilds the in-memory state from them. The seed script writes
 * toDocs(buildWorld()), the app loads fromDocs(GET /api/state) and, after each action, sends back
 * only the documents whose content changed (lib/state/persist.ts).
 * Pure: no driver, no DOM.
 */
import { CAMPS, resetCampaigns, type Campaign } from './campaigns';
import { OUT, OUTK, setOutcomes, type OutcomeDoc } from './catalogs';
import { C, CALLS, CTS, LEADS, PROPS, SEQ, SLOT_KEYS, SYNC, resetData, type Call, type Contact, type Lead, type Phone, type PhoneSt, type Property, type SlotState, type SyncEntry } from './data';
import { TODAY } from './dates';
import { DAY, resetDays, type DayState } from './engine';
import { DAYM, resetDaym } from './metrics';
import { PEO, type Person, type PersonKey, type RepKey } from './people';
import { CFG, resetRules, type Config } from './rules';

export const COLLECTIONS = [
  'properties', 'contacts', 'phone_numbers', 'campaigns', 'reservations', 'workdays', 'call_log',
  'hand_offs', 'reps', 'rules', 'daily_metrics', 'sync_log', 'app_meta', 'outcomes',
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];
export type Doc = { _id: string | number; [k: string]: unknown };
export type Snapshot = Record<CollectionName, Doc[]>;

/* ----- Document shapes ----- */
export type PropertyDoc = Omit<Property, 'k'> & { _id: string };
/** `pst`: the outreach state of the owner's other properties (`props` after the first), by property. */
export type ContactDoc = Omit<Contact, 'k' | 'phones' | 'res' | 'base'> & { _id: string; pst?: Record<string, SlotState> };
const SLOT0: SlotState = { out: null, lastAt: null, nextAt: null, att: 0, rep: null, stop: null, note: '', fuAt: null, react: null };
export type PhoneDoc = { _id: string; ct: string; idx: number; n: string; st: PhoneSt };
export type CampaignDoc = Omit<Campaign, 'k'> & { _id: string; pos: number };
/** One contact reserved for one rep on one day (the rep's list, in order, and whether it was documented). */
export type ReservationDoc = { _id: string; ct: string; rep: RepKey; date: string; order: number; done: number | null };
/** A rep's workday: status, start and end, and the batches received. */
export type WorkdayDoc = { _id: string; rep: RepKey; date: string; st: DayState['st']; startedAt: string | null; endedAt: string | null; batches: DayState['batches'] };
export type CallDoc = Omit<Call, 'id'> & { _id: number };
export type HandOffDoc = Omit<Lead, 'k'> & { _id: string; pos: number };
export type RepDoc = Person & { _id: PersonKey };
export type RulesDoc = Config & { _id: 'default' };
export type MetricDoc = { _id: string; day: string; rep: RepKey; calls: number; con: number; conv: number; leads: number };
/** _id counts from the oldest entry, so it stays the same when newer entries are added on top. */
export type SyncDoc = SyncEntry & { _id: number };
export type MetaDoc = { _id: 'state'; seq: typeof SEQ };

const clean = <T extends object>(o: T) => JSON.parse(JSON.stringify(o)) as T;

export function toDocs(): Snapshot {
  const reservations: ReservationDoc[] = [];
  const workdays: WorkdayDoc[] = [];
  for (const r of Object.keys(DAY) as RepKey[]) {
    const d = DAY[r];
    d.list.forEach((ct, order) => reservations.push({ _id: `${TODAY}:${ct}`, ct, rep: r, date: TODAY, order, done: d.done[ct] ?? null }));
    workdays.push({ _id: `${TODAY}:${r}`, rep: r, date: TODAY, st: d.st, startedAt: d.startedAt ?? null, endedAt: d.endedAt ?? null, batches: d.batches });
  }
  const metrics: MetricDoc[] = [];
  for (const day of Object.keys(DAYM)) for (const r of Object.keys(DAYM[day]) as RepKey[]) metrics.push({ _id: `${day}:${r}`, day, rep: r, ...DAYM[day][r] });
  // The slots of an owner go back into their one document: their state by property in `pst`
  const pst: Record<string, Record<string, SlotState>> = {};
  for (const c of CTS) if (c.base) (pst[c.base] ||= {})[c.prop] = Object.fromEntries(SLOT_KEYS.map(k => [k, c[k]])) as SlotState;
  const people = CTS.filter(c => !c.base);
  return clean({
    properties: PROPS.map(({ k, ...p }) => ({ _id: k, ...p })),
    contacts: people.map(c => {
      const d: Record<string, unknown> = { _id: c.k, ...c };
      delete d.k; delete d.phones; delete d.res; delete d.base;
      if (pst[c.k]) d.pst = pst[c.k];
      return d;
    }),
    phone_numbers: people.flatMap(c => c.phones.map((p, idx): PhoneDoc => ({ _id: `${c.k}#${idx}`, ct: c.k, idx, n: p.n, st: p.st }))),
    campaigns: CAMPS.map(({ k, ...c }, pos) => ({ _id: k, ...c, pos })),
    reservations,
    workdays,
    call_log: CALLS.map(({ id, ...c }) => ({ _id: id, ...c })),
    hand_offs: LEADS.map(({ k, ...l }, pos) => ({ _id: k, ...l, pos })),
    reps: (Object.keys(PEO) as PersonKey[]).map(k => ({ _id: k, ...PEO[k] })),
    rules: [{ _id: 'default', ...CFG }],
    daily_metrics: metrics,
    sync_log: SYNC.map((s, i) => ({ _id: SYNC.length - 1 - i, ...s })),
    app_meta: [{ _id: 'state', seq: { ...SEQ } }],
    outcomes: OUTK.map((k, pos) => ({ _id: k, ...OUT[k], pos })),
  } as unknown as Snapshot);
}

const byNum = (k: string) => Number(k.replace(/\D/g, ''));
const strip = <T extends Doc>(d: T, ...keys: string[]) => { const o: Record<string, unknown> = { ...d }; delete o._id; for (const k of keys) delete o[k]; return o; };

/** Replaces the whole in-memory state with the documents of a snapshot. */
export function fromDocs(s: Snapshot) {
  setOutcomes(((s.outcomes ?? []) as OutcomeDoc[]).slice().sort((a, b) => a.pos - b.pos).map(d => [d._id, strip(d, 'pos') as unknown as OutcomeDoc]));
  resetData(); resetDays(); resetCampaigns(); resetRules(); resetDaym();
  const phones: Record<string, Phone[]> = {};
  for (const p of (s.phone_numbers as PhoneDoc[]).slice().sort((a, b) => a.idx - b.idx)) (phones[p.ct] ||= []).push({ n: p.n, st: p.st });
  for (const d of (s.properties as PropertyDoc[]).slice().sort((a, b) => byNum(a._id) - byNum(b._id))) PROPS.push({ k: d._id, ...strip(d) } as Property);
  for (const d of (s.contacts as ContactDoc[]).slice().sort((a, b) => byNum(a._id) - byNum(b._id))) {
    const c = { k: d._id, ...strip(d, 'pst'), phones: phones[d._id] || [], res: null } as Contact;
    CTS.push(c);
    // One slot per other property of the same owner: same person (and the same phones array), own state
    for (const pk of c.props || []) if (pk !== c.prop) CTS.push({ ...c, ...SLOT0, ...d.pst?.[pk], k: `${d._id}@${pk}`, prop: pk, base: d._id, res: null });
  }
  CAMPS.length = 0;
  for (const d of (s.campaigns as CampaignDoc[]).slice().sort((a, b) => a.pos - b.pos)) CAMPS.push({ k: d._id, ...strip(d, 'pos') } as Campaign);
  for (const d of (s.call_log as CallDoc[]).slice().sort((a, b) => a._id - b._id)) CALLS.push({ id: d._id, ...strip(d) } as Call);
  for (const d of (s.hand_offs as HandOffDoc[]).slice().sort((a, b) => a.pos - b.pos)) LEADS.push({ k: d._id, ...strip(d, 'pos') } as Lead);
  for (const d of (s.sync_log as SyncDoc[]).slice().sort((a, b) => b._id - a._id)) SYNC.push(strip(d) as SyncEntry);
  for (const d of s.reps as RepDoc[]) PEO[d._id] = strip(d) as Person;
  const rules = (s.rules as RulesDoc[])[0];
  if (rules) { for (const k of Object.keys(CFG)) delete CFG[k]; Object.assign(CFG, strip(rules)); }
  for (const d of s.daily_metrics as MetricDoc[]) (DAYM[d.day] ||= {} as (typeof DAYM)[string])[d.rep] = { calls: d.calls, con: d.con, conv: d.conv, leads: d.leads };
  // Today's workdays and reservations rebuild DAY and the contacts' `res`
  for (const w of (s.workdays as WorkdayDoc[]).filter(w => w.date === TODAY)) {
    const d = DAY[w.rep];
    d.st = w.st; d.batches = w.batches;
    if (w.startedAt) d.startedAt = w.startedAt;
    if (w.endedAt) d.endedAt = w.endedAt;
  }
  for (const r of (s.reservations as ReservationDoc[]).filter(r => r.date === TODAY).sort((a, b) => a.order - b.order)) {
    DAY[r.rep].list.push(r.ct);
    if (r.done != null) DAY[r.rep].done[r.ct] = r.done;
    const c = C(r.ct);
    if (c) c.res = { rep: r.rep, date: r.date };
  }
  const meta = (s.app_meta as MetaDoc[]).find(m => m._id === 'state');
  if (meta) Object.assign(SEQ, meta.seq);
}

