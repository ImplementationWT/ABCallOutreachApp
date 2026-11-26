/* Sprint 18, C. Call Outcomes & Rules. Each test names the criterion it checks.
 * `it.fails` = the criterion is NOT met today: the test states the expected behaviour and is expected
 * to fail; when the gap is fixed it starts passing and vitest reports it, so it is flipped to `it`. */
import { beforeEach, describe, expect, it } from 'vitest';
import { C, CALLS, CFG, COLLECTIONS, DEFAULT_OUTCOMES, OUT, OUTK, P, activeOutcomes, elig, fromDocs, onHold, openOf, reactivate, saveOutcome, setClock, setToday, toDocs, type Doc, type OutcomeDef } from '../../lib/domain';
import { DAY0, TODAY0, ct, load, prop, started } from './fixture';

const D = (s: string) => new Date(s + 'T08:20');
const json = <T,>(x: T) => JSON.parse(JSON.stringify(x)) as T;
/** One property with three contacts (a household), two phones on A. */
function household() {
  load({
    props: [prop('P-1', 'pp'), prop('P-2', 'pp')],
    contacts: [ct('C-1', 'P-1', { n: 'Ann A' }), ct('C-2', 'P-1', { n: 'Bob A', role: 'Secondary owner' }), ct('C-3', 'P-1', { n: 'Cy A', role: 'Other' }), ct('C-4', 'P-2', { n: 'Dee B' })],
    workdays: started(),
  });
}
beforeEach(() => { setToday(DAY0); household(); });

describe('C1 configurable outcome catalog', () => {
  it('the catalog is a database collection (outcomes), seeded with the 11 outcomes', () => {
    expect(COLLECTIONS as readonly string[]).toContain('outcomes');
    expect(OUTK).toEqual(['Not Contacted', 'Left VM', 'Wrong Number', 'Hung Up', 'Undecided', 'Follow Up', 'Working on Plans', 'Interested', 'Not Interested', 'Already Building / Done', 'Do Not Contact']);
    expect(DEFAULT_OUTCOMES.map(([k]) => k)).toEqual(OUTK);
  });
  it('each outcome stores active, counts-as-attempt, recall days (>= 1), propagates and needs follow-up', () => {
    for (const k of OUTK) {
      const d = OUT[k] as OutcomeDef & Record<string, unknown>;
      for (const f of ['active', 'countsAsAttempt', 'recallDays', 'propagates', 'needsFollowUp']) expect(d, k).toHaveProperty(f);
      expect(d.recallDays, k).toBeGreaterThanOrEqual(1);
      expect(d.countsAsAttempt, k).toBe(k !== 'Wrong Number'); // agreed with Andrew: Wrong Number is not an attempt
    }
  });
  it('what an outcome does comes from the catalog in the database, not from the code', () => {
    const docs = json(toDocs());
    // a new outcome that stops the property and comes back in 3 calendar days
    docs.outcomes.push({ _id: 'Moved away', ...OUT['Not Interested'], recallDays: 3, calendarDays: true, proposed: false, hint: 'Does not live there', pos: 99 });
    // Hung Up deactivated
    docs.outcomes = docs.outcomes.map((o: Doc) => o._id === 'Hung Up' ? { ...o, active: false } : o);
    fromDocs(docs);
    expect(activeOutcomes()).toContain('Moved away');
    expect(activeOutcomes()).not.toContain('Hung Up');
    saveOutcome('C-1', 'may', 'Moved away', '');
    expect(C('C-1').nextAt).toBe('2026-11-05');
    for (const k of ['C-2', 'C-3']) expect(C(k).stop?.why).toBe('Ann A said Moved away');
  });
  it('deactivating an outcome keeps the history that used it', () => {
    saveOutcome('C-4', 'may', 'Hung Up', 'old call');
    const docs = json(toDocs());
    docs.outcomes = docs.outcomes.map((o: Doc) => o._id === 'Hung Up' ? { ...o, active: false } : o);
    fromDocs(docs);
    expect(CALLS.find(x => x.ct === 'C-4')?.out).toBe('Hung Up');
    expect(OUT['Hung Up']).toMatchObject({ active: false, status: 'Not Contacted' });
    expect(elig(C('C-4')).k).toBe('due');
  });
});

