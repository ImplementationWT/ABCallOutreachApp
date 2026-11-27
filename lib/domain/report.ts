/* ===== REPORTS: Andrew's metrics (Calls Made, Connects, New Leads) =====
 * Two parts, kept apart so the data can come from somewhere else without touching the calculations:
 *   - a CallSource gives the calls of a range of days as plain records (who, when, connect, lead);
 *   - the calculations (metricsOf, dailyReport) only read those records.
 * Today the source is the call results recorded in the app (appCallSource: the call log, with
 * connect and lead from the outcome catalog). Later a RingCentral source gives the same records.
 * Pure: no DOM, no driver. Content modeled on the daily report Andrew gets from Orum
 * (docs/andrew): leaderboard by metric, team activity, rates, and the table by rep, against last week. */
import { isConnectOut, isLeadOut } from './catalogs';
import { CALLS } from './data';
import { addDays, iso } from './dates';
import { REPS, type RepKey } from './people';

/** One call as the calculations see it. */
export type CallRecord = { rep: string; at: string; connect: boolean; lead: boolean };
export interface CallSource {
  /** Shown under the report: where the numbers come from. */
  readonly name: string;
  /** Calls made from day `from` to day `to` (both included, 'YYYY-MM-DD'). */
  calls(from: string, to: string): CallRecord[];
}

/** Today's source: every result recorded in the app (one call each). */
export const appCallSource: CallSource = {
  name: 'Call results recorded in the app',
  calls: (from, to) => CALLS.filter(x => { const d = x.at.slice(0, 10); return d >= from && d <= to; })
    .map(x => ({ rep: x.rep, at: x.at, connect: isConnectOut(x.out), lead: isLeadOut(x.out) })),
};

export type ReportMetrics = {
  calls: number; connects: number; leads: number;
  /** Connects / Calls Made, and New Leads / Connects: a fraction, or null with nothing to divide by. */
  d2c: number | null; c2l: number | null;
};
export type ReportKey = keyof ReportMetrics;
export const REPORT_METRICS: { k: ReportKey; n: string; rate?: boolean }[] = [
  { k: 'calls', n: 'Calls Made' }, { k: 'connects', n: 'Connects' }, { k: 'leads', n: 'New Leads' },
  { k: 'd2c', n: 'Dial to Connect', rate: true }, { k: 'c2l', n: 'Connect to Lead', rate: true },
];

export function metricsOf(rs: CallRecord[]): ReportMetrics {
  const calls = rs.length, connects = rs.filter(r => r.connect).length, leads = rs.filter(r => r.lead).length;
  return { calls, connects, leads, d2c: calls ? connects / calls : null, c2l: connects ? leads / connects : null };
}

export type RepRow = { rep: RepKey; m: ReportMetrics; prev: ReportMetrics };
export type Ranked = { rep: RepKey; v: number | null; place: number };
export type DailyReport = {
  day: string;
  /** The same day of the week before (the comparison). */
  prevDay: string;
  source: string;
  reps: RepRow[];
  team: { m: ReportMetrics; prev: ReportMetrics };
  /** Leaderboard by metric: best first; equal values share the place; reps without a rate go last. */
  rank: Record<ReportKey, Ranked[]>;
};

/** The day's report by rep, with the team total, a ranking per metric and the same day a week before. */
export function dailyReport(src: CallSource, day: string, reps: RepKey[] = REPS): DailyReport {
  const prevDay = iso(addDays(day, -7));
  const now = src.calls(day, day), before = src.calls(prevDay, prevDay);
  const ofRep = (rs: CallRecord[], r: RepKey) => metricsOf(rs.filter(x => x.rep === r));
  const rows: RepRow[] = reps.map(rep => ({ rep, m: ofRep(now, rep), prev: ofRep(before, rep) }));
  const inTeam = (rs: CallRecord[]) => rs.filter(x => (reps as string[]).includes(x.rep));
  const rank = {} as Record<ReportKey, Ranked[]>;
  for (const { k } of REPORT_METRICS) {
    const sorted = rows.map(r => ({ rep: r.rep, v: r.m[k] })).sort((a, b) => (b.v ?? -1) - (a.v ?? -1) || reps.indexOf(a.rep) - reps.indexOf(b.rep));
    rank[k] = sorted.map(x => ({ ...x, place: 1 + sorted.findIndex(y => y.v === x.v) }));
  }
  return { day, prevDay, source: src.name, reps: rows, team: { m: metricsOf(inTeam(now)), prev: metricsOf(inTeam(before)) }, rank };
}

/** "12%", or "–" when there is nothing to divide by. */
export const fmtRate = (v: number | null) => v == null ? '–' : Math.round(v * 100) + '%';
/** Change against last week: counts in units, rates in percentage points. null when either side has no rate. */
export function trend(m: ReportMetrics, prev: ReportMetrics, k: ReportKey): number | null {
  const a = m[k], b = prev[k];
  if (a == null || b == null) return null;
  return REPORT_METRICS.find(x => x.k === k)!.rate ? Math.round(a * 100) - Math.round(b * 100) : a - b;
}

/** Today's date in California ('YYYY-MM-DD'): the default day of Reports. */
export const pacificDay = (d: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
