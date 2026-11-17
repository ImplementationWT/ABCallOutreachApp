/* ===== PEOPLE ===== (artifact/app.html) */
export type PersonKey = 'may' | 'dan' | 'pri' | 'and' | 'off';
export type RepKey = 'may' | 'dan' | 'pri';
export type Person = { n: string; i: string; c: string; r: string };

export const PEO: Record<PersonKey, Person> = {
  may: { n: 'Maya Torres', i: 'MT', c: 'g', r: 'Sales rep' },
  dan: { n: 'Daniel Brooks', i: 'DB', c: 'a', r: 'Sales rep' },
  pri: { n: 'Priya Shah', i: 'PS', c: 'v', r: 'Sales rep' },
  and: { n: 'Andrew Vaitkevicius', i: 'AV', c: '', r: 'Growth and sales, AB' },
  off: { n: 'AB office', i: 'AB', c: 'g', r: 'Inbound calls' },
};
export const REPS: RepKey[] = ['may', 'dan', 'pri'];
export const first = (k: PersonKey) => PEO[k].n.split(' ')[0];
