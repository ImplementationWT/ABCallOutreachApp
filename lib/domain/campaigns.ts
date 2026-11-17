/* ===== CAMPAIGNS ===== (artifact/app.html) */
import { AUDS, type AudKey } from './catalogs';
import { TODAY } from './dates';
import type { RepKey } from './people';

export type Campaign = { k: string; date: string; auds: AudKey[]; reps: RepKey[]; goal: number; past?: boolean };

const CAMPS0: Campaign[] = [
  { k: 'C-1102-A', date: TODAY, auds: ['pp', 'sm'], reps: ['may'], goal: 1 },
  { k: 'C-1102-B', date: TODAY, auds: ['ad', 'mb'], reps: ['dan', 'pri'], goal: 1 },
  { k: 'C-1030-A', date: '2026-10-30', auds: ['pp', 'sm'], reps: ['may', 'dan'], goal: 1, past: true },
  { k: 'C-1030-B', date: '2026-10-30', auds: ['ad', 'mb'], reps: ['pri'], goal: 1, past: true },
  { k: 'C-1029-A', date: '2026-10-29', auds: ['pp'], reps: ['may', 'dan', 'pri'], goal: 1, past: true },
];
export const CAMPS: Campaign[] = CAMPS0.map(c => ({ ...c }));
export const resetCampaigns = () => { CAMPS.length = 0; CAMPS.push(...CAMPS0.map(c => ({ ...c }))); };
export const campOf = (rep: RepKey) => CAMPS.find(c => !c.past && c.date === TODAY && c.reps.includes(rep));
export const campName = (c: Campaign) => c.auds.map(a => AUDS[a].s).join(' and ');
