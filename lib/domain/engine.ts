/* ===== ASSIGNMENT ENGINE ===== (artifact/app.html)
 * Also holds pastCall/nextFor (from PROPERTIES AND CONTACTS), effectsOf/saveOutcome and dupCheck
 * (from OUTREACH MANAGER), so the domain has no DOM and no import cycles.
 */
import { campOf } from './campaigns';
import { LEAD_OUT, NO_OUT, OUT, PRANK, ST_RANK, type Pri, type Status } from './catalogs';
import { C, CALLS, CTS, LEADS, P, SEQ, ctsOf, syncLog, type Call, type Contact, type Property } from './data';
import { Dx, T0, TODAY, addBiz, addDays, fmtD, fmtS, fmtT, fmtWD, iso, isoT, nextBiz, nowT } from './dates';
import { PEO, REPS, type PersonKey, type RepKey } from './people';
import { CFG, demoN } from './rules';

/* Past call: writes the log and the contact state */
export function pastCall(c: Contact, rep: PersonKey, at: string, out: string, note = '') {
  const ph = c.phones.find(x => x.st !== 'bad') || c.phones[0];
  if (OUT[out].g !== 'none') ph.st = 'ok';
  CALLS.push({ id: SEQ.call++, ct: c.k, rep, at, out, note, ph: ph.n });
  c.att++; c.out = out; c.lastAt = at; c.rep = c.rep || rep; c.note = note;
  c.nextAt = nextFor(out, at, c);
}
export function nextFor(out: string, at: string, c?: Pick<Contact, 'phones'>, fu?: string | null): string | null {
  if (out === 'Follow Up') return fu || iso(addBiz(at, 2));
  if (LEAD_OUT.includes(out) || out === 'Already Building / Done' || out === 'Do Not Contact') return null;
  if (out === 'Wrong Number') return c && c.phones.some(x => x.st !== 'bad') ? iso(nextBiz(at)) : null;
  if (out === 'Not Interested') return iso(addDays(at, CFG.rc['Not Interested']));
  if (out === 'Undecided') return iso(addDays(at, CFG.rc.Undecided));
  return iso(addBiz(at, CFG.rc[out] || 1));
}
export const pastAt = (daysAgo: number, h = 10, m = 15) => { const d = addDays(T0, -daysAgo); d.setHours(h, m); return isoT(d); };

