/* ===== PROPERTIES AND CONTACTS ===== (artifact/app.html)
 * Collections, factories and lookups. The records are mutable on purpose, as in the artifact:
 * the engine and the actions update them in place and the store re-renders after each action.
 * The seeded content is built in world.ts (artifact order); the app loads it from MongoDB (snapshot.ts).
 */
import { AUDS, type AudKey } from './catalogs';
import { T0, addDays, iso, p2, getClock, isoT } from './dates';
import type { PersonKey, RepKey } from './people';
import { pick, rint } from './seed';

export type PhoneSt = 'untested' | 'ok' | 'bad';
export type Phone = { n: string; st: PhoneSt };
export type Property = {
  k: string; aud: AudKey; addr: string; permit: string; permitDate?: string; started: string;
  lot: number; prior: number; built: number; since: number; src: string;
  inPipe: string | null; lead: string | null; ext: null;
};
export type Contact = {
  k: string; prop: string; n: string; role: string; other?: string;
  phones: Phone[]; email: string; out: string | null; lastAt: string | null; nextAt: string | null;
  att: number; rep: PersonKey | null; dnc: boolean; supp: boolean;
  stop: { why: string; by: string | null } | null;
  res: { rep: RepKey; date: string } | null;
  note: string;
  callPh?: number | null; calling?: string | false;
};
export type Call = { id: number; ct: string; rep: PersonKey; at: string; out: string; note: string; ph: string; live?: boolean; fx?: string[] };
export type Lead = { k: string; prop: string; ct: string; rep: PersonKey; at: string; out: string; note: string; src: string; fresh?: boolean };
export type SyncEntry = { at: string; board: string; item: string; what: string };

export const FN = ['James', 'Linda', 'Robert', 'Patricia', 'Michael', 'Jennifer', 'David', 'Susan', 'Richard', 'Karen', 'Thomas', 'Nancy', 'Steven', 'Lisa', 'Kevin', 'Michelle', 'Brian', 'Sarah', 'Jason', 'Rebecca', 'Eric', 'Laura', 'Daniel', 'Amy', 'Mark', 'Angela', 'Paul', 'Christine', 'Andrew', 'Diane', 'Carlos', 'Elena', 'Hiroshi', 'Mei', 'Arman', 'Lena', 'Omar', 'Sophia', 'Victor', 'Grace', 'Samuel', 'Naomi', 'Ian', 'Claire', 'Felix', 'Nora', 'Raymond', 'Teresa'];
export const LN = ['Navarro', 'Delgado', 'Fischer', 'Hart', 'Monroe', 'Castillo', 'Nguyen', 'Abernathy', 'Lindqvist', 'Romero', 'Becker', 'Ashford', 'Kaplan', 'Morales', 'Tanaka', 'Sinclair', 'Ortega', 'Hollis', 'Prescott', 'Ellison', 'Moreau', 'Chandler', 'Quinlan', 'Reyes', 'Mercer', 'Foley', 'Yamada', 'Garrison', 'Pierce'];
export const OTHER_ROLES = ['Adult child', 'Trustee', 'Property manager', 'Attorney'];

export const PROPS: Property[] = [];
export const CTS: Contact[] = [];
export const CALLS: Call[] = [];
export const LEADS: Lead[] = [];
export const SYNC: SyncEntry[] = [];
/** PSEQ, CSEQ, CALLSEQ and LSEQ of the artifact. */
export const SEQ0 = { prop: 1001, ct: 5001, call: 90001, lead: 2020 };
export const SEQ = { ...SEQ0 };
const usedPh = new Set<string>();
/** Empties every collection (before building the seeded world or loading the database). */
export function resetData() {
  PROPS.length = 0; CTS.length = 0; CALLS.length = 0; LEADS.length = 0; SYNC.length = 0;
  Object.assign(SEQ, SEQ0); usedPh.clear();
}

export function mkPhone(aud: AudKey) {
  let n: string;
  do { n = `(${pick(AUDS[aud].ac)}) 555-${p2(rint(1, 99))}${p2(rint(0, 99))}`; } while (usedPh.has(n));
  usedPh.add(n); return n;
}
/** Defaults are always evaluated (and draw from the seed) before the overrides, as in the artifact. */
export function mkProp(aud: AudKey, o: Partial<Property> = {}) {
  const A = AUDS[aud];
  const p: Property = Object.assign({
    k: 'P-' + (SEQ.prop++), aud,
    addr: `${rint(1, 39) * 100 + rint(0, 99)} ${pick(A.streets)}`,
    permit: pick(['None', 'None', 'None', 'Plans Submitted', 'Plans Submitted', 'Permit Issued']),
    started: 'No', lot: rint(55, 140) * 100, prior: rint(18, 52) * 100, built: rint(1952, 1998),
    since: rint(1988, 2019), src: 'PropertyRadar', inPipe: null, lead: null, ext: null,
  }, o);
  if (!p.permitDate && p.permit === 'Plans Submitted') p.permitDate = iso(addDays(T0, -rint(20, 260)));
  if (!p.permitDate && p.permit === 'Permit Issued') p.permitDate = iso(addDays(T0, -rint(10, 200)));
  PROPS.push(p); return p;
}
export function mkCt(p: Property, o: Partial<Contact> = {}) {
  const c: Contact = Object.assign({
    k: 'C-' + (SEQ.ct++), prop: p.k, n: pick(FN) + ' ' + pick(LN), role: 'Primary owner',
    phones: [{ n: mkPhone(p.aud), st: 'untested' as PhoneSt }], email: '', out: null, lastAt: null, nextAt: null,
    att: 0, rep: null, dnc: false, supp: false, stop: null, res: null, note: '',
  }, o);
  if (!c.email) c.email = c.n.toLowerCase().replace(/[^a-z ]/g, '').split(' ').join('.') + pick(['@gmail.com', '@icloud.com', '@outlook.com', '@yahoo.com']);
  CTS.push(c); return c;
}
export const P = (k: string) => PROPS.find(p => p.k === k)!;
export const C = (k: string) => CTS.find(c => c.k === k)!;
export const ctsOf = (pk: string) => CTS.filter(c => c.prop === pk);
export const ctByName = (n: string) => CTS.find(c => c.n === n)!;
export const fullAddr = (p: Property) => `${p.addr}, ${AUDS[p.aud].city}`;

export function syncLog(board: string, item: string, what: string) { SYNC.unshift({ at: isoT(getClock()), board, item, what }); }
