'use client';
/* The artifact's action maps, same names:
 *   A  click actions (data-act)        IN  input handlers (data-in)
 *   PK picker definitions               DK  date field callbacks
 * Sections follow artifact/app.html: GENERIC ACTIONS, SIGN IN, REP WORKSPACE, OUTREACH MANAGER,
 * PROPERTIES, DATA, SIDEBAR PAGES, WALKTHROUGH, EVENTS.
 */
import type React from 'react';
import {
  C, CAMPS, CFG, DAY, OUT, P, isLeadOut, isNoOut, PROPS, PEO, REPS, T0, TODAY,
  campName, campsOf, newCampKey, ctByName, ctsOf, fmtWD, isFinal, isoT, nowT, openOf,
  startDay, syncLog, D, addDays, iso, pacificDay, isCurrentPeriod, shiftPeriod, type PeriodKind, type RepKey,
} from '@/lib/domain';
import { TOUR } from '@/lib/domain/tour';
import { go, openProp } from './navigation';
import { queueSort } from './rep';
import { APPS, PAGE_SIZES, S, bump, store, toast, type AppKey, type ViewKey } from './store';
import { can } from './auth';
import { allocate, loadState, work } from './persist';
import { isLocked, type Perm } from '@/lib/auth/roles';

type Fn = (v: string, el?: HTMLElement, e?: React.SyntheticEvent | Event) => unknown;
export const A: Record<string, Fn> = {};
export const IN: Record<string, (v: string, k: string) => void> = {};
export type PickOpt = { v: string; l: string; d?: string; g?: string };
export const PK: Record<string, { opts: PickOpt[]; onSet: (v: string) => void }> = {};
export const DK: Record<string, (v: string) => void> = {};
/** Called while rendering a picker or a date field, like picker()/datef() did in the artifact. */
export const registerPick = (k: string, d: { opts: PickOpt[]; onSet: (v: string) => void }) => { PK[k] = d; };
export const registerDate = (k: string, fn: (v: string) => void) => { DK[k] = fn; };

/* ===== EVENTS: dispatch ===== */
const KEEP_POP = ['pick', 'cal', 'calnav', 'pickset', 'calpick'];
/** Actions that need a permission (the server checks the same when saving). */
const NEED: Record<string, Perm> = {
  newcamp: 'mgr.manage', ncsave: 'mgr.manage', camppause: 'mgr.manage', campresume: 'mgr.manage', campend: 'mgr.manage', campenddone: 'mgr.manage', reassign: 'mgr.manage', radone: 'mgr.manage', cfgset: 'mgr.manage',
  reopen: 'prp.edit', started: 'prp.edit', viewas: 'mgr.view', replist: 'mgr.view',
};
export const denied = () => toast('You do not have permission for this');
export function dispatch(act: string, v?: string, el?: HTMLElement, e?: React.SyntheticEvent | Event) {
  const fn = A[act];
  if (!fn) { console.warn('No action', act); return; }
  if (S.pop && !KEEP_POP.includes(act)) S.pop = null;
  if (NEED[act] && !can(NEED[act])) { denied(); bump(); return; }
  // Locked apps (Calling and AI): no way in, from any button or link
  if ((act === 'view' || act === 'azgo') && v && isLocked(v.split('|')[0])) { toast('Calling and AI is locked for now'); bump(); return; }
  const r = fn(v as string, el, e);
  if (r !== false || act === 'pick' || act === 'cal' || act === 'calnav') bump();
}
/** Props for a clickable element: <button {...on('qsel', c.k)}>. Keeps data-act/data-v as in the artifact. */
export const on = (act: string, v?: string | number) => ({
  'data-act': act,
  'data-v': v == null ? undefined : String(v),
  onClick: (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    e.stopPropagation(); // the artifact dispatched only the closest [data-act]
    if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
    if (el.tagName === 'A') e.preventDefault();
    dispatch(act, v == null ? undefined : String(v), el, e);
  },
});
/** Props for an input: <input {...inp('srch.pool')}>. Bumps only where the artifact re-rendered. */
const RERENDER_IN = ['srch', 'popq', 'ran', 'ncgoal', 'ncname'];
export const inp = (spec: string) => ({
  'data-in': spec,
  onInput: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const [n, ...rest] = spec.split('.');
    const fn = IN[n];
    if (!fn) return;
    fn(e.currentTarget.value, rest.join('.'));
    if (RERENDER_IN.includes(n)) bump();
  },
});

