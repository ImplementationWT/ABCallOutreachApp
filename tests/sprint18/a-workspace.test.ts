/* Sprint 18, A. Rep Workspace: the parts that are domain logic (the screens are in tests/e2e/sprint18.spec.ts). */
import { beforeEach, describe, expect, it } from 'vitest';
import { C, DAY, emptyReason, historyOf, lastCallOf, saveOutcome, setClock, setToday, startNewDay } from '../../lib/domain';
import { DAY0, TODAY0, ct, load, prop, started } from './fixture';

beforeEach(() => setToday(DAY0));

describe('A1 why a rep has no list', () => {
  it('no campaign today', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1')], campaigns: [] });
    startNewDay();
    expect(emptyReason('may')?.k).toBe('nocamp');
  });
  it('today\'s allocation has not run yet', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1')] });
    expect(DAY.may.batches).toEqual([]);
    expect(emptyReason('may')?.k).toBe('notyet');
  });
  it('the campaign\'s pool is empty', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1')], campaigns: [{ _id: 'C-T-A', date: TODAY0, auds: ['ad'], reps: ['may', 'dan', 'pri'], goal: 1, pos: 0 }] });
    startNewDay();
    expect(emptyReason('may')?.k).toBe('empty');
  });
  it('a rep with a list has no reason, and the morning batch records when it ran (no fixed 7:00 AM)', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1')] });
    startNewDay();
    const with1 = (['may', 'dan', 'pri'] as const).find(r => DAY[r].list.length)!;
    expect(emptyReason(with1)).toBeNull();
    expect(DAY.may.batches[0].at).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    expect(DAY.may.batches[0].at).not.toBe('7:00 AM');
  });
});

describe('A5 contact detail', () => {
  it('"Other contacts" shows who made the last call, not the first rep of the contact', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1'), ct('C-2', 'P-1', { role: 'Secondary owner' })], workdays: started() });
    saveOutcome('C-2', 'may', 'Left VM', 'first');
    saveOutcome('C-2', 'dan', 'Hung Up', 'second');
    expect(C('C-2').rep).toBe('may'); // the contact's assigned rep stays
    expect(lastCallOf('C-2')).toMatchObject({ rep: 'dan', out: 'Hung Up' });
  });
  it('the history is newest first, and two calls in the same minute keep their order (by id)', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1'), ct('C-2', 'P-1')], workdays: started() });
    setClock(new Date(2026, 10, 2, 9, 0));
    saveOutcome('C-1', 'may', 'Left VM', 'a');
    setClock(new Date(2026, 10, 2, 9, 0));
    saveOutcome('C-2', 'may', 'Hung Up', 'b');
    setClock(null);
    const h = historyOf(['C-1', 'C-2']);
    expect(h[0].at).toBe(h[1].at);
    expect(h.map(x => x.note)).toEqual(['b', 'a']);
  });
});
