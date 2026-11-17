/* ===== CATALOGS ===== (artifact/app.html) */
export type AudKey = 'pp' | 'sm' | 'mb' | 'ad';
export type Audience = { n: string; s: string; city: string; ac: string[]; streets: string[] };

export const AUDS: Record<AudKey, Audience> = {
  pp: { n: 'Pacific Palisades - Fire Rebuild', s: 'Pacific Palisades', city: 'Pacific Palisades, CA 90272', ac: ['310', '424'], streets: ['Marquette Ridge Rd', 'Bluffview Ter', 'Arbolada Way', 'Corsica Hill Dr', 'Avenida Lucero', 'Granada Crest Pl', 'Halden Ave', 'Seacliff Hollow Rd'] },
  sm: { n: 'Sunset Mesa - Fire Rebuild', s: 'Sunset Mesa', city: 'Malibu, CA 90265', ac: ['310'], streets: ['Mesa Vista Ct', 'Tidecrest Dr', 'Cliffhaven Rd', 'Sea Meadow Ln'] },
  mb: { n: 'Malibu - Fire Rebuild', s: 'Malibu', city: 'Malibu, CA 90265', ac: ['310', '424'], streets: ['Seabright Canyon Rd', 'Coral Heights Ln', 'Paseo Marino', 'Driftwood Ridge Rd'] },
  ad: { n: 'Altadena - Fire Rebuild', s: 'Altadena', city: 'Altadena, CA 91001', ac: ['626'], streets: ['Lantana Grove St', 'Crestmoor Ave', 'Poppyfield Dr', 'Canyon Oak Rd', 'Juniper Hollow Ln'] },
};
export const AUDK = Object.keys(AUDS) as AudKey[];

export type Status = 'Not Contacted' | 'Contacted' | 'Not Interested' | 'Potential Lead';
export type Tone = 'n' | 'b' | 'a' | 'g' | 'r';
export type OutcomeDef = { g: 'none' | 'con' | 'conv'; st: Status; tone: Tone; hint: string; prop?: boolean };

/* Call outcomes (dispositions). grp: none = no one answered, con = connected, conv = conversation */
export const OUT = {
  'Not Contacted': { g: 'none', st: 'Not Contacted', tone: 'n', hint: 'No answer, no voicemail' },
  'Left VM': { g: 'none', st: 'Not Contacted', tone: 'b', hint: 'Voicemail left' },
  'Wrong Number': { g: 'none', st: 'Not Contacted', tone: 'n', hint: 'Number is not theirs' },
  'Hung Up': { g: 'con', st: 'Not Contacted', tone: 'n', hint: 'Answered, no conversation', prop: true },
  'Undecided': { g: 'conv', st: 'Contacted', tone: 'a', hint: 'Talked, not sure yet' },
  'Follow Up': { g: 'conv', st: 'Contacted', tone: 'a', hint: 'Asked for a call back' },
  'Working on Plans': { g: 'conv', st: 'Potential Lead', tone: 'g', hint: 'Has an architect or plans' },
  'Interested': { g: 'conv', st: 'Potential Lead', tone: 'g', hint: 'Wants to talk to AB' },
  'Not Interested': { g: 'conv', st: 'Not Interested', tone: 'r', hint: 'Said no for now', prop: true },
  'Already Building / Done': { g: 'conv', st: 'Not Interested', tone: 'r', hint: 'Has a builder or sold' },
  'Do Not Contact': { g: 'conv', st: 'Not Interested', tone: 'r', hint: 'Asked not to be called' },
} satisfies Record<string, OutcomeDef> as Record<string, OutcomeDef>;
export type Outcome = keyof typeof OUT;
export const OUTK = Object.keys(OUT);
export const NO_OUT = ['Not Interested', 'Already Building / Done', 'Do Not Contact'];
export const LEAD_OUT = ['Working on Plans', 'Interested'];
export const ST_RANK: Record<Status, number> = { 'Not Contacted': 0, 'Contacted': 1, 'Not Interested': 2, 'Potential Lead': 3 };
export const ST_TONE: Record<Status, string> = { 'Not Contacted': '', 'Contacted': 'amber', 'Not Interested': 'red', 'Potential Lead': 'green' };

export type Pri = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export const PRI: Record<Pri, { n: string; who: string; d: string }> = {
  P1: { n: 'Follow Up', who: 'Original rep', d: 'Call Outcome: Follow Up, on the date the rep set' },
  P2: { n: 'Permit Issued', who: 'Any rep', d: 'Permit Status: Issued' },
  P3: { n: 'Undecided', who: 'Original rep', d: 'Call Outcome: Undecided' },
  P4: { n: 'Left VM', who: 'Any rep', d: 'Call Outcome: Left VM' },
  P5: { n: 'Not Contacted', who: 'Any rep', d: 'Call Outcome: Not Contacted, or never called' },
};
export const PRANK: Record<Pri, number> = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 };
