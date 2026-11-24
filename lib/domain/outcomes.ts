/* ===== CALL OUTCOMES: the catalog (collection `outcomes`) =====
 * Every outcome and what it does is data: the app reads the catalog from the database (fromDocs) and
 * an administrator edits it (Outreach Manager, Call outcomes). No list of outcomes lives in the code;
 * DEFAULT_OUTCOMES is only the seed, with the values the app used before the catalog existed. */
import type { Pri, Status, Tone } from './catalogs';

export type OutcomeDef = {
  /** Shown to the rep; false = not offered any more, history keeps it. */
  active: boolean;
  /** The call adds one attempt to the contact (rule: every call counts). */
  countsAsAttempt: boolean;
  /** Days until the contact can be called again (minimum 1). */
  recallDays: number;
  /** recallDays are calendar days (true) or business days, Monday to Friday (false). */
  calendarDays: boolean;
  /** Who else leaves the lists: nobody, the rest of the property, or every property of the person. */
  propagates: 'none' | 'property' | 'person';
  /** The rep must set the date and time of the follow-up. */
  needsFollowUp: boolean;
  /** The property goes to AB sales as a Potential Lead. */
  lead: boolean;
  /** The contact is never called again. */
  final: boolean;
  /** Comes back to the same rep (their follow-ups). */
  sameRep: boolean;
  /** Priority when it comes back (P2, permit issued, is set by the property). Null: P5. */
  pri: Pri | null;
  /** Nobody answered, connected, or a conversation (metrics). */
  group: 'none' | 'con' | 'conv';
  /** Outreach status it gives the property. */
  status: Status;
  /** The number that was called: marked wrong, marked working, or unchanged. */
  phone: 'bad' | 'ok' | 'keep';
  /** Marks "Construction started" on the property. */
  started: boolean;
  /** Shown as "proposed" (not confirmed by AB yet). */
  proposed: boolean;
  tone: Tone;
  hint: string;
};
export type OutcomeDoc = OutcomeDef & { _id: string; pos: number };

const o = (x: Partial<OutcomeDef> & Pick<OutcomeDef, 'group' | 'status' | 'tone' | 'hint'>): OutcomeDef => ({
  active: true, countsAsAttempt: true, recallDays: 1, calendarDays: false, propagates: 'none', needsFollowUp: false, lead: false, final: false,
  sameRep: false, pri: null, phone: 'ok', started: false, proposed: false, ...x,
});

/** Seed of the catalog: the 11 outcomes with the values the app used until now. */
export const DEFAULT_OUTCOMES: [string, OutcomeDef][] = [
  ['Not Contacted', o({ group: 'none', status: 'Not Contacted', tone: 'n', hint: 'No answer, no voicemail', recallDays: 1, phone: 'keep' })],
  ['Left VM', o({ group: 'none', status: 'Not Contacted', tone: 'b', hint: 'Voicemail left', recallDays: 3, phone: 'keep', pri: 'P4' })],
  ['Wrong Number', o({ group: 'none', status: 'Not Contacted', tone: 'n', hint: 'Number is not theirs', recallDays: 1, phone: 'bad' })],
  ['Hung Up', o({ group: 'con', status: 'Not Contacted', tone: 'n', hint: 'Answered, no conversation', recallDays: 2, proposed: true })],
  ['Undecided', o({ group: 'conv', status: 'Contacted', tone: 'a', hint: 'Talked, not sure yet', recallDays: 10, calendarDays: true, sameRep: true, pri: 'P3' })],
  ['Follow Up', o({ group: 'conv', status: 'Contacted', tone: 'a', hint: 'Asked for a call back', recallDays: 2, needsFollowUp: true, sameRep: true, pri: 'P1' })],
  ['Working on Plans', o({ group: 'conv', status: 'Potential Lead', tone: 'g', hint: 'Has an architect or plans', lead: true, propagates: 'property' })],
  ['Interested', o({ group: 'conv', status: 'Potential Lead', tone: 'g', hint: 'Wants to talk to AB', lead: true, propagates: 'property' })],
  ['Not Interested', o({ group: 'conv', status: 'Not Interested', tone: 'r', hint: 'Said no for now', recallDays: 180, calendarDays: true, propagates: 'property', proposed: true })],
  ['Already Building / Done', o({ group: 'conv', status: 'Not Interested', tone: 'r', hint: 'Has a builder or sold', final: true, propagates: 'property', started: true })],
  ['Do Not Contact', o({ group: 'conv', status: 'Not Interested', tone: 'r', hint: 'Asked not to be called', final: true, propagates: 'person' })],
];
