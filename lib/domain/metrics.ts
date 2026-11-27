/* ===== METRICS (one calculation for the dashboard, the rep view and the emails) ===== (artifact/app.html) */
import { OUT, isConnectOut, isLeadOut } from './catalogs';
import { CALLS, type Call } from './data';
import { D, TODAY, addDays, isBiz, iso, pct } from './dates';
import { REPS, type RepKey } from './people';
import { rint, rnd } from './seed';

export type Metrics = { calls: number; con: number; conv: number; leads: number; d2c: string; c2v: string; v2l: string };
/** From the catalog: "Counts as a connect" (Call outcomes). */
export const isConnect = (o: string) => isConnectOut(o);
export const isConvo = (o: string) => !!OUT[o] && OUT[o].group === 'conv';
export const isLead = (o: string) => isLeadOut(o);
export function mOf(calls: Call[]): Metrics {
  const m = { calls: calls.length, con: calls.filter(x => isConnect(x.out)).length, conv: calls.filter(x => isConvo(x.out)).length, leads: calls.filter(x => isLead(x.out)).length } as Metrics;
  m.d2c = pct(m.con, m.calls); m.c2v = pct(m.conv, m.con); m.v2l = pct(m.leads, m.conv);
  return m;
}
export const callsOn = (rep: RepKey | null, day: string) => CALLS.filter(x => (!rep || x.rep === rep) && x.at.slice(0, 10) === day);

type DayRow = { calls: number; con: number; conv: number; leads: number };
/* Past days: totals logged by the dialer before the app, at today's real pace (about 108 calls a day) */
export type { DayRow };
export const DAYM: Record<string, Record<RepKey, DayRow>> = {};
export const resetDaym = () => { for (const k of Object.keys(DAYM)) delete DAYM[k]; };
/** The last 10 business days before TODAY. */
export function pastDays(): string[] {
  let d = D(TODAY)!;
  const days: string[] = [];
  while (days.length < 10) { d = addDays(d, -1); if (isBiz(d)) days.push(iso(d)); }
  return days.reverse();
}
export const lastDay = () => { const p = pastDays(); return p[p.length - 1]; };
/** Fills DAYM. Draws from the seed, so world.ts calls it at the artifact's point in the sequence. */
export function buildDaym() {
  const base: Record<RepKey, number[]> = { may: [112, .27, .14, .45], dan: [104, .24, .12, .4], pri: [96, .29, .15, .35] };
  for (const day of pastDays()) {
    DAYM[day] = {} as Record<RepKey, DayRow>;
    for (const r of REPS) {
      const [cl, cr, vr, lr] = base[r];
      const calls = cl + rint(-14, 12);
      const con = Math.round(calls * (cr + (rnd() - .5) * .06));
      const conv = Math.max(1, Math.round(con * (vr + (rnd() - .5) * .08)));
      const leads = Math.round(conv * (lr + (rnd() - .5) * .3));
      DAYM[day][r] = { calls, con, conv, leads: Math.max(0, Math.min(conv, leads)) };
    }
  }
}
export function mDay(rep: RepKey | null, day: string): Metrics {
  // Today, and any day without the dialer's seeded totals, come from the call log
  if (day === TODAY || !DAYM[day]) return mOf(callsOn(rep, day));
  const rows = rep ? [DAYM[day][rep]] : REPS.map(r => DAYM[day][r]);
  const m = rows.reduce((a, x) => ({ calls: a.calls + x.calls, con: a.con + x.con, conv: a.conv + x.conv, leads: a.leads + x.leads }), { calls: 0, con: 0, conv: 0, leads: 0 }) as Metrics;
  m.d2c = pct(m.con, m.calls); m.c2v = pct(m.conv, m.con); m.v2l = pct(m.leads, m.conv);
  return m;
}
