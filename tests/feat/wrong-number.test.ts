/* feat/campaign-filtering, point 1: Wrong Number (agreed with Andrew).
 * It is not an attempt; the number dialed is marked wrong and never offered again; with no other
 * valid number the contact leaves the pool. */
import { beforeEach, describe, expect, it } from 'vitest';
import { C, CALLS, DEFAULT_OUTCOMES, OUT, callable, dialedIdx, effectsOf, elig, phIdx, saveOutcome, setToday } from '../../lib/domain';
import { DAY0, ct, load, prop, started } from '../sprint18/fixture';

/** One contact with two numbers. */
function twoPhones() {
  load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1', { att: 2 })], workdays: started() });
  C('C-1').phones.push({ n: '(310) 555-9999', st: 'untested' });
}
beforeEach(() => { setToday(DAY0); twoPhones(); });

describe('Wrong Number', () => {
  it('the catalog seed has it as not an attempt', () => {
    expect(Object.fromEntries(DEFAULT_OUTCOMES)['Wrong Number'].countsAsAttempt).toBe(false);
    expect(OUT['Wrong Number'].countsAsAttempt).toBe(false);
  });
  it('does not add an attempt', () => {
    saveOutcome('C-1', 'may', 'Wrong Number', '');
    expect(C('C-1').att).toBe(2);
  });
  it('marks the number dialed as wrong, and the next call goes to the other number', () => {
    saveOutcome('C-1', 'may', 'Wrong Number', '');
    expect(C('C-1').phones.map(p => p.st)).toEqual(['bad', 'untested']);
    expect(phIdx(C('C-1'))).toBe(1);
    expect(elig(C('C-1')).k).toBe('due'); // waits its catalog window, on the other number
    expect(CALLS[CALLS.length - 1].ph).toBe(C('C-1').phones[0].n);
  });
  it('when the rep dialed the second number, that one is marked wrong (not the first)', () => {
    C('C-1').callPh = 1;
    expect(dialedIdx(C('C-1'))).toBe(1);
    saveOutcome('C-1', 'may', 'Wrong Number', '');
    expect(C('C-1').phones.map(p => p.st)).toEqual(['untested', 'bad']);
    expect(CALLS[CALLS.length - 1].ph).toBe('(310) 555-9999');
  });
  it('a number marked wrong is never the one to call, even if it is picked', () => {
    C('C-1').phones[0].st = 'bad';
    C('C-1').callPh = 0;
    expect(dialedIdx(C('C-1'))).toBe(1);
  });
  it('with no other valid number the contact leaves the pool (on hold until a new number)', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1')], workdays: started() });
    saveOutcome('C-1', 'may', 'Wrong Number', '');
    expect(callable(C('C-1'))).toBe(false);
    expect(C('C-1').nextAt).toBeNull();
    expect(elig(C('C-1'))).toMatchObject({ ok: false, k: 'hold' });
    expect(C('C-1').att).toBe(0);
  });
  it('the preview says so before saving', () => {
    const fx = effectsOf(C('C-1'), 'Wrong Number');
    expect(fx.join('\n')).toContain('is marked wrong and is not offered again. Next call goes to (310) 555-9999');
    expect(fx).toContain('Not counted as an attempt');
  });
});