/* ===== GENERIC ACTIONS ===== */
A.view = v => { S.view = v as ViewKey; S.top = true; };
A.filt = v => { const [k, val] = v.split('|'); S.f[k] = val; firstPages(); };
A.mclose = () => { S.modal = null; };
A.mscrim = (v, t, e) => { if (e && e.target === t) S.modal = null; else return false; };
A.theme = () => {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const nx = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nx; store.set('theme', nx);
};
A.pick = (v, t) => { const r = t!.getBoundingClientRect(); S.pop = { t: 'pick', key: v, x: r.left, y: r.bottom + 4, q: '', kb: 0 }; return false; };
A.pickset = v => { const d = S.pop && PK[S.pop.key]; S.pop = null; if (d) d.onSet(v); };
A.cal = (v, t) => { const r = t!.getBoundingClientRect(); const cur = t!.dataset.d; S.pop = { t: 'cal', key: v, x: r.left, y: Math.max(8, r.top - 372), m: cur ? D(cur)! : new Date(T0), sel: cur }; return false; };
A.calnav = v => { if (S.pop?.t !== 'cal') return false; const m = new Date(S.pop.m); m.setMonth(m.getMonth() + Number(v)); S.pop.m = m; return false; };
A.calpick = v => { const fn = S.pop && DK[S.pop.key]; S.pop = null; if (fn) fn(v); };
A.nop = () => false;
A.account = () => { S.modal = { k: 'account' }; };
/* The avatar: the artifact's "Switch user" went to the demo's user picker; with the real login it opens Account
 * (change password, log out). A manager opens a rep's list with "Open as" in The day by rep. */
A.signout = () => { S.modal = { k: 'account' }; };
A.openprop = v => { openProp(v); };
IN.popq = v => { if (S.pop?.t === 'pick') { S.pop.q = v; S.pop.kb = 0; } };

/* ===== REP WORKSPACE ===== */
/* Start Workday: the server starts the day and, if the list is empty, allocates the first batch. */
A.startday = () => {
  if (S.loadingMore) return false;
  S.loadingMore = true;
  void startWorkday(S.user).finally(() => { S.loadingMore = false; bump(); });
};
async function startWorkday(u: RepKey) {
  const r = await allocate({ kind: 'start', rep: u });
  if (!r) { toast('Could not reach the server. Try again'); return; }
  await loadState(true);
  const first = openOf(u).sort(queueSort)[0];
  S.sel[u] = first ? first.k : null;
  toast(DAY[u].list.length ? `Workday started: ${DAY[u].list.length} contacts for today` : 'Workday started. No eligible contacts in your campaign today');
}
A.reopenday = () => { void serverAct({ action: 'reopenday', rep: S.user }); return false; };
/** Runs a server action (lib/db/work.ts), reloads the data and calls `then` with the answer. */
async function serverAct(body: Record<string, unknown>, then?: (r: Record<string, unknown>) => void) {
  if (S.loadingMore) return;
  S.loadingMore = true; bump();
  try {
    const r = await work(body);
    if (r.error) { toast(r.error); return; }
    await loadState(true);
    then?.(r);
  } finally { S.loadingMore = false; bump(); }
}
A.qsel = v => { S.sel[S.user] = v; };
/* Request more: the server allocates (lib/db/allocate.ts), so two reps never get the same contact;
 * then the data is reloaded with every other rep's reservations. */
