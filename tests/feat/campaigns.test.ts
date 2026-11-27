/* feat/campaign-filtering, point 2: permanent campaigns (agreed with Andrew).
 * A campaign is active, paused or ended, with no single day. Several can be active at once; the
 * allocation takes the contacts of every active campaign of the rep together, with the same rules,
 * and a contact in two campaigns is assigned once. Pausing or ending stops new assignments and keeps
 * the history. Daily campaigns from before load as ended. */
import { beforeEach, describe, expect, it } from 'vitest';
import { CALLS, CAMPS, buildWorld, DAY, activeCamps, audsOf, campName, campsOf, emptyReason, fromDocs, listOf, newCampKey, saveOutcome, setToday, startNewDay, toDocs, type Doc, type RepKey } from '../../lib/domain';
import { DAY0, TODAY0, ct, load, prop, started } from '../sprint18/fixture';

const camp = (id: string, auds: string[], reps: RepKey[], status = 'active', o: Record<string, unknown> = {}) => ({ _id: id, status, auds, reps, goal: 1, pos: 0, ...o });
const all = () => (['may', 'dan', 'pri'] as RepKey[]).flatMap(r => listOf(r).map(c => c.k));
/** Two properties per audience: pp (P-pp1, P-pp2), ad and mb. */
const world = (campaigns: Doc[]) => load({
  props: ['pp', 'ad', 'mb'].flatMap(a => [prop(`P-${a}1`, a), prop(`P-${a}2`, a)]),
  contacts: ['pp', 'ad', 'mb'].flatMap(a => [ct(`C-${a}1`, `P-${a}1`), ct(`C-${a}2`, `P-${a}2`)]),
  campaigns,
});
beforeEach(() => setToday(DAY0));

describe('several active campaigns', () => {
  it('a rep takes the contacts of all their active campaigns together', () => {
    world([camp('C-1', ['pp'], ['may']), camp('C-2', ['ad'], ['may'])]);
    expect([...audsOf('may')].sort()).toEqual(['ad', 'pp']);
    startNewDay();
    expect(listOf('may').map(c => c.k).sort()).toEqual(['C-ad1', 'C-ad2', 'C-pp1', 'C-pp2']);
  });
  it('a contact in two campaigns is assigned once, to one rep', () => {
    world([camp('C-1', ['pp', 'ad'], ['may', 'dan']), camp('C-2', ['ad', 'mb'], ['dan', 'pri'])]);
    startNewDay();
    const keys = all();
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.sort()).toEqual(['C-ad1', 'C-ad2', 'C-mb1', 'C-mb2', 'C-pp1', 'C-pp2']);
    expect(listOf('pri').every(c => c.prop.startsWith('P-ad') || c.prop.startsWith('P-mb'))).toBe(true);
  });
  it('the same priority order applies across campaigns (P2 permit issued before P5)', () => {
    load({ props: [prop('P-a', 'pp'), prop('P-b', 'ad', { permit: 'Permit Issued' })], contacts: [ct('C-a', 'P-a'), ct('C-b', 'P-b')], campaigns: [camp('C-1', ['pp'], ['may']), camp('C-2', ['ad'], ['may'])] });
    startNewDay();
    expect(listOf('may').map(c => c.k)).toEqual(['C-b', 'C-a']);
  });
});

describe('paused and ended campaigns', () => {
  it('a paused campaign stops new assignments of its contacts; resumed, they come back', () => {
    world([camp('C-1', ['pp'], ['may'], 'paused'), camp('C-2', ['ad'], ['may'])]);
    startNewDay();
    expect(listOf('may').map(c => c.k).sort()).toEqual(['C-ad1', 'C-ad2']);
    world([camp('C-1', ['pp'], ['may'], 'active'), camp('C-2', ['ad'], ['may'])]);
    startNewDay();
    expect(listOf('may').map(c => c.k)).toContain('C-pp1');
  });
  it('an ended campaign assigns nothing; with no active campaign the start screen says "No active campaigns"', () => {
    world([camp('C-1', ['pp'], ['may'], 'ended')]);
    startNewDay();
    expect(all()).toEqual([]);
    expect(emptyReason('may')).toMatchObject({ k: 'nocamp', t: 'No active campaigns' });
  });
  it('the other reasons stay: allocation not run yet, and pool empty', () => {
    world([camp('C-1', ['sm'], ['may'])]);
    expect(emptyReason('may')?.k).toBe('notyet');
    startNewDay();
    expect(emptyReason('may')?.k).toBe('empty');
  });
  it('ending keeps the history: calls stay, and a follow-up comes back to its rep while the rep works another active campaign', () => {
    load({ props: [prop('P-1', 'pp'), prop('P-2', 'ad')], contacts: [ct('C-1', 'P-1'), ct('C-2', 'P-2')], campaigns: [camp('C-1', ['pp'], ['may'])], workdays: started() });
    DAY.may.list.push('C-1');
    saveOutcome('C-1', 'may', 'Follow Up', '', '2026-11-03T10:00');
    const docs = JSON.parse(JSON.stringify(toDocs()));
    docs.campaigns = [camp('C-1', ['pp'], ['may'], 'ended'), camp('C-2', ['ad'], ['may'])];
    docs.workdays = []; docs.reservations = [];
    setToday(new Date(2026, 10, 3, 8, 20));
    fromDocs(docs);
    expect(CALLS.some(x => x.ct === 'C-1' && x.out === 'Follow Up')).toBe(true);
    startNewDay();
    expect(listOf('may').map(c => c.k)).toEqual(['C-1', 'C-2']); // own follow-up first, then the active campaign
  });
});

describe('campaign documents', () => {
  it('a daily campaign from before (no status) loads as ended: history, not allocated', () => {
    world([{ _id: 'C-1102-A', date: TODAY0, auds: ['pp'], reps: ['may'], goal: 1, pos: 0 }]);
    expect(CAMPS[0].status).toBe('ended');
    expect(campsOf('may')).toEqual([]);
  });
  it('the seed has two active campaigns with the artifact day\'s audiences and reps, plus ended daily ones', () => {
    buildWorld(DAY0);
    expect(activeCamps().map(c => [c.auds, c.reps])).toEqual([[['pp', 'sm'], ['may']], [['ad', 'mb'], ['dan', 'pri']]]);
    expect(CAMPS.filter(c => c.status === 'ended').every(c => !!c.date)).toBe(true);
  });
  it('names: its own, or its audiences; new keys never repeat', () => {
    world([camp('C-0007', ['pp', 'ad'], ['may'])]);
    expect(campName(CAMPS[0])).toBe('Pacific Palisades and Altadena');
    expect(newCampKey()).toBe('C-0008');
  });
});
