/* ===== ASSIGNMENT ENGINE ===== (artifact/app.html)
 * Also holds pastCall/nextFor (from PROPERTIES AND CONTACTS), effectsOf/saveOutcome and dupCheck
 * (from OUTREACH MANAGER), so the domain has no DOM and no import cycles.
 */
import { campOf } from './campaigns';
import { OUT, PRANK, ST_RANK, isNoOut, type Pri, type Status } from './catalogs';
import { C, CALLS, CTS, LEADS, P, SEQ, ctsOf, slotsOf, syncLog, type Call, type Contact, type Property } from './data';
import { Dx, T0, TODAY, addBiz, addDays, fmtD, fmtS, fmtT, fmtWD, getClock, iso, isoT, nextBiz, nowT } from './dates';
import { PEO, REPS, type PersonKey, type RepKey } from './people';
import { CFG, demoN } from './rules';

/* Past call: writes the log and the contact state */
export function pastCall(c: Contact, rep: PersonKey, at: string, out: string, note = '') {
  const ph = c.phones.find(x => x.st !== 'bad') || c.phones[0];
  if (ph && OUT[out]?.group !== 'none') ph.st = 'ok';
  CALLS.push({ id: SEQ.call++, ct: c.k, rep, at, out, note, ph: ph?.n || '' });
  c.att++; c.out = out; c.lastAt = at; c.rep = c.rep || rep; c.note = note;
  c.nextAt = nextFor(out, at, c);
}
export function nextFor(out: string, at: string, c?: Pick<Contact, 'phones'>, fu?: string | null): string | null {
  const d = OUT[out];
  if (!d) return null;
  if (d.needsFollowUp) return fu ? fu.slice(0, 10) : iso(addBiz(at, 2));
  if (d.lead || d.final) return null;
  if (d.phone === 'bad') return c && c.phones.some(x => x.st !== 'bad') ? iso(nextBiz(at)) : null;
  const r = recallOf(out);
  return iso(r.cal ? addDays(at, r.days) : addBiz(at, r.days));
}
/** The waiting time of an outcome: days, and whether they are calendar days. */
export function recallOf(out: string) {
  const d = OUT[out];
  const days = CFG.rc?.[out] ?? d?.recallDays ?? 1;
  return d?.calendarDays ? { days, cal: true } : { days: days || 1, cal: false };
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
/** Has a number that can be dialed. A contact without any phone (none in phone_numbers) is on hold and
 * never allocated; once a number is added it comes into the allocation with no other change. */
export const callable = (c: Contact) => c.phones.some(x => x.st !== 'bad');
/** Another slot of the same person (another of their properties) is in someone's list today: one
 * call per person a day, so the person is not called twice. */
export const ownerBusy = (c: Contact) =>
  (!!c.base || (c.props?.length ?? 0) > 1) && slotsOf(c).some(x => x !== c && x.res?.date === TODAY);
export const isFinal = (c: Contact) => !!c.out && !!OUT[c.out]?.final;
export function priOf(c: Contact): Pri {
  const p = P(c.prop);
  const pri = c.out ? OUT[c.out]?.pri : null;
  if (pri === 'P1') return 'P1';
  if (p.permit === 'Permit Issued') return 'P2';
  return pri || 'P5';
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
  if (isNoOut(c.out) && !isFinal(c) && c.nextAt! > TODAY) return { ok: false, k: 'stop', why: c.out + ', can be called again ' + fmtD(c.nextAt), tone: 'red' };
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
    const s = (c.out && OUT[c.out]?.status) || 'Not Contacted';
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
    if (!e.ok || e.k === 'res' || ownerBusy(c)) continue;
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
  for (const c of g.cs) { if (ownerBusy(c)) continue; c.res = { rep, date: TODAY }; if (!d.list.includes(c.k)) d.list.push(c.k); }
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
/** A follow-up set for later today, whose time has come: the contact is to call again today. */
export const dueAgain = (c: Contact) => !!c.fuAt && c.fuAt.slice(0, 10) === TODAY && c.fuAt <= isoT(getClock());
export const openOf = (rep: RepKey) => listOf(rep).filter(c => (!DAY[rep].done[c.k] || dueAgain(c)) && !c.stop && !P(c.prop).lead);
export const docOf = (rep: RepKey) => listOf(rep).filter(c => DAY[rep].done[c.k] && !dueAgain(c));
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
/** Start Workday: the day starts and, if the rep has nothing to call (the morning allocation gave
 * them nothing, e.g. the campaign was created later), they get the first daily batch now: their own
 * follow-ups first, then the rest in priority order. Returns how many contacts were added. */
export function startAlloc(rep: RepKey) {
  startDay(rep);
  if (openOf(rep).length) return 0;
  const cap = demoN(CFG.first), before = load(rep);
  for (const g of freeGroups(rep).filter(g => g.own === rep)) if (load(rep) - before < cap) reserve(g, rep);
  for (const g of freeGroups(rep).filter(g => !g.own)) { if (load(rep) - before >= cap) break; reserve(g, rep); }
  const n = load(rep) - before;
  if (n) DAY[rep].batches.push({ at: fmtT(nowT()), n, k: 'Start of workday' });
  return n;
}
export function endDay(rep: RepKey) {
  const d = DAY[rep];
  const left = openOf(rep);
  if (CFG.endDay === 'pool') left.forEach(c => { c.res = null; d.list = d.list.filter(k => k !== c.k); });
  d.st = 'ended'; d.endedAt = isoT(nowT());
  return left.length;
}

/** The person's slots for their other properties that are still in outreach. */
const otherSlots = (c: Contact) => slotsOf(c).filter(x => x !== c && !x.stop && !isFinal(x));
export const phIdx =(c: Contact) => { const i = c.phones.findIndex(x => x.st !== 'bad'); return i < 0 ? 0 : i; };
/* What a result will do, written from the rules (same text before and after saving) */
export function effectsOf(c: Contact, out: string, fu?: string | null) {
  const p = P(c.prop), d = OUT[out], sib = ctsOf(p.k).filter(x => x !== c && !x.stop && !isFinal(x) && !x.dnc);
  const nx = nextFor(out, TODAY, Object.assign({}, c, { phones: d.phone === 'bad' ? c.phones.map((x, i) => i === phIdx(c) ? { n: x.n, st: 'bad' as const } : x) : c.phones }), fu);
  const fx: string[] = [];
  const st = d.status;
  const after = ST_RANK[st] > ST_RANK[propStatus(p)] || d.lead ? st : propStatus(p);
  const r = recallOf(out);
  fx.push(`Property status: ${after}` + (after !== propStatus(p) ? ` (was ${propStatus(p)})` : ''));
  if (d.lead) {
    fx.push('Hand-off to AB sales: a Potential Lead is created in the AB Leads board in monday, with this call history');
    if (sib.length) fx.push(`${sib.map(x => x.n).join(', ')} ${sib.length > 1 ? 'leave' : 'leaves'} the outreach lists: the property is with sales now`);
  } else if (isNoOut(out)) {
    if (sib.length) fx.push(`${sib.map(x => x.n).join(', ')} ${sib.length > 1 ? 'leave' : 'leaves'} every list, with the reason "${c.n} said ${out}"`);
    if (!d.final) fx.push(`${c.n} can be called again on ${fmtD(nx)} (${r.days} days)`);
    else fx.push(`${c.n} is never called again`);
    if (d.started) fx.push('Construction Started changes to Yes on the property');
    const more = otherSlots(c).length;
    if (d.propagates === 'person' && more) fx.push(`${c.n} also owns ${more} other propert${more > 1 ? 'ies' : 'y'}: ${more > 1 ? 'they leave' : 'it leaves'} the lists too`);
    if (d.propagates === 'property' && !d.final && more) fx.push(`Only this property: ${c.n}’s other ${more} propert${more > 1 ? 'ies stay' : 'y stays'} in outreach`);
  } else if (d.phone === 'bad') {
    const other = c.phones.find((x, i) => i !== phIdx(c) && x.st !== 'bad');
    fx.push(other ? `This number is marked wrong. Next call goes to ${other.n} on ${fmtWD(nx!)}` : 'On hold until there is a new number (phase 2: automatic number search)');
  } else if (d.needsFollowUp) {
    fx.push(`Comes back to you (${d.pri || 'P1'}) on ${fu ? fmtWD(fu) + (fu.length > 10 ? ' at ' + fmtT(fu) : '') : 'the date and time you set'}`);
  } else if (d.sameRep) {
    fx.push(`Comes back to you (${d.pri || priOf(c)}) on ${fmtWD(nx!)} (${r.days} days)`);
  } else if (d.final) {
    fx.push(`${c.n} is never called again`);
  } else {
    fx.push(`Back in the pool on ${fmtWD(nx!)} (${r.days} ${r.cal ? 'day' : 'business day'}${r.days > 1 ? 's' : ''}), any rep`);
  }
  if (c.att + 1 >= CFG.maxAtt && !d.lead && !isNoOut(out) && !d.needsFollowUp) fx.push(`This is attempt ${c.att + 1} of ${CFG.maxAtt}: the contact leaves the lists after it`);
  fx.push('monday: contact and property updated');
  return fx;
}
export function saveOutcome(ck: string, rep: RepKey, out: string, note: string, fu?: string | null) {
  const c = C(ck), p = P(c.prop), d = OUT[out];
  const fx = effectsOf(c, out, fu);
  const at = isoT(nowT(4));
  const ix = c.callPh != null ? c.callPh : phIdx(c);
  const ph = c.phones[ix];
  const call: Call = { id: SEQ.call++, ct: c.k, rep, at, out, note, ph: ph?.n || '', live: true };
  CALLS.push(call);
  if (ph && d.phone === 'bad') ph.st = 'bad';
  else if (ph && d.phone === 'ok') ph.st = 'ok';
  c.att++; c.out = out; c.lastAt = at; c.note = note || c.note;
  if (!c.rep || d.sameRep) c.rep = c.rep || rep;
  c.nextAt = nextFor(out, at, c, fu);
  if (d.needsFollowUp && fu && fu.length > 10) c.fuAt = fu; else if (c.fuAt) c.fuAt = null;
  c.callPh = null; c.calling = false;
  DAY[rep].done[c.k] = call.id;
  syncLog('Fire Rebuild Contacts', c.n, `Last Call Outcome: ${out}, Call Attempts: ${c.att}` + (c.nextAt ? `, Next Eligible Call: ${fmtS(c.nextAt)}` : ''));
  const sibs = ctsOf(p.k).filter(x => x !== c && !x.stop && !isFinal(x) && !x.dnc);
  if (d.lead) {
    p.lead = 'L-' + (SEQ.lead++);
    LEADS.unshift({ k: p.lead, prop: p.k, ct: c.k, rep, at, out, note, src: 'Outbound', fresh: true });
    sibs.forEach(x => { x.stop = { why: 'Property handed to sales', by: c.k }; });
    syncLog('AB Leads', p.addr, `New Potential Lead ${p.lead} from ${PEO[rep].n}, with ${CALLS.filter(x => ctsOf(p.k).some(y => y.k === x.ct)).length} calls of history`);
  } else if (isNoOut(out)) {
    sibs.forEach(x => { x.stop = { why: `${c.n} said ${out}`, by: c.k }; });
    if (d.started) p.started = 'Yes';
  }
  // "Do Not Contact" is about the person: their other properties leave the lists too.
  // "Not Interested" and the rest stay with this property only.
  if (d.propagates === 'person') otherSlots(c).forEach(x => { x.stop = { why: `${c.n} asked not to be contacted`, by: c.k }; });
  syncLog('Fire Rebuild Properties', p.addr, `Outreach Status: ${propStatus(p)}` + (p.started === 'Yes' ? ', Construction Started: Yes' : ''));
  return fx;
}
export function dupCheck() {
  const by: Record<string, Set<RepKey>> = {};
  for (const c of CTS) if (c.res && c.res.date === TODAY) { (by[c.prop] = by[c.prop] || new Set()).add(c.res.rep); }
  return Object.values(by).filter(s => s.size > 1).length;
}
