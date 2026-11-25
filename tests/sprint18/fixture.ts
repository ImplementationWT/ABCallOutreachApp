/* Sprint 18 validation: a small, controlled world for the engine and outcome rules.
 * Built on buildWorld() (so every module is initialised the way the app does it), then the people,
 * properties, campaigns and lists are replaced with the cases below and loaded with fromDocs(),
 * the same path the app uses after GET /api/state. Monday, Nov 2, 2026, 8:20 AM (local time). */
import { buildWorld, fromDocs, toDocs, type ContactDoc, type Doc, type PropertyDoc, type Snapshot } from '../../lib/domain';

export const DAY0 = new Date(2026, 10, 2, 8, 20);
export const TODAY0 = '2026-11-02';
const json = <T,>(x: T) => JSON.parse(JSON.stringify(x)) as T;

export const prop = (id: string, aud: string, o: Partial<PropertyDoc> = {}): PropertyDoc => ({
  _id: id, aud, addr: id + ' Test St', permit: 'None', started: 'No', lot: null, prior: null, built: null, since: null,
  src: 'test', inPipe: null, lead: null, ext: null, ...o,
} as PropertyDoc);
export const ct = (id: string, p: string, o: Partial<ContactDoc> = {}): ContactDoc => ({
  _id: id, prop: p, n: id, role: 'Primary owner', email: '', out: null, lastAt: null, nextAt: null, att: 0, rep: null,
  dnc: false, supp: false, stop: null, note: '', ...o,
} as ContactDoc);

export type Case = { props: PropertyDoc[]; contacts: ContactDoc[]; noPhone?: string[]; campaigns?: Doc[]; reservations?: Doc[]; workdays?: Doc[]; rules?: Record<string, unknown> };

/** Loads the case. No workdays for today unless given: startNewDay() is then the morning run. */
export function load(c: Case): Snapshot {
  buildWorld(DAY0);
  const s = json(toDocs());
  s.properties = c.props;
  s.contacts = c.contacts;
  s.phone_numbers = c.contacts.filter(x => !(c.noPhone || []).includes(x._id)).map((x, i) => ({ _id: `${x._id}#0`, ct: x._id, idx: 0, n: `(310) 555-${String(1000 + i)}`, st: 'untested' }));
  s.campaigns = c.campaigns ?? [{ _id: 'C-T-A', date: TODAY0, auds: ['pp'], reps: ['may', 'dan', 'pri'], goal: 1, pos: 0 }];
  s.reservations = c.reservations ?? [];
  s.workdays = c.workdays ?? [];
  s.call_log = []; s.hand_offs = []; s.sync_log = [];
  if (c.rules) s.rules = [{ ...(s.rules[0] as object), ...c.rules } as Doc];
  fromDocs(json(s));
  return s;
}

/** A started workday for each rep (so tests can work a list without the morning run). */
export const started = (reps = ['may', 'dan', 'pri']) => reps.map(r => ({ _id: `${TODAY0}:${r}`, rep: r, date: TODAY0, st: 'started', startedAt: `${TODAY0}T08:00`, endedAt: null, batches: [] }));