describe('C2 recall window per outcome', () => {
  const after = (out: string, fu?: string) => { saveOutcome('C-4', 'may', out, '', fu); return C('C-4').nextAt; };
  it('computes the next callable date from the rules (Mon Nov 2)', () => {
    expect(after('Not Contacted')).toBe('2026-11-03'); // 1 business day
  });
  it.each([
    ['Left VM', '2026-11-05'], // 3 business days
    ['Hung Up', '2026-11-04'], // 2 business days
    ['Undecided', '2026-11-12'], // 10 calendar days
    ['Not Interested', '2027-05-01'], // 180 calendar days
    ['Follow Up', '2026-11-04'], // no date given: 2 business days
    ['Interested', null], ['Working on Plans', null], ['Already Building / Done', null], ['Do Not Contact', null],
  ])('%s -> %s', (out, next) => { expect(after(out)).toBe(next); });
  it('Follow Up uses the date and time the rep picked (the day is the next callable date)', () => {
    expect(after('Follow Up', '2026-11-20T10:30')).toBe('2026-11-20');
    expect(C('C-4').fuAt).toBe('2026-11-20T10:30');
  });
  it('a follow-up later the same day brings the contact back to the list when its time comes', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1')], workdays: started(), reservations: [{ _id: `${TODAY0}:C-1`, ct: 'C-1', rep: 'may', date: TODAY0, order: 0, done: null }] });
    setClock(new Date(2026, 10, 2, 9, 0));
    saveOutcome('C-1', 'may', 'Follow Up', 'call me at 3', `${TODAY0}T15:00`);
    expect(openOf('may').map(c => c.k)).toEqual([]);
    setClock(new Date(2026, 10, 2, 15, 0));
    expect(openOf('may').map(c => c.k)).toEqual(['C-1']);
    setClock(null);
  });
  it('Wrong Number: next business day if another number works, on hold (no date) if not', () => {
    expect(after('Wrong Number')).toBeNull();
    expect(elig(C('C-4')).k).toBe('hold');
  });
  it('before the date the contact is out of the pool, from that date it is back', () => {
    after('Left VM');
    expect(elig(C('C-4')).k).toBe('due');
    setToday(D('2026-11-04')); expect(elig(C('C-4')).k).toBe('due');
    setToday(D('2026-11-05')); expect(elig(C('C-4')).ok).toBe(true);
  });
  it('every window comes from the catalog (rules no longer have recall days)', () => {
    expect(CFG).not.toHaveProperty('rc');
    OUT['Left VM'].recallDays = 5; expect(after('Left VM')).toBe('2026-11-09'); // 5 business days
    household(); OUT['Follow Up'].recallDays = 3; expect(after('Follow Up')).toBe('2026-11-05'); // no date: 3 business days
  });
  it('Wrong Number: the next number after its catalog window', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1')], workdays: started() });
    const c = C('C-1'); c.phones.push({ n: '(310) 555-9999', st: 'untested' });
    OUT['Wrong Number'].recallDays = 2;
    saveOutcome('C-1', 'may', 'Wrong Number', '');
    expect(C('C-1').nextAt).toBe('2026-11-04');
  });
  it('minimum 1 day: a 0 never makes a contact callable again the same day', () => {
    OUT['Left VM'].recallDays = 0; expect(after('Left VM')).toBe('2026-11-03');
    household(); OUT.Undecided.recallDays = 0; expect(after('Undecided')).toBe('2026-11-03');
  });
  it('changing a window later does not recalculate dates already set', () => {
    after('Left VM'); OUT['Left VM'].recallDays = 10;
    expect(C('C-4').nextAt).toBe('2026-11-05');
  });
});

