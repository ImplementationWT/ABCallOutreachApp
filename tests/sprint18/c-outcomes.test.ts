/* Sprint 18, C. Call Outcomes & Rules. Each test names the criterion it checks.
 * `it.fails` = the criterion is NOT met today: the test states the expected behaviour and is expected
 * to fail; when the gap is fixed it starts passing and vitest reports it, so it is flipped to `it`. */
import { beforeEach, describe, expect, it } from 'vitest';
import { C, CALLS, CFG, COLLECTIONS, OUT, OUTK, P, elig, saveOutcome, setToday, type OutcomeDef } from '../../lib/domain';
import { DAY0, TODAY0, ct, load, prop, started } from './fixture';

const D = (s: string) => new Date(s + 'T08:20');
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
  it('documents today: 11 outcomes fixed in code (lib/domain/catalogs.ts OUT)', () => {
    expect(OUTK).toEqual(['Not Contacted', 'Left VM', 'Wrong Number', 'Hung Up', 'Undecided', 'Follow Up', 'Working on Plans', 'Interested', 'Not Interested', 'Already Building / Done', 'Do Not Contact']);
    // only the recall days of 5 outcomes are in the database (rules/default.rc)
    expect(Object.keys(CFG.rc).sort()).toEqual(['Hung Up', 'Left VM', 'Not Contacted', 'Not Interested', 'Undecided']);
  });
  it.fails('[No implementado] the catalog is a database collection an admin can edit without a deploy', () => {
    expect(COLLECTIONS as readonly string[]).toContain('outcomes');
  });
  it.fails('[No implementado] each outcome stores active, counts-as-attempt, recall days, propagates, needs follow-up date', () => {
    const d = OUT['Left VM'] as OutcomeDef & Record<string, unknown>;
    for (const k of ['active', 'countsAsAttempt', 'recallDays', 'propagates', 'needsFollowUp']) expect(d).toHaveProperty(k);
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
  it('Follow Up uses the date the rep picked', () => { expect(after('Follow Up', '2026-11-20')).toBe('2026-11-20'); });
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
  it('edge: a window of 0 business days is treated as 1 (CFG.rc[out] || 1), empty too', () => {
    CFG.rc['Left VM'] = 0; expect(after('Left VM')).toBe('2026-11-03');
    delete CFG.rc['Hung Up']; household(); delete CFG.rc['Hung Up']; expect(after('Hung Up')).toBe('2026-11-03');
  });
  it('edge: a window of 0 calendar days (Undecided) makes it callable the same day', () => {
    CFG.rc.Undecided = 0; expect(after('Undecided')).toBe(TODAY0);
  });
  it('changing a window later does not recalculate dates already set', () => {
    after('Left VM'); CFG.rc['Left VM'] = 10;
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
  it('every outcome adds one attempt (none is excluded today)', () => {
    for (const out of OUTK) { household(); saveOutcome('C-4', 'may', out, ''); expect(C('C-4').att, out).toBe(1); }
  });
  it('at the maximum (rules/default.maxAtt = 6) the contact leaves the pool as "max", not on hold', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1', { att: 5 })], workdays: started() });
    saveOutcome('C-1', 'may', 'Not Contacted', '');
    setToday(D('2026-11-10'));
    expect(C('C-1').att).toBe(6);
    expect(elig(C('C-1'))).toMatchObject({ ok: false, k: 'max' });
  });
  it('"on hold" today means no working phone number; it comes back as soon as a number is added', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1')], noPhone: ['C-1'] });
    expect(elig(C('C-1')).k).toBe('hold');
  });
  it.fails('[No cumple] a Follow Up saved on the last attempt still comes back to the rep on its date', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1', { att: 5 })], workdays: started() });
    saveOutcome('C-1', 'may', 'Follow Up', '', '2026-11-04');
    setToday(D('2026-11-04'));
    expect(elig(C('C-1')).ok).toBe(true); // today: { ok: false, k: 'max' }, the follow-up is lost
  });
  it('the call log keeps every attempt', () => {
    saveOutcome('C-4', 'may', 'Left VM', 'first'); saveOutcome('C-4', 'dan', 'Hung Up', 'second');
    expect(CALLS.filter(x => x.ct === 'C-4').map(x => [x.rep, x.out, x.note])).toEqual([['may', 'Left VM', 'first'], ['dan', 'Hung Up', 'second']]);
  });
});