A.reqmore = () => {
  if (S.loadingMore) return false;
  S.loadingMore = true;
  void reqMore(S.user).finally(() => { S.loadingMore = false; bump(); });
};
async function reqMore(u: RepKey) {
  const r = await allocate({ kind: 'more', rep: u });
  if (!r) { toast('Could not reach the server. Try again'); return; }
  if (!r.ok) { const n = r.n!; toast(`${n} contact${n > 1 ? 's' : ''} still need${n > 1 ? '' : 's'} a result before you get more`); return; }
  await loadState(true);
  if (!r.n) { toast('No more eligible contacts in your campaign today'); bump(); return; }
  const first = openOf(u).sort(queueSort)[0];
  S.sel[u] = first ? first.k : S.sel[u];
  toast(`Checked: every contact documented. ${r.n} more contacts added to your list`);
  bump();
}
A.endday = () => { void serverAct({ action: 'endday', rep: S.user }, r => { const n = Number(r.n); toast(n ? `${n} contacts not called went back to the pool` : 'Workday ended'); }); return false; };
A.dial = v => { const [k, i] = v.split('|'); const c = C(k); c.calling = isoT(nowT()); c.callPh = Number(i); };
A.setout = v => { const [k, o] = v.split('|'); const dr = S.draft[k]; dr.out = dr.out === o ? null : o; if (OUT[o]?.needsFollowUp && !dr.fu) dr.fu = null; };
IN.note = (v, k) => { S.draft[k].note = v; };
A.togscript = () => { S.f.script = !S.f.script; };
/* Save and next: the result is saved by the server (POST /api/work), which checks the contact is in
 * the rep's list; then the data is reloaded. */
A.saveout = v => {
  const u = S.user, dr = S.draft[v];
  if (!dr || !dr.out || S.loadingMore) return false;
  void serverAct({ action: 'save', rep: u, ct: v, out: dr.out, note: dr.note, fu: dr.fu && dr.fuT ? `${dr.fu}T${dr.fuT}` : null, key: dr.key, ph: C(v).callPh ?? null }, () => savedToast(u, v));
  return false;
};
function savedToast(u: RepKey, v: string) {
  delete S.draft[v];
  const nx = openOf(u).sort(queueSort)[0];
  S.sel[u] = nx ? nx.k : v;
  const c = C(v);
  toast(isLeadOut(c.out) ? `${c.n}: handed to AB sales as a Potential Lead` : isNoOut(c.out) ? `${c.n}: ${c.out}. Other contacts at the property removed` : `${c.n}: ${c.out} saved${c.nextAt ? ', back ' + fmtWD(c.nextAt) : ''}`);
}