export type DayState = {
  st: 'reserved' | 'started' | 'ended' | 'off';
  list: string[]; done: Record<string, number>;
  batches: { at: string; n: number; k: string }[];
  startedAt?: string; endedAt?: string;
};
export const DAY: Record<RepKey, DayState> = {
  may: { st: 'reserved', list: [], done: {}, batches: [] },
  dan: { st: 'reserved', list: [], done: {}, batches: [] },
  pri: { st: 'reserved', list: [], done: {}, batches: [] },
};
/** Every rep back to a reserved, empty day. */
export function resetDays() {
  for (const r of Object.keys(DAY) as RepKey[]) DAY[r] = { st: 'reserved', list: [], done: {}, batches: [] };
}
export const callable = (c: Contact) => c.phones.some(x => x.st !== 'bad');
export const isFinal = (c: Contact) => c.out === 'Already Building / Done' || c.out === 'Do Not Contact';
export function priOf(c: Contact): Pri {
  const p = P(c.prop);
  if (c.out === 'Follow Up') return 'P1';
  if (p.permit === 'Permit Issued') return 'P2';
  if (c.out === 'Undecided') return 'P3';
  if (c.out === 'Left VM') return 'P4';
  return 'P5';
}
export type Elig = { ok: boolean; k: string; why: string; tone: string; pri?: Pri };
/* The eligibility rules from Andrew's design, checked in order */
export function elig(c: Contact, ignoreRes?: boolean): Elig {
  const p = P(c.prop);
  if (p.lead) return { ok: false, k: 'lead', why: 'Handed to sales (Potential Lead)', tone: 'green' };
  if (c.dnc) return { ok: false, k: 'dnc', why: 'On the Do Not Call list', tone: 'red' };
  if (c.supp) return { ok: false, k: 'dnc', why: 'On AB’s suppression list', tone: 'red' };
  if (p.inPipe) return { ok: false, k: 'pipe', why: 'Already in AB’s sales pipeline: ' + p.inPipe, tone: 'blue' };
  if (isFinal(c)) return { ok: false, k: 'closed', why: 'Closed: ' + c.out, tone: 'red' };
  if (c.stop) return { ok: false, k: 'stop', why: 'Removed: ' + c.stop.why, tone: 'red' };
  if (c.out === 'Not Interested' && c.nextAt! > TODAY) return { ok: false, k: 'stop', why: 'Not Interested, can be called again ' + fmtD(c.nextAt), tone: 'red' };
  if (!callable(c)) return { ok: false, k: 'hold', why: 'On hold: needs a new number', tone: 'amber' };
  if (c.att >= CFG.maxAtt) return { ok: false, k: 'max', why: `Max attempts reached (${c.att})`, tone: '' };
  if (c.nextAt && c.nextAt > TODAY) return { ok: false, k: 'due', why: 'Not due until ' + fmtWD(c.nextAt), tone: '' };
  if (!ignoreRes && c.res && c.res.date === TODAY) return { ok: true, k: 'res', why: 'Reserved for ' + PEO[c.res.rep].n + ' today', tone: 'blue', pri: priOf(c) };
  return { ok: true, k: 'pool', why: 'Eligible today', tone: 'green', pri: priOf(c) };
}
export function propStatus(p: Property): Status {
  if (p.lead) return 'Potential Lead';
  let best: Status = 'Not Contacted';
  for (const c of ctsOf(p.k)) {
    const s = c.out ? OUT[c.out].st : 'Not Contacted';
    if (ST_RANK[s] > ST_RANK[best]) best = s;
  }
  return best;
}
type Group = { p: Property; cs: Contact[]; own: PersonKey | null; best: number };
/* Within a priority, the property that waited longest goes first (never called counts as oldest) */
const waited = (g: Group) => Math.min(...g.cs.map(c => c.lastAt ? Dx(c.lastAt).getTime() : 0));
export const ownerOf = (c: Contact) => (priOf(c) === 'P1' || priOf(c) === 'P3') && c.rep ? c.rep : null;
/* Free groups (one property, all its eligible contacts) a rep can take */
export function freeGroups(rep: RepKey) {
  const cp = campOf(rep);
  const gs: Record<string, Group> = {};
  for (const c of CTS) {
    const e = elig(c);
    if (!e.ok || e.k === 'res') continue;
    const p = P(c.prop);
    const own = ownerOf(c);
    const inAud = cp && cp.auds.includes(p.aud);
    if (!(inAud || own === rep)) continue;
    const g = gs[p.k] || (gs[p.k] = { p, cs: [], own: null, best: 9 });
    g.cs.push(c);
    if (own) g.own = own;
    g.best = Math.min(g.best, PRANK[e.pri!]);
  }
  /* If a sibling is reserved already, the property stays with that rep */
  return Object.values(gs).filter(g => {
    const r = ctsOf(g.p.k).find(c => c.res && c.res.date === TODAY);
    return !r || r.res!.rep === rep;
  }).filter(g => !g.own || g.own === rep || DAY[g.own as RepKey].st === 'off')
    .sort((a, b) => a.best - b.best || waited(a) - waited(b) || a.p.k.localeCompare(b.p.k));
}
export function reserve(g: Group, rep: RepKey) {
  const d = DAY[rep];
  for (const c of g.cs) { c.res = { rep, date: TODAY }; if (!d.list.includes(c.k)) d.list.push(c.k); }
}
export const load = (rep: RepKey) => DAY[rep].list.length;
/* Morning allocation: owned follow-ups first, then the rest to whoever has the lowest load */
export function morningAlloc() {
  const reps = REPS.filter(r => DAY[r].st !== 'off' && campOf(r));
  const cap = demoN(CFG.first);
  for (const r of reps) for (const g of freeGroups(r).filter(g => g.own === r)) if (load(r) < cap) reserve(g, r);
  const full = new Set<RepKey>();
  let guard = 0;
  while (guard++ < 600) {
    const open = reps.filter(r => load(r) < cap && !full.has(r)).sort((a, b) => load(a) - load(b) || reps.indexOf(a) - reps.indexOf(b));
    if (!open.length) break;
    const r = open[0];
    const g = freeGroups(r).find(x => !x.own);
    if (!g) { full.add(r); continue; }
    reserve(g, r);
  }
  for (const r of REPS) DAY[r].batches.push({ at: '7:00 AM', n: DAY[r].list.length, k: 'Morning allocation' });
}
/** A day with no workdays yet (the first load of the day): the morning allocation for today's campaigns. */
export function startNewDay() {
  resetDays();
  morningAlloc();
}
export const listOf = (rep: RepKey) => DAY[rep].list.map(C);
export const openOf = (rep: RepKey) => listOf(rep).filter(c => !DAY[rep].done[c.k] && !c.stop && !P(c.prop).lead);
export const docOf = (rep: RepKey) => listOf(rep).filter(c => DAY[rep].done[c.k]);
export function requestMore(rep: RepKey) {
  const left = openOf(rep).length;
  if (left) return { ok: false, n: left };
  const want = demoN(CFG.more);
  let got = 0;
  for (const g of freeGroups(rep)) { if (got >= want) break; reserve(g, rep); got += g.cs.length; }
  DAY[rep].batches.push({ at: fmtT(nowT()), n: got, k: 'Requested more' });
  return { ok: true, n: got };
}
export function startDay(rep: RepKey) {
  const d = DAY[rep];
  if (d.st === 'started') return;
  d.st = 'started'; d.startedAt = isoT(nowT());
}
export function endDay(rep: RepKey) {
  const d = DAY[rep];
  const left = openOf(rep);
  if (CFG.endDay === 'pool') left.forEach(c => { c.res = null; d.list = d.list.filter(k => k !== c.k); });
  d.st = 'ended'; d.endedAt = isoT(nowT());
  return left.length;
}

