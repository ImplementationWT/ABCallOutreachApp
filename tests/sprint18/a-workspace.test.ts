/* Sprint 18, A. Rep Workspace: the parts that are domain logic (the screens are in tests/e2e/sprint18.spec.ts). */
import { beforeEach, describe, expect, it } from 'vitest';
import { DAY, emptyReason, setToday, startNewDay } from '../../lib/domain';
import { DAY0, TODAY0, ct, load, prop } from './fixture';

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
