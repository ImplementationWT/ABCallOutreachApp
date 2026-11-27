'use client';
/* Outreach Manager > Reports (Outreach Manager: change, so the manager and administrators; not in the artifact).
 * Andrew's metrics for one day, by rep and for the team, against the same day of the week before:
 * Calls Made, Connects, New Leads, Dial to Connect and Connect to Lead, with a leaderboard per metric.
 * The content follows the daily report Andrew gets from Orum (docs/andrew). The numbers come from the
 * metrics service (lib/domain/report.ts), which reads a call source: today the results recorded in
 * the app. Nothing is emailed or written to monday from here. */
import type React from 'react';
import { PEO, REPORT_METRICS, appCallSource, dailyReport, fmtRate, fmtS, pacificDay, trend, type ReportKey, type ReportMetrics } from '@/lib/domain';
import { can } from '@/lib/state/auth';
import { on } from '@/lib/state/actions';
import { S } from '@/lib/state/store';
import { Avatar, DateField, Icon, PageHeader } from '@/components/ui';

/** The Outreach Manager or an administrator (mgr.manage). */
const allowed = () => can('mgr.manage');
export const reportDay = () => (S.f.repd as string) || pacificDay();
const val = (m: ReportMetrics, k: ReportKey) => REPORT_METRICS.find(x => x.k === k)!.rate ? fmtRate(m[k]) : String(m[k] ?? 0);

/** "+3 vs last week", in points for a rate; nothing to compare when either side has no rate. */
function Trend({ m, prev, k, day }: { m: ReportMetrics; prev: ReportMetrics; k: ReportKey; day: string }) {
  const t = trend(m, prev, k), rate = REPORT_METRICS.find(x => x.k === k)!.rate;
  if (t == null) return <small className="rtrend">No comparison with {fmtS(day)}</small>;
  const cls = t > 0 ? 'up' : t < 0 ? 'down' : '';
  return <small className={`rtrend ${cls}`} data-trend={t}>{t > 0 ? '▲ ' : t < 0 ? '▼ ' : ''}{t === 0 ? 'Same' : Math.abs(t) + (rate ? ' pts' : '')} vs {fmtS(day)} ({val(prev, k)})</small>;
}

export function ReportsPage() {
  if (!allowed()) return <div className="empty">Only the Outreach Manager or an administrator can see Reports.</div>;
  const day = reportDay(), today = pacificDay();
  const r = dailyReport(appCallSource, day);
  const cell = (m: ReportMetrics, prev: ReportMetrics, k: ReportKey): React.ReactNode => <td className="n" key={k}><b>{val(m, k)}</b><br /><small className="muted">{val(prev, k)} last week</small></td>;
  return <>
    <PageHeader t="Reports" sub={`Calls Made, Connects and New Leads by rep for one day, against the same day of the week before. Source: ${r.source.toLowerCase()}.`} />
    <div className="rbar" data-report-bar>
      <button className="rnav" {...on('repnav', -1)} aria-label="Previous day"><Icon n="chl" s={16} /></button>
      <div className="rday" data-report-day><DateField k="repday" value={day} onSet={v => { S.f.repd = v; }} /></div>
      <button className="rnav" {...on('repnav', 1)} aria-label="Next day" disabled={day >= today}><Icon n="chr" s={16} /></button>
      {day !== today ? <button className="rnav rnow" {...on('repnow')}>Today</button> : null}
    </div>

    <h3 className="rsec">Activity</h3>
    <div className="rstats" data-activity>{REPORT_METRICS.filter(x => !x.rate).map(x => <div key={x.k} className="stat" data-metric={x.k}><small>{x.n}</small><b>{val(r.team.m, x.k)}</b><Trend m={r.team.m} prev={r.team.prev} k={x.k} day={r.prevDay} /></div>)}</div>
    <h3 className="rsec">Conversion rates</h3>
    <div className="rstats" data-rates>{REPORT_METRICS.filter(x => x.rate).map(x => <div key={x.k} className="stat" data-metric={x.k}><small>{x.n}</small><b>{val(r.team.m, x.k)}</b><Trend m={r.team.m} prev={r.team.prev} k={x.k} day={r.prevDay} /></div>)}</div>

    <h3 className="rsec">Leaderboard</h3>
    <div className="rboard" data-leaderboard>{REPORT_METRICS.map(x => <div key={x.k} className="card" data-rank={x.k}><h3>{x.n}</h3><ol>{r.rank[x.k].map(e => <li key={e.rep}><span className="pl">{e.place}</span><Avatar k={e.rep} sm /><span className="nm">{PEO[e.rep].n}</span><b>{x.rate ? fmtRate(e.v) : e.v}</b></li>)}</ol></div>)}</div>

    <h3 className="rsec">By rep</h3>
    <div className="card p-0 overflow-x-auto"><table className="ptbl" data-report-table><tbody>
      <tr><th>Rep</th>{REPORT_METRICS.map(x => <th key={x.k} className="n">{x.n}</th>)}</tr>
      {r.reps.map(x => <tr key={x.rep} data-rep={x.rep}><td><span className="inline-flex gap-[8px] items-center"><Avatar k={x.rep} sm />{PEO[x.rep].n}</span></td>{REPORT_METRICS.map(m => cell(x.m, x.prev, m.k))}</tr>)}
      <tr className="tot" data-rep="team"><td>Team</td>{REPORT_METRICS.map(m => cell(r.team.m, r.team.prev, m.k))}</tr>
    </tbody></table></div>

  </>;
}
