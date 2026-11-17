/* ===== CAMPAIGNS ===== (artifact/app.html) */
import { AUDS, type AudKey } from './catalogs';
import { T0, TODAY, iso, subBiz } from './dates';
import type { RepKey } from './people';

export type Campaign = { k: string; date: string; auds: AudKey[]; reps: RepKey[]; goal: number; past?: boolean };

/** The seeded campaigns: two today and three on the two business days before (relative to T0). */
const campKey = (date: string, n: number) => 'C-' + date.slice(5).replace('-', '') + '-' + String.fromCharCode(65 + n);
const seedCampaigns = (): Campaign[] => {
  const d1 = iso(subBiz(T0, 1)), d2 = iso(subBiz(T0, 2));
  return [
    { k: campKey(TODAY, 0), date: TODAY, auds: ['pp', 'sm'], reps: ['may'], goal: 1 },
    { k: campKey(TODAY, 1), date: TODAY, auds: ['ad', 'mb'], reps: ['dan', 'pri'], goal: 1 },
    { k: campKey(d1, 0), date: d1, auds: ['pp', 'sm'], reps: ['may', 'dan'], goal: 1, past: true },
    { k: campKey(d1, 1), date: d1, auds: ['ad', 'mb'], reps: ['pri'], goal: 1, past: true },
    { k: campKey(d2, 0), date: d2, auds: ['pp'], reps: ['may', 'dan', 'pri'], goal: 1, past: true },
  ];
};
export const CAMPS: Campaign[] = [];
export const resetCampaigns = () => { CAMPS.length = 0; CAMPS.push(...seedCampaigns()); };
export const campOf = (rep: RepKey) => CAMPS.find(c => !c.past && c.date === TODAY && c.reps.includes(rep));
export const campName = (c: Campaign) => c.auds.map(a => AUDS[a].s).join(' and ');