/* ===== OUTREACH MANAGER ===== */
A.replist = v => { S.modal = { k: 'replist', r: v }; };
A.viewas = v => { S.user = v as RepKey; go('rep', 'today'); };
A.reassign = v => {
  const r = v as RepKey, mine = campsOf(r);
  const shared = (x: RepKey) => Number(campsOf(x).some(c => mine.includes(c)));
  const others = REPS.filter(x => x !== r && DAY[x].st !== 'off').sort((a, b) => shared(b) - shared(a));
  S.modal = { k: 'reassign', r, to: others[0], n: Math.ceil(openOf(r).length / 2) };
};
A.rato = v => { S.modal!.to = v; };
IN.ran = v => { S.modal!.n = Math.max(0, Number(v) || 0); };
/* Reassign: done by the server (lib/db/work.ts), so the lists stay consistent with every rep's. */
A.radone = () => {
  const m = S.modal!, from = m.r as RepKey, to = m.to as RepKey;
  void serverAct({ action: 'reassign', rep: from, to, n: m.n }, r => { S.modal = null; toast(`${r.n} contacts moved to ${PEO[to].n}`); });
  return false;
};
IN.srch = (v, k) => { S.srch[k] = v; firstPages(); };
/* Tables: page (‹ ›) and rows per page (20, 30 or 50). A new filter or search goes back to page 1. */
const firstPages = () => { for (const k of Object.keys(S.pg)) S.pg[k].i = 0; };
A.pgo = v => { const [k, i] = v.split('|'); (S.pg[k] ||= { i: 0, n: PAGE_SIZES[0] }).i = Math.max(0, Number(i) || 0); };
A.pgn = v => { const [k, n] = v.split('|'); S.pg[k] = { i: 0, n: PAGE_SIZES.includes(Number(n)) ? Number(n) : PAGE_SIZES[0] }; };
A.newcamp = () => { S.modal = { k: 'newcamp', n: '', auds: ['pp'], reps: ['may', 'dan'], goal: 1 }; };
A.ncaud = v => { const a: string[] = S.modal!.auds; S.modal!.auds = a.includes(v) ? a.filter(x => x !== v) : a.concat(v); };
A.ncrep = v => { const a: string[] = S.modal!.reps; S.modal!.reps = a.includes(v) ? a.filter(x => x !== v) : a.concat(v); };
IN.ncgoal = v => { S.modal!.goal = Number(v) || 0; };
IN.ncname = v => { S.modal!.n = v.slice(0, 80); };
/* A campaign is permanent: active from now until it is paused or ended (the next allocation uses it). */
A.ncsave = () => {
  const m = S.modal!;
  const c = { k: newCampKey(), n: String(m.n || '').trim() || undefined, status: 'active' as const, auds: m.auds, reps: m.reps, goal: m.goal, created: TODAY, since: null };
  CAMPS.push(c);
  S.modal = null; toast(`Campaign created: ${campName(c)} is active. The next allocation uses it`);
};
/* Pause, resume or end a campaign. Pausing or ending stops new assignments of its contacts; the
 * history (calls, follow-ups) is kept. Ending is final. */
const campBy = (k: string) => CAMPS.find(c => c.k === k);
A.camppause = v => { const c = campBy(v); if (!c || c.status !== 'active') return; c.status = 'paused'; c.since = TODAY; toast(`${campName(c)} paused: no new assignments until it is resumed`); };
A.campresume = v => { const c = campBy(v); if (!c || c.status !== 'paused') return; c.status = 'active'; c.since = TODAY; toast(`${campName(c)} is active again`); };
A.campend = v => { S.modal = { k: 'endcamp', c: v }; };
A.campenddone = () => { const c = campBy(S.modal!.c); S.modal = null; if (!c || c.status === 'ended') return; c.status = 'ended'; c.since = TODAY; toast(`${campName(c)} ended. Its history is kept`); };
IN.cfg = (v, k) => {
  if (!can('mgr.manage')) return; CFG[k] = Math.max(0, Number(v) || 0); };
A.cfgset = v => { const [k, val] = v.split('|'); CFG[k] = val === 'true' ? true : val === 'false' ? false : val; toast('Rule saved. The next allocation uses it'); };
/* Reactivate a contact on hold (its rep or an administrator; the server checks it). */
A.reactivate = v => { void serverAct({ action: 'reactivate', ct: v }, () => toast('Contact reactivated: back in the pool')); return false; };

/* Performance by period (not in the artifact): Day, Week, Month or Year, moved with ‹ ›, back to
 * the current one, and a bar of the chart opens its day or month. */
const perfAnchor = () => (S.f.perfd as string) || TODAY;
const reportDayOf = () => (S.f.repd as string) || pacificDay();
A.perfp = v => { S.f.perfp = v; };
A.perfnav = v => {
  const kind = S.f.perfp as PeriodKind, dir = Number(v);
  if (dir > 0 && isCurrentPeriod(kind, perfAnchor())) return false;
  const next = shiftPeriod(kind, perfAnchor(), dir);
  S.f.perfd = next > TODAY ? TODAY : next;
};
A.perfnow = () => { S.f.perfd = TODAY; };
/* Reports (administrator): the day shown, moved one day with ‹ ›, back to today in Pacific time. */
A.repnav = v => { const d = addDays(reportDayOf(), Number(v)); const n = iso(d); if (n > pacificDay()) return false; S.f.repd = n; };
A.repnow = () => { S.f.repd = ''; };
A.perfdrill = v => { const [k, d] = v.split('|'); S.f.perfp = k; S.f.perfd = d; };

