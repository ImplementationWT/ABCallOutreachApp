/* ===== CAMPAIGNS ===== (artifact/app.html; permanent campaigns agreed with Andrew)
 * A campaign is created once and stays active until someone pauses or ends it; several can be active
 * at the same time. It says which contacts it includes (its audiences) and which reps work it.
 * Creating campaigns and the daily allocation are separate: each allocation takes the contacts of
 * every active campaign of the rep together (engine.ts, freeGroups). Pausing or ending a campaign
 * stops new assignments of its contacts; the history (calls, follow-ups) is kept.
 * The daily campaigns that existed before (with `date`) are ended by the migration and kept as history. */
import { AUDS, type AudKey } from './catalogs';
import { T0, iso, subBiz } from './dates';
import type { RepKey } from './people';

export type CampStatus = 'active' | 'paused' | 'ended';
export const CAMP_ST: Record<CampStatus, { n: string; tone: string }> = {
  active: { n: 'Active', tone: 'green dot' }, paused: { n: 'Paused', tone: 'amber' }, ended: { n: 'Ended', tone: 'ink' },
};
export type Campaign = {
  k: string;
  /** Name shown to the team; empty = the names of its audiences. */
  n?: string;
  status: CampStatus;
  auds: AudKey[]; reps: RepKey[]; goal: number;
  /** Day it was created ('YYYY-MM-DD'). */
  created?: string;
  /** Day of the last status change (paused, resumed or ended). */
  since?: string | null;
  /** Daily campaigns from before (history): the day they ran. */
  date?: string;
  past?: boolean;
};

/** The seeded campaigns: two active ones (same audiences and reps as the artifact's day) and three
 * daily campaigns of the two business days before, ended (history). Relative to T0. */
const campKey = (date: string, n: number) => 'C-' + date.slice(5).replace('-', '') + '-' + String.fromCharCode(65 + n);
const seedCampaigns = (): Campaign[] => {
  const d1 = iso(subBiz(T0, 1)), d2 = iso(subBiz(T0, 2));
  return [
    { k: 'C-PPSM', status: 'active', auds: ['pp', 'sm'], reps: ['may'], goal: 1, created: d2, since: null },
    { k: 'C-ADMB', status: 'active', auds: ['ad', 'mb'], reps: ['dan', 'pri'], goal: 1, created: d2, since: null },
    { k: campKey(d1, 0), status: 'ended', date: d1, auds: ['pp', 'sm'], reps: ['may', 'dan'], goal: 1, past: true, since: d1 },
    { k: campKey(d1, 1), status: 'ended', date: d1, auds: ['ad', 'mb'], reps: ['pri'], goal: 1, past: true, since: d1 },
    { k: campKey(d2, 0), status: 'ended', date: d2, auds: ['pp'], reps: ['may', 'dan', 'pri'], goal: 1, past: true, since: d2 },
  ];
};
export const CAMPS: Campaign[] = [];
export const resetCampaigns = () => { CAMPS.length = 0; CAMPS.push(...seedCampaigns()); };
export const activeCamps = () => CAMPS.filter(c => c.status === 'active');
/** The active campaigns a rep works. */
export const campsOf = (rep: RepKey) => activeCamps().filter(c => c.reps.includes(rep));
/** The audiences of every active campaign of the rep, together (a contact in two of them counts once). */
export const audsOf = (rep: RepKey) => new Set(campsOf(rep).flatMap(c => c.auds));
export const campName = (c: Campaign) => c.n || c.auds.map(a => AUDS[a].s).join(' and ');
/** The rep's active campaigns by name, or null when they are in none. */
export const campsName = (rep: RepKey) => { const cs = campsOf(rep); return cs.length ? cs.map(campName).join(', ') : null; };
/** A new key for a campaign: C-0001, C-0002... (the seeded and the old daily ones have other shapes). */
export const newCampKey = () => {
  const n = Math.max(0, ...CAMPS.map(c => /^C-(\d{4})$/.exec(c.k)).filter(Boolean).map(m => Number(m![1])));
  return 'C-' + String(n + 1).padStart(4, '0');
};
