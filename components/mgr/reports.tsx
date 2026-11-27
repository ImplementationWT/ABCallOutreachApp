'use client';
/* Outreach Manager > Reports: the one dashboard (The day by rep and Reports together; not in the artifact).
 *   1. Today's lists: what is reserved and documented now, each rep's list, See list, Reassign, Open as.
 *   2. Results for a chosen day (the day picker scopes everything below it): number tiles against the
 *      same day last week, and three charts with hover: calls by rep by result, the team's last 14 days,
 *      and the conversion rates by rep.
 * Every number appears once. The numbers come from the metrics service (lib/domain/report.ts), which
 * reads a call source: today the results recorded in the app. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';
import {
  CTS, DAY, P, PEO, REPS, REPORT_METRICS, TODAY, appCallSource, campsName, dailyReport, dailySeries, docOf, dupCheck, elig, first, fmtRate, fmtS, fmtT, fmtWD, listOf, openOf, ownerOf, pacificDay, trend,
  type ReportKey, type ReportMetrics, type RepKey,
} from '@/lib/domain';
import { on } from '@/lib/state/actions';
import { S } from '@/lib/state/store';
import { Avatar, Bar, DateField, Icon, KPI_GRID, PageHeader, Pill } from '@/components/ui';

export const reportDay = () => (S.f.repd as string) || pacificDay();
const isRate = (k: ReportKey) => !!REPORT_METRICS.find(x => x.k === k)!.rate;
const val = (m: ReportMetrics, k: ReportKey) => isRate(k) ? fmtRate(m[k]) : (m[k] ?? 0).toLocaleString('en-US');

/* ----- 1. Today's lists ----- */
function RepToday({ r }: { r: RepKey }) {
  const d = DAY[r], all = d.list.length, dn = docOf(r).length + listOf(r).filter(c => !d.done[c.k] && (c.stop || P(c.prop).lead)).length;
  const own = listOf(r).filter(c => ownerOf(c) === r).length;
  const st = d.st === 'off' ? <Pill t="Off today" /> : d.st === 'started' ? <Pill t={'Calling since ' + fmtT(d.startedAt!)} cls="green dot" /> : d.st === 'ended' ? <Pill t={'Ended ' + fmtT(d.endedAt!)} cls="ink" /> : <Pill t="Not started" cls="amber dot" />;
  return <div className={`repc ${d.st === 'off' ? 'off' : ''}`} data-rep-card={r}>
    <div className="h"><Avatar k={r} /><div><b>{PEO[r].n}</b><small>{campsName(r) || 'No active campaign'}</small></div><span className="r">{st}</span></div>
    <div className="sm flex justify-between repc-prog"><span>{dn} of {all} documented</span><span className="muted">{own} own follow-up{own === 1 ? '' : 's'}</span></div><Bar n={dn} d={all} />
    <div className="foot"><button className="btn sec sm" {...on('replist', r)}><Icon n="list" s={14} />See list</button><button className="btn sec sm" {...on('reassign', r)} disabled={!openOf(r).length}><Icon n="shuffle" s={14} />Reassign</button><button className="btn ghost sm" {...on('viewas', r)}>Open as {first(r)}</button></div>
  </div>;
}

/* ----- Chart plumbing: width, tooltip ----- */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(640);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el); setW(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
type Tip = { x: number; y: number; title: string; rows: { key?: string; v: string; l: string }[] } | null;
/** One tooltip per chart: values lead, labels follow; series keyed with a short line. */
function Tooltip({ tip }: { tip: Tip }) {
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!tip || !ref.current) return;
    const box = ref.current.offsetParent as HTMLElement | null, w = ref.current.offsetWidth;
    setLeft(Math.max(0, Math.min(tip.x + 14, (box?.clientWidth ?? 9999) - w)));
  }, [tip]);
  if (!tip) return null;
  return <div ref={ref} className="vtip" role="status" style={{ left, top: tip.y }} data-chart-tip>
    <b className="vtip-t">{tip.title}</b>
    {tip.rows.map((r, i) => <div key={i} className="vtip-r">{r.key ? <i className="vkey" style={{ background: `var(${r.key})` }} /> : <i className="vkey none" />}<b>{r.v}</b><span>{r.l}</span></div>)}
  </div>;
}
const Legend = ({ items, line }: { items: [string, string][]; line?: boolean }) =>
  <div className="vlegend">{items.map(([l, c]) => <span key={l}><i className={line ? 'vkey' : 'vsw'} style={{ background: `var(${c})` }} />{l}</span>)}</div>;