export const phIdx = (c: Contact) => { const i = c.phones.findIndex(x => x.st !== 'bad'); return i < 0 ? 0 : i; };
/* What a result will do, written from the rules (same text before and after saving) */
export function effectsOf(c: Contact, out: string, fu?: string | null) {
  const p = P(c.prop), sib = ctsOf(p.k).filter(x => x !== c && !x.stop && !isFinal(x) && !x.dnc);
  const nx = nextFor(out, TODAY, Object.assign({}, c, { phones: out === 'Wrong Number' ? c.phones.map((x, i) => i === phIdx(c) ? { n: x.n, st: 'bad' as const } : x) : c.phones }), fu);
  const fx: string[] = [];
  const st = OUT[out].st;
  const after = ST_RANK[st] > ST_RANK[propStatus(p)] || LEAD_OUT.includes(out) ? st : propStatus(p);
  fx.push(`Property status: ${after}` + (after !== propStatus(p) ? ` (was ${propStatus(p)})` : ''));
  if (LEAD_OUT.includes(out)) {
    fx.push('Hand-off to AB sales: a Potential Lead is created in the AB Leads board in monday, with this call history');
    if (sib.length) fx.push(`${sib.map(x => x.n).join(', ')} ${sib.length > 1 ? 'leave' : 'leaves'} the outreach lists: the property is with sales now`);
  } else if (NO_OUT.includes(out)) {
    if (sib.length) fx.push(`${sib.map(x => x.n).join(', ')} ${sib.length > 1 ? 'leave' : 'leaves'} every list, with the reason "${c.n} said ${out}"`);
    if (out === 'Not Interested') fx.push(`${c.n} can be called again on ${fmtD(nx)} (${CFG.rc['Not Interested']} days)`);
    else fx.push(`${c.n} is never called again`);
    if (out === 'Already Building / Done') fx.push('Construction Started changes to Yes on the property');
  } else if (out === 'Wrong Number') {
    const other = c.phones.find((x, i) => i !== phIdx(c) && x.st !== 'bad');
    fx.push(other ? `This number is marked wrong. Next call goes to ${other.n} on ${fmtWD(nx!)}` : 'On hold until there is a new number (phase 2: automatic number search)');
  } else if (out === 'Follow Up') {
    fx.push(`Comes back to you (P1) on ${fu ? fmtWD(fu) : 'the date you set'}`);
  } else if (out === 'Undecided') {
    fx.push(`Comes back to you (P3) on ${fmtWD(nx!)} (${CFG.rc.Undecided} days)`);
  } else {
    fx.push(`Back in the pool on ${fmtWD(nx!)} (${CFG.rc[out] || 1} business day${(CFG.rc[out] || 1) > 1 ? 's' : ''}), any rep`);
  }
  if (c.att + 1 >= CFG.maxAtt && !LEAD_OUT.includes(out) && !NO_OUT.includes(out) && out !== 'Follow Up') fx.push(`This is attempt ${c.att + 1} of ${CFG.maxAtt}: the contact leaves the lists after it`);
  fx.push('monday: contact and property updated');
  return fx;
}
export function saveOutcome(ck: string, rep: RepKey, out: string, note: string, fu?: string | null) {
  const c = C(ck), p = P(c.prop);
  const fx = effectsOf(c, out, fu);
  const at = isoT(nowT(4));
  const ix = c.callPh != null ? c.callPh : phIdx(c);
  const call: Call = { id: SEQ.call++, ct: c.k, rep, at, out, note, ph: c.phones[ix].n, live: true };
  CALLS.push(call);
  if (out === 'Wrong Number') c.phones[ix].st = 'bad';
  else if (out !== 'Not Contacted' && out !== 'Left VM') c.phones[ix].st = 'ok';
  c.att++; c.out = out; c.lastAt = at; c.note = note || c.note;
  if (!c.rep || out === 'Follow Up' || out === 'Undecided') c.rep = c.rep || rep;
  c.nextAt = nextFor(out, at, c, fu);
  c.callPh = null; c.calling = false;
  DAY[rep].done[c.k] = call.id;
  syncLog('Fire Rebuild Contacts', c.n, `Last Call Outcome: ${out}, Call Attempts: ${c.att}` + (c.nextAt ? `, Next Eligible Call: ${fmtS(c.nextAt)}` : ''));
  const sibs = ctsOf(p.k).filter(x => x !== c && !x.stop && !isFinal(x) && !x.dnc);
  if (LEAD_OUT.includes(out)) {
    p.lead = 'L-' + (SEQ.lead++);
    LEADS.unshift({ k: p.lead, prop: p.k, ct: c.k, rep, at, out, note, src: 'Outbound', fresh: true });
    sibs.forEach(x => { x.stop = { why: 'Property handed to sales', by: c.k }; });
    syncLog('AB Leads', p.addr, `New Potential Lead ${p.lead} from ${PEO[rep].n}, with ${CALLS.filter(x => ctsOf(p.k).some(y => y.k === x.ct)).length} calls of history`);
  } else if (NO_OUT.includes(out)) {
    sibs.forEach(x => { x.stop = { why: `${c.n} said ${out}`, by: c.k }; });
    if (out === 'Already Building / Done') p.started = 'Yes';
  }
  syncLog('Fire Rebuild Properties', p.addr, `Outreach Status: ${propStatus(p)}` + (p.started === 'Yes' ? ', Construction Started: Yes' : ''));
  return fx;
}
export function dupCheck() {
  const by: Record<string, Set<RepKey>> = {};
  for (const c of CTS) if (c.res && c.res.date === TODAY) { (by[c.prop] = by[c.prop] || new Set()).add(c.res.rep); }
  return Object.values(by).filter(s => s.size > 1).length;
}