describe('C3 household propagation', () => {
  it.each(['Not Interested', 'Already Building / Done', 'Do Not Contact'])('%s takes the rest of the household out of the pool, with the reason', out => {
    saveOutcome('C-1', 'may', out, '');
    for (const k of ['C-2', 'C-3']) { expect(C(k).stop?.why).toBe(`Ann A said ${out}`); expect(elig(C(k)).ok).toBe(false); }
    expect(elig(C('C-4')).ok).toBe(true); // another household is not touched
  });
  it.each(['Interested', 'Working on Plans'])('%s hands the property to sales and stops the household', out => {
    saveOutcome('C-1', 'may', out, '');
    expect(P('P-1').lead).toMatch(/^L-/);
    for (const k of ['C-1', 'C-2', 'C-3']) expect(elig(C(k)).k).toBe('lead');
  });
  it.each(['Not Contacted', 'Left VM', 'Hung Up', 'Undecided', 'Follow Up', 'Wrong Number'])('%s only affects the contact', out => {
    saveOutcome('C-1', 'may', out, '');
    for (const k of ['C-2', 'C-3']) { expect(C(k).stop).toBeNull(); expect(elig(C(k)).ok).toBe(true); }
  });
  it('Already Building marks Construction started on the property', () => {
    saveOutcome('C-1', 'may', 'Already Building / Done', '');
    expect(P('P-1').started).toBe('Yes');
  });
});

describe('C4 maximum attempts and on-hold', () => {
  it('every outcome adds one attempt, except Wrong Number (agreed with Andrew)', () => {
    for (const out of OUTK) { household(); saveOutcome('C-4', 'may', out, ''); expect(C('C-4').att, out).toBe(out === 'Wrong Number' ? 0 : 1); }
  });
  it('an outcome set not to count as an attempt in the catalog does not add one', () => {
    OUT['Not Contacted'].countsAsAttempt = false;
    saveOutcome('C-4', 'may', 'Not Contacted', '');
    expect(C('C-4').att).toBe(0);
  });
  it('the maximum is 6 (rules/default.maxAtt); at the maximum the contact goes on hold and leaves the pool', () => {
    expect(CFG.maxAtt).toBe(6);
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1', { att: 5 })], workdays: started() });
    saveOutcome('C-1', 'may', 'Not Contacted', '');
    setToday(D('2026-11-10'));
    expect(C('C-1').att).toBe(6);
    expect(elig(C('C-1'))).toMatchObject({ ok: false, k: 'max', why: 'On hold: 6 attempts (max 6)' });
  });
  it('without a working phone the contact is also on hold, until a number is added', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1')], noPhone: ['C-1'] });
    expect(elig(C('C-1')).k).toBe('hold');
  });
  it('a Follow Up set on the sixth attempt is kept; if that call does not happen either, the contact goes on hold', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1', { att: 5 })], workdays: started() });
    saveOutcome('C-1', 'may', 'Follow Up', '', '2026-11-04T10:00');
    setToday(D('2026-11-04'));
    expect(C('C-1').att).toBe(6);
    expect(elig(C('C-1')).ok).toBe(true);
    saveOutcome('C-1', 'may', 'Left VM', 'no answer at the follow-up');
    setToday(D('2026-11-20'));
    expect(elig(C('C-1')).k).toBe('max');
  });
  it('reactivating keeps the attempts (for now) and puts the contact back in the pool', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1', { att: 6, out: 'Left VM', lastAt: '2026-10-20T10:00', nextAt: '2026-10-25' })], workdays: started() });
    expect(onHold(C('C-1'))).toBe(true);
    reactivate(C('C-1'));
    expect(C('C-1').att).toBe(6);
    expect(elig(C('C-1')).ok).toBe(true);
    saveOutcome('C-1', 'may', 'Left VM', '');
    expect(C('C-1').att).toBe(7);
    expect(onHold(C('C-1'))).toBe(false); // a new round of attempts started at the reactivation
  });
  it('the reset to 0 is one setting away (rules/default.reactivateReset), off by default', () => {
    expect(CFG.reactivateReset).toBe(false);
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1', { att: 6 })], workdays: started(), rules: { reactivateReset: true } });
    reactivate(C('C-1'));
    expect(C('C-1').att).toBe(0);
  });
  it('the call log keeps every attempt', () => {
    saveOutcome('C-4', 'may', 'Left VM', 'first'); saveOutcome('C-4', 'dan', 'Hung Up', 'second');
    expect(CALLS.filter(x => x.ct === 'C-4').map(x => [x.rep, x.out, x.note])).toEqual([['may', 'Left VM', 'first'], ['dan', 'Hung Up', 'second']]);
  });
});
