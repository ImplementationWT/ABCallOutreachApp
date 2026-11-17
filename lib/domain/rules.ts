/* ===== RULES (Andrew edits them in Outreach Manager, Rules) ===== (artifact/app.html) */
export type Config = {
  first: number; more: number; scale: number;
  maxAtt: number; refresh: string; endDay: string;
  rc: Record<string, number>;
  hours: string;
  [k: string]: unknown;
};

/** Mutable on purpose: the Rules page edits it in place and the next allocation reads it. */
const CFG0 = (): Config => ({
  first: 200, more: 100, scale: 0.07,
  maxAtt: 6, refresh: 'daily', endDay: 'pool',
  rc: { 'Not Contacted': 1, 'Left VM': 3, 'Hung Up': 2, 'Undecided': 10, 'Not Interested': 180 },
  hours: '9:00 AM to 7:00 PM Pacific, Monday to Saturday',
});
export const CFG: Config = CFG0();
export const resetRules = () => { for (const k of Object.keys(CFG)) delete CFG[k]; Object.assign(CFG, CFG0()); };
export const demoN = (n: number) => Math.max(1, Math.round(n * CFG.scale));
