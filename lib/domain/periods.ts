/* Performance by period (not in the artifact, which showed one day): day, week, month or year.
 * Totals add up every day of the period up to today; a day uses the dialer's seeded totals when it
 * has them (DAYM) and the call log otherwise (mDay). */
import { Dx, MON, MONL, TODAY, WD, addDays, fmtS, fmtWD, isBiz, iso, pct } from './dates';
import { mDay, type Metrics } from './metrics';
import type { RepKey } from './people';

export type PeriodKind = 'day' | 'week' | 'month' | 'year';
export const PERIODS: [PeriodKind, string][] = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']];

const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7)); // Monday
/** First and last day of the period that contains `anchor`. */
export function periodRange(kind: PeriodKind, anchor: string): [string, string] {
  const a = Dx(anchor);
  if (kind === 'day') return [anchor, anchor];
  if (kind === 'week') { const s = startOfWeek(a); return [iso(s), iso(addDays(s, 6))]; }
  if (kind === 'month') return [iso(new Date(a.getFullYear(), a.getMonth(), 1)), iso(new Date(a.getFullYear(), a.getMonth() + 1, 0))];
  return [`${a.getFullYear()}-01-01`, `${a.getFullYear()}-12-31`];
}
/** Every day of the period up to today (the future has no calls). */
export function periodDays(kind: PeriodKind, anchor: string) {
  const [from, to] = periodRange(kind, anchor);
  const days: string[] = [];
  for (let d = Dx(from); iso(d) <= to && iso(d) <= TODAY; d = addDays(d, 1)) days.push(iso(d));
  return days;
}
export function sumDays(rep: RepKey | null, days: string[]): Metrics {
  const m = days.map(d => mDay(rep, d)).reduce((a, x) => ({ calls: a.calls + x.calls, con: a.con + x.con, conv: a.conv + x.conv, leads: a.leads + x.leads }), { calls: 0, con: 0, conv: 0, leads: 0 }) as Metrics;
  m.d2c = pct(m.con, m.calls); m.c2v = pct(m.conv, m.con); m.v2l = pct(m.leads, m.conv);
  return m;
}
export const periodMetrics = (rep: RepKey | null, kind: PeriodKind, anchor: string) => sumDays(rep, periodDays(kind, anchor));

export function periodLabel(kind: PeriodKind, anchor: string) {
  const a = Dx(anchor);
  if (kind === 'day') return anchor === TODAY ? `Today, ${fmtS(anchor)}` : fmtWD(anchor);
  if (kind === 'week') { const [f, t] = periodRange('week', anchor); return `${fmtS(f)} – ${fmtS(t)}`; }
  if (kind === 'month') return `${MONL[a.getMonth()]} ${a.getFullYear()}`;
  return String(a.getFullYear());
}
/** The same kind of period, `dir` steps before (-1) or after (1). */
export function shiftPeriod(kind: PeriodKind, anchor: string, dir: number) {
  const a = Dx(anchor);
  if (kind === 'day') { let d = addDays(a, dir); while (!isBiz(d)) d = addDays(d, dir); return iso(d); }
  if (kind === 'week') return iso(addDays(a, 7 * dir));
  if (kind === 'month') return iso(new Date(a.getFullYear(), a.getMonth() + dir, 1));
  return iso(new Date(a.getFullYear() + dir, 0, 1));
}
/** True when the period already reaches today (nothing after it to look at). */
export const isCurrentPeriod = (kind: PeriodKind, anchor: string) => periodRange(kind, anchor)[1] >= TODAY;

export type Bucket = { key: string; label: string; title: string; days: string[]; future: boolean; drill?: [PeriodKind, string]; current?: boolean };
/** The bars of the chart for a period. */
export function periodBuckets(kind: PeriodKind, anchor: string): Bucket[] {
  const day = (d: string, current = false): Bucket => ({ key: d, label: fmtS(d), title: fmtWD(d), days: d <= TODAY ? [d] : [], future: d > TODAY, drill: d <= TODAY ? ['day', d] : undefined, current });
  if (kind === 'day') {
    // The 10 business days that end on the chosen day
    const out: string[] = [];
    for (let d = Dx(anchor); out.length < 10; d = addDays(d, -1)) if (isBiz(d)) out.unshift(iso(d));
    return out.map(d => day(d, d === anchor));
  }
  if (kind === 'week' || kind === 'month') {
    const [from, to] = periodRange(kind, anchor);
    const out: Bucket[] = [];
    for (let d = Dx(from); iso(d) <= to; d = addDays(d, 1)) {
      const s = iso(d);
      if (!isBiz(d) && !(d <= Dx(TODAY) && mDay(null, s).calls)) continue; // weekends only when someone called
      const b = day(s, s === TODAY);
      if (kind === 'week') b.label = `${WD[d.getDay()]} ${d.getDate()}`; else b.label = String(d.getDate());
      out.push(b);
    }
    return out;
  }
  const y = Dx(anchor).getFullYear();
  return Array.from({ length: 12 }, (_, m) => {
    const first = iso(new Date(y, m, 1));
    return { key: first, label: MON[m], title: `${MONL[m]} ${y}`, days: periodDays('month', first), future: first > TODAY, drill: first > TODAY ? undefined : ['month', first] as [PeriodKind, string], current: first.slice(0, 7) === TODAY.slice(0, 7) };
  });
}
export const chartTitle = (kind: PeriodKind, anchor: string) =>
  kind === 'day' ? 'Team, 10 business days to ' + fmtS(anchor) : kind === 'week' ? 'Team, week of ' + fmtS(periodRange('week', anchor)[0]) + ', by day' : kind === 'month' ? `Team, ${periodLabel('month', anchor)}, by day` : `Team, ${periodLabel('year', anchor)}, by month`;