/** The numbers behind a chart, without hovering. */
function NumbersTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return <details className="vtable"><summary>See the numbers</summary><table className="ptbl"><tbody>
    <tr>{head.map((h, i) => <th key={h} className={i ? 'n' : ''}>{h}</th>)}</tr>
    {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? 'n' : ''}>{c}</td>)}</tr>)}
  </tbody></table></details>;
}
const repTip = (rep: RepKey, m: ReportMetrics, prev: ReportMetrics, prevDay: string) => ({
  title: PEO[rep].n,
  rows: [...REPORT_METRICS.map(x => ({ v: val(m, x.k), l: x.n })), { v: `${val(prev, 'calls')} calls, ${val(prev, 'leads')} leads`, l: `on ${fmtS(prevDay)}` }],
});

/* ----- 2a. Calls by rep, split by result (an ordered ramp: deeper in the funnel, darker) ----- */
const STAGES: [string, string][] = [['No answer', '--vz-o1'], ['Connected', '--vz-o2'], ['Conversation', '--vz-o3'], ['Lead', '--vz-o4']];
function stagesOf(m: ReportMetrics) {
  const a = m.calls, l = Math.min(m.leads, a), v = Math.max(0, Math.min(m.convos, a) - l), c = Math.max(0, Math.min(m.connects, a) - l - v);
  return [a - l - v - c, c, v, l];
}
function CallsByRep({ rows, prevDay }: { rows: { rep: RepKey; m: ReportMetrics; prev: ReportMetrics }[]; prevDay: string }) {
  const [tip, setTip] = useState<Tip>(null);
  const box = useRef<HTMLDivElement>(null);
  const sorted = [...rows].sort((a, b) => b.m.calls - a.m.calls || REPS.indexOf(a.rep) - REPS.indexOf(b.rep));
  const max = Math.max(1, ...rows.map(r => r.m.calls));
  const show = (e: React.PointerEvent | React.FocusEvent, r: (typeof rows)[number]) => {
    const b = box.current!.getBoundingClientRect(), t = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = 'clientX' in e ? e.clientX - b.left : t.left - b.left + t.width / 2;
    setTip({ x, y: t.bottom - b.top + 6, ...repTip(r.rep, r.m, r.prev, prevDay) });
  };
  return <div className="card vcard" data-chart="calls-by-rep"><h3><Icon n="chart" s={16} />Calls by rep, by result</h3><Legend items={STAGES} />
    <div className="vbox" ref={box} onPointerLeave={() => setTip(null)}>
      {sorted.map(r => { const st = stagesOf(r.m); return <div key={r.rep} className="vrow" data-rep={r.rep} tabIndex={0} onPointerMove={e => show(e, r)} onFocus={e => show(e, r)} onBlur={() => setTip(null)} aria-label={`${PEO[r.rep].n}: ${REPORT_METRICS.map(x => `${x.n} ${val(r.m, x.k)}`).join(', ')}`}>
        <span className="vlbl"><Avatar k={r.rep} sm />{PEO[r.rep].n}</span>
        <span className="vtrack"><span className="vstack" style={{ width: `${(r.m.calls / max) * 100}%` }}>{st.map((n, i) => n ? <i key={i} style={{ flexGrow: n, background: `var(${STAGES[i][1]})` }} /> : null)}</span><b className="vval">{r.m.calls}</b></span>
      </div>; })}
      <Tooltip tip={tip} />
    </div>
    <NumbersTable head={['Rep', ...STAGES.map(s => s[0]), 'Calls Made']} rows={sorted.map(r => [PEO[r.rep].n, ...stagesOf(r.m), r.m.calls])} />
  </div>;
}

