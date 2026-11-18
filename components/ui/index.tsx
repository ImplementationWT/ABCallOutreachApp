'use client';
/* ===== COMMON PIECES ===== (artifact/app.html): ico, pill and its variants, av, head, statF, kv,
 * prTag, p2tag, bar, picker, datef, phaseBan. */
import type React from 'react';
import { AUDS, OUT, PEO, PRI, ST_TONE, fmtS, fmtWD, type AudKey, type PersonKey, type Pri, type Property, type Status } from '@/lib/domain';
import { on, registerDate, registerPick, type PickOpt } from '@/lib/state/actions';
import { PAGE_SIZES, S } from '@/lib/state/store';
import { IC } from './icons';

export function Icon({ n, s = 18 }: { n: string; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={IC[n] || IC.info} /></svg>;
}

export const Pill = ({ t, cls = '' }: { t: React.ReactNode; cls?: string }) => <span className={`pill ${cls}`}>{t}</span>;
export function Avatar({ k, sm }: { k: PersonKey; sm?: boolean }) {
  const p = PEO[k];
  return p ? <span className={`av ${p.c} ${sm ? 'sm' : ''}`} title={p.n}>{p.i}</span> : null;
}
export function PageHeader({ t, sub, acts }: { t: string; sub?: React.ReactNode; acts?: React.ReactNode }) {
  return <div className="op-h"><div><h1>{t}</h1>{sub ? <p>{sub}</p> : null}</div>{acts ? <div className="acts">{acts}</div> : null}</div>;
}
/** KPI rows: equal columns that fill the width and line up when they wrap to a second row. */
export const KPI_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))]';
export function StatFilter({ fk, val, label, n, cls = '' }: { fk: string; val: string; label: string; n: number; cls?: string }) {
  return <button className={`stat ${cls}`} {...on('filt', `${fk}|${val}`)} aria-pressed={S.f[fk] === val}><small>{label}</small><b>{n}</b></button>;
}
export function Kv({ l, v, sub, cls = '' }: { l: string; v: React.ReactNode; sub?: React.ReactNode; cls?: string }) {
  return <div className={`kv ${cls}`}><small>{l}</small><b>{v}</b>{sub ? <span className="sub">{sub}</span> : null}</div>;
}
export function PrTag({ pr, sm }: { pr: Pri; sm?: boolean }) {
  return <span className={`pr ${pr.toLowerCase()}`} title={pr + ': ' + PRI[pr].n + ', ' + PRI[pr].who} style={sm ? { width: 28, height: 28, fontSize: 11 } : undefined}>{pr}</span>;
}
const TONE: Record<string, string> = { g: 'green', a: 'amber', r: 'red', b: 'blue', n: '' };
export const OutPill = ({ o }: { o: string | null }) => o ? <Pill t={o} cls={TONE[OUT[o].tone]} /> : <Pill t="Never called" />;
export const StPill = ({ s }: { s: Status }) => <Pill t={s} cls={ST_TONE[s] + ' dot'} />;
export const AudPill = ({ a }: { a: AudKey }) => <Pill t={AUDS[a].s} cls="blue" />;
export const PermitPill = ({ p }: { p: Property }) => p.permit === 'Permit Issued' ? <Pill t={'Permit Issued ' + fmtS(p.permitDate)} cls="green" /> : p.permit === 'Plans Submitted' ? <Pill t={'Plans Submitted ' + fmtS(p.permitDate)} cls="amber" /> : <Pill t="No permit yet" />;
export const P2Tag = ({ t = 'Phase 2' }: { t?: string }) => <span className="p2tag"><Icon n="layers" s={11} />{t}</span>;
export function Bar({ n, d, cls = '' }: { n: number; d: number; cls?: string }) {
  return <div className="bar"><i className={cls} style={{ width: `${d ? Math.round(n * 100 / d) : 0}%` }} /></div>;
}

/** picker(): a button that opens the searchable popover (rendered by <Layer>). */
export function Picker({ k, value, opts, onSet, ph = 'Choose...' }: { k: string; value?: string; opts: PickOpt[]; onSet: (v: string) => void; ph?: string }) {
  registerPick(k, { opts, onSet });
  const o = opts.find(x => x.v === value);
  return <div className="pk"><button className="pk-b" type="button" {...on('pick', k)}>{o ? <><span>{o.l}</span>{o.d ? <small className="muted">{o.d}</small> : null}</> : <span className="ph2">{ph}</span>}<Icon n="chd" s={16} /></button></div>;
}
/** datef(): a button that opens the calendar popover; past days are disabled there. */
export function DateField({ k, value, onSet, ph = 'Pick a date' }: { k: string; value?: string | null; onSet: (v: string) => void; ph?: string }) {
  registerDate(k, onSet);
  return <div className="pk"><button className="pk-b" type="button" {...on('cal', k)} data-d={value || ''}><Icon n="cal" s={16} /><span className={value ? '' : 'ph2'}>{value ? fmtWD(value) : ph}</span></button></div>;
}
export function PhaseBanner() {
  return <div className="phase-ban"><span className="pi"><Icon n="layers" s={17} /></span><div><b>Phase 2</b>Calling and AI is phase 2. It starts when AB picks its phone provider: any provider works as long as it offers an API or webhooks for call data, and a transcript if AB wants AI summaries. Phase 1 already works without it: click to call, and the rep records the result.</div></div>;
}

/* ----- Pagination -----
 * Every table shows one page of its rows (20, 30 or 50, picked under the table) instead of all of
 * them: with thousands of properties, drawing every row made the lists slow to open and to search.
 * `paged(k, rows)` gives the rows of the current page and the pager to put under the table; the
 * state lives in S.pg[k], so it survives re-renders, and a new filter or search goes back to page 1. */
export function paged<T>(k: string, rows: T[]) {
  const st = S.pg[k] || { i: 0, n: PAGE_SIZES[0] };
  const pages = Math.max(1, Math.ceil(rows.length / st.n));
  const i = Math.min(st.i, pages - 1);
  return { rows: rows.slice(i * st.n, (i + 1) * st.n), pager: <Pager k={k} total={rows.length} i={i} n={st.n} pages={pages} /> };
}
export function Pager({ k, total, i, n, pages }: { k: string; total: number; i: number; n: number; pages: number }) {
  if (!total) return null;
  const from = i * n + 1, to = Math.min(total, (i + 1) * n);
  return <div className="flex flex-wrap items-center gap-[8px] mt-[10px] text-[13px] text-muted" data-pager={k}>
    <span className="tabular-nums">{from.toLocaleString('en-US')}–{to.toLocaleString('en-US')} of {total.toLocaleString('en-US')}</span>
    <span className="sp flex-1" />
    <span>Rows per page</span>
    {PAGE_SIZES.map(s => <button key={s} className="seg" {...on('pgn', `${k}|${s}`)} aria-pressed={n === s}>{s}</button>)}
    <button className="btn sec sm" {...on('pgo', `${k}|${i - 1}`)} disabled={i === 0} aria-label="Previous page"><Icon n="chl" s={14} /></button>
    <span className="tabular-nums">Page {i + 1} of {pages}</span>
    <button className="btn sec sm" {...on('pgo', `${k}|${i + 1}`)} disabled={i >= pages - 1} aria-label="Next page"><Icon n="chr" s={14} /></button>
  </div>;
}