/* ===== PROPERTIES ===== */
A.prtab = v => { S.tab.prp = v; };
A.go_mgr_leads = () => { go('mgr', 'leads'); };
A.reopen = v => { ctsOf(v).forEach(c => { c.stop = null; if (isNoOut(c.out) && !isFinal(c)) c.nextAt = TODAY; }); syncLog('Fire Rebuild Properties', P(v).addr, 'Reopened for outreach by Andrew'); toast('Property reopened: its contacts are eligible again'); };
A.started = v => { const p = P(v); p.started = 'Yes'; ctsOf(v).forEach(c => { if (!c.stop && !isFinal(c)) c.stop = { why: 'Construction started at the property', by: null }; }); syncLog('Fire Rebuild Properties', p.addr, 'Construction Started: Yes'); toast('Construction started: contacts removed from outreach'); };
A.openct = v => { const c = C(v); openProp(c.prop, 'cts'); S.hl = v; };

/* ===== DATA ===== */
A.dbm = v => { S.f.dbm = v; };
A.azgo = v => { const [a, pg] = v.split('|'); go(a as ViewKey, pg); };

/* ===== SIDEBAR PAGES ===== */
export const pageAct = (k: AppKey) => 'pg_' + k;
for (const [k] of APPS) A[pageAct(k)] = v => { S.page[k] = v; S.det[k] = null; S.top = true; };

/* ===== WALKTHROUGH ===== */
const ensureMay = () => { S.user = 'may'; if (DAY.may.st !== 'started') { startDay('may'); } };
const selMay = (n: string) => { ensureMay(); const c = ctByName(n); S.sel.may = c.k; go('rep', 'today'); S.hl = c.k; };
/** The go() of each TOUR step, by index (texts are in lib/domain/tour.ts). */
export const TOUR_GO: (() => void)[] = [
  () => { go('mgr', 'live'); },
  () => { S.user = 'may'; go('rep', 'today'); },
  () => { selMay('Laura Whitfield'); },
  () => { selMay('Elena Marsh'); },
  () => { selMay('Michael Brandt'); },
  () => { selMay('Henry Okafor'); },
  () => { go('mgr', 'rules'); },
  () => { /* "What phase 2 adds": Calling and AI is locked, the step is told from where the presenter is */ },
];
export const TOUR_MAS: [string, () => void][] = [
  ['Contact pool: why each contact is or is not in today’s lists', () => { S.f.pool = 'all'; go('mgr', 'pool'); }],
  ['Reassign what a rep has not called', () => { go('mgr', 'live'); A.reassign('dan'); }],
  ['905 Arbolada Way: the property record with its three contacts', () => { openProp(PROPS.find(p => p.addr === '905 Arbolada Way')!.k, 'cts'); }],
  ['Daily emails: the rep’s morning campaign', () => { S.f.mail = 'rep'; go('mgr', 'mail'); }],
  ['monday sync: what was pushed today', () => { go('mgr', 'sync'); }],
  ['New campaign', () => { go('mgr', 'camp'); A.newcamp(''); }],
  ['Data: the process from A to Z and where it runs', () => { S.f.dbm = 'az'; go('db'); S.view = 'db'; }],
];
function tourShow(i: number) { S.tour.i = i; S.tour.list = false; S.tour.col = false; S.modal = null; S.pop = null; TOUR_GO[i](); }
A.tour = () => { S.tour.on = !S.tour.on; if (S.tour.on) tourShow(S.tour.i || 0); };
A.tourstep = v => { const n = S.tour.i + Number(v); if (n >= 0 && n < TOUR.length) tourShow(n); };
A.tourto = v => { tourShow(Number(v)); };
A.tourlist = () => { S.tour.list = !S.tour.list; S.tour.col = false; };
A.tourcol = () => { S.tour.col = !S.tour.col; };
A.tourgo = v => { S.tour.list = false; S.tour.col = true; S.modal = null; TOUR_MAS[Number(v)][1](); };