/* ----- 2b. The team's last 14 days: one axis (all counts of calls), crosshair tooltip ----- */
const LINES: [ReportKey, string, string][] = [['calls', 'Calls Made', '--vz-c1'], ['connects', 'Connects', '--vz-c2'], ['leads', 'New Leads', '--vz-c3']];
function TeamTrend({ series, day }: { series: { day: string; m: ReportMetrics }[]; day: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const H = 210, L = 36, R = 96, T = 12, B = 26, iw = w - L - R, ih = H - T - B;
  const top = Math.max(4, ...series.map(s => s.m.calls));
  const step = top <= 8 ? 2 : top <= 20 ? 5 : top <= 50 ? 10 : top <= 100 ? 25 : top <= 250 ? 50 : 100;
  const yMax = Math.ceil(top / step) * step, ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
  const x = (i: number) => L + (series.length > 1 ? (i * iw) / (series.length - 1) : iw / 2);
  const y = (v: number) => T + ih - (v / yMax) * ih;
  const last = series.length - 1;
  const pick = (cx: number) => Math.max(0, Math.min(last, Math.round(((cx - L) / iw) * last)));
  const ends = LINES.map(([k, l]) => ({ k, l, y: y(series[last].m[k] as number) }));
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14; // labels never overlap
  const tip: Tip = hi == null ? null : { x: x(hi), y: T, title: fmtWD(series[hi].day), rows: [...LINES.map(([k, l, c]) => ({ key: c, v: val(series[hi].m, k), l })), { v: val(series[hi].m, 'convos'), l: 'Conversations' }, { v: val(series[hi].m, 'd2c'), l: 'Dial to Connect' }] };
  return <div className="card vcard" data-chart="team-trend"><h3><Icon n="chart" s={16} />Team, 14 days to {fmtS(day)}</h3><Legend items={LINES.map(([, l, c]) => [l, c])} line />
    <div className="vbox" ref={ref} onPointerLeave={() => setHi(null)}>
      <svg width={w} height={H} role="img" aria-label={`Team calls, connects and new leads by day for the 14 days to ${fmtWD(day)}`}
        onPointerMove={e => setHi(pick(e.clientX - e.currentTarget.getBoundingClientRect().left))}>
        {ticks.map(t => <g key={t}><line x1={L} x2={L + iw} y1={y(t)} y2={y(t)} className="vgrid" /><text x={L - 8} y={y(t) + 4} className="vtick" textAnchor="end">{t}</text></g>)}
        {series.map((s, i) => i % 2 === last % 2 ? <text key={s.day} x={x(i)} y={H - 6} className="vtick" textAnchor="middle">{fmtS(s.day).replace(/^\w+ /, '')}</text> : null)}
        {hi != null ? <line x1={x(hi)} x2={x(hi)} y1={T} y2={T + ih} className="vcross" /> : null}
        {LINES.map(([k, , c]) => <polyline key={k} fill="none" stroke={`var(${c})`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={series.map((s, i) => `${x(i)},${y(s.m[k] as number)}`).join(' ')} />)}
        {LINES.map(([k, , c]) => <circle key={k} cx={x(hi ?? last)} cy={y(series[hi ?? last].m[k] as number)} r={4} fill={`var(${c})`} className="vdot" />)}
        {ends.map(e => { const n = series[last].m[e.k] as number, w0 = ({ calls: 'call', connects: 'connect', leads: 'lead' } as Record<string, string>)[e.k]; return <text key={e.k} x={L + iw + 10} y={e.y + 4} className="vend">{n} {w0}{n === 1 ? '' : 's'}</text>; })}
        {series.map((s, i) => <rect key={s.day} x={x(i) - iw / last / 2} y={T} width={iw / last} height={ih} fill="transparent" tabIndex={0} onFocus={() => setHi(i)} onBlur={() => setHi(null)} aria-label={`${fmtWD(s.day)}: ${LINES.map(([k, l]) => `${l} ${val(s.m, k)}`).join(', ')}`} />)}
      </svg>
      <Tooltip tip={tip} />
    </div>
    <NumbersTable head={['Day', 'Calls Made', 'Connects', 'Conversations', 'New Leads']} rows={series.map(s => [fmtWD(s.day), s.m.calls, s.m.connects, s.m.convos, s.m.leads])} />
  </div>;
}

/* ----- 2c. Conversion rates by rep: two bars per rep, 0 to 100% ----- */
const RATES: [ReportKey, string, string][] = [['d2c', 'Dial to Connect', '--vz-c2'], ['c2l', 'Connect to Lead', '--vz-c3']];
function RatesByRep({ rows, prevDay }: { rows: { rep: RepKey; m: ReportMetrics; prev: ReportMetrics }[]; prevDay: string }) {
  const [tip, setTip] = useState<Tip>(null);
  const box = useRef<HTMLDivElement>(null);
  const show = (e: React.PointerEvent | React.FocusEvent, r: (typeof rows)[number]) => {
    const b = box.current!.getBoundingClientRect(), t = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ x: 'clientX' in e ? e.clientX - b.left : t.left - b.left + 40, y: t.bottom - b.top + 6, ...repTip(r.rep, r.m, r.prev, prevDay) });
  };
  return <div className="card vcard" data-chart="rates-by-rep"><h3><Icon n="target" s={16} />Conversion rates by rep</h3><Legend items={RATES.map(([, l, c]) => [l, c])} />
    <div className="vbox" ref={box} onPointerLeave={() => setTip(null)}>
      {rows.map(r => <div key={r.rep} className="vrow two" data-rep={r.rep} tabIndex={0} onPointerMove={e => show(e, r)} onFocus={e => show(e, r)} onBlur={() => setTip(null)} aria-label={`${PEO[r.rep].n}: ${RATES.map(([k, l]) => `${l} ${val(r.m, k)}`).join(', ')}`}>
        <span className="vlbl"><Avatar k={r.rep} sm />{PEO[r.rep].n}</span>
        <span className="vzbars">{RATES.map(([k, , c]) => <span key={k} className="vtrack"><span className="vbar" style={{ width: `${Math.round(((r.m[k] as number | null) ?? 0) * 100)}%`, background: `var(${c})` }} /><b className="vval">{val(r.m, k)}</b></span>)}</span>
      </div>)}
      <Tooltip tip={tip} />
    </div>
    <NumbersTable head={['Rep', 'Dial to Connect', 'Connect to Lead']} rows={rows.map(r => [PEO[r.rep].n, val(r.m, 'd2c'), val(r.m, 'c2l')])} />
  </div>;
}

