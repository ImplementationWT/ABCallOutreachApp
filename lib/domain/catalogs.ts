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
/* Call outcomes: the catalog is data (collection `outcomes`, see outcomes.ts). OUT and OUTK are
 * filled by fromDocs() from the database, or by buildWorld() from the seed. */
import { withConnect, type OutcomeDef } from './outcomes';
export type { OutcomeDef, OutcomeDoc } from './outcomes';
export type Outcome = string;
export const OUT: Record<string, OutcomeDef> = {};
/** Outcome names in catalog order. */
export const OUTK: string[] = [];
export function setOutcomes(list: [string, OutcomeDef][]) {
  for (const k of Object.keys(OUT)) delete OUT[k];
  OUTK.length = 0;
  for (const [k, d] of list) { OUT[k] = withConnect(d); OUTK.push(k); }
}
/** The outcomes a rep can pick (inactive ones stay in OUT for the history). */
export const activeOutcomes = () => OUTK.filter(k => OUT[k].active);
/** The property goes to sales. */
export const isLeadOut = (o?: string | null) => !!o && !!OUT[o]?.lead;
/** A person answered (metrics: Connects). */
export const isConnectOut = (o?: string | null) => !!o && !!OUT[o]?.connect;
/** A "no": the rest of the property (or every property of the person) leaves the lists. */
export const isNoOut = (o?: string | null) => !!o && !!OUT[o] && !OUT[o].lead && OUT[o].propagates !== 'none';
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