/** "▲ 3 vs Oct 26" (points for a rate); up is good for every metric here. */
function Delta({ m, prev, k, day }: { m: ReportMetrics; prev: ReportMetrics; k: ReportKey; day: string }) {
  const t = trend(m, prev, k);
  if (t == null) return <small className="rtrend">No comparison with {fmtS(day)}</small>;
  return <small className={`rtrend ${t > 0 ? 'up' : t < 0 ? 'down' : ''}`} data-trend={t}>{t > 0 ? '▲ ' : t < 0 ? '▼ ' : ''}{t === 0 ? 'Same' : Math.abs(t) + (isRate(k) ? ' pts' : '')} vs {fmtS(day)} ({val(prev, k)})</small>;
}

export function ReportsPage() {
  const day = reportDay(), today = pacificDay();
  const r = dailyReport(appCallSource, day);
  const series = dailySeries(appCallSource, day, 14);
  const reserved = CTS.filter(c => c.res && c.res.date === TODAY).length;
  const docd = REPS.reduce((a, x) => a + docOf(x).length, 0);
  const pool = CTS.filter(c => elig(c).k === 'pool').length;
  const dup = dupCheck();
  return <>
    <PageHeader t="Reports" sub={`${fmtWD(TODAY)}. Each rep’s list for today, and the results of any day against the same day last week.`} />

    <h2 className="rsec">Today’s lists</h2>
    <div className={`stats ${KPI_GRID}`} data-today>
      <div className="stat"><small>Reserved today</small><b>{reserved}</b></div>
      <div className="stat green"><small>Documented</small><b>{docd}</b></div>
      <div className="stat blue"><small>Eligible, not reserved</small><b>{pool}</b></div>
      <div className={`stat ${dup ? 'red' : 'green'}`}><small>Same house, two reps</small><b>{dup}</b></div>
    </div>
    <div className="reps">{REPS.map(x => <RepToday key={x} r={x} />)}</div>

    <h2 className="rsec mt-[22px]">Results</h2>
    <div className="rbar" data-report-bar>
      <button className="rnav" {...on('repnav', -1)} aria-label="Previous day"><Icon n="chl" s={16} /></button>
      <div className="rday" data-report-day><DateField k="repday" value={day} onSet={v => { S.f.repd = v; }} /></div>
      <button className="rnav" {...on('repnav', 1)} aria-label="Next day" disabled={day >= today}><Icon n="chr" s={16} /></button>
      {day !== today ? <button className="rnav rnow" {...on('repnow')}>Today</button> : null}
    </div>
    <div className="rstats" data-activity>{REPORT_METRICS.map(x => <div key={x.k} className="stat" data-metric={x.k}><small>{x.n}</small><b>{val(r.team.m, x.k)}</b><Delta m={r.team.m} prev={r.team.prev} k={x.k} day={r.prevDay} /></div>)}</div>
    <div className="vgrid2">
      <CallsByRep rows={r.reps} prevDay={r.prevDay} />
      <RatesByRep rows={r.reps} prevDay={r.prevDay} />
    </div>
    <TeamTrend series={series} day={day} />
  </>;
}
