/* Sprint 18, B. Daily Assignment Engine (lib/domain/engine.ts), on the controlled fixture.
 * `it.fails` = criterion not met today (see c-outcomes.test.ts). The server-side parts (lock,
 * idempotent morning run, concurrent requests) are in tests/e2e/sprint18.spec.ts. */
import { beforeEach, describe, expect, it } from 'vitest';
import { C, CFG, DAY, P, dupCheck, elig, endDay, freeGroups, listOf, openOf, priOf, requestMore, saveOutcome, setToday, startAlloc, startNewDay, demoN, type RepKey } from '../../lib/domain';
import { DAY0, TODAY0, ct, load, prop, started } from './fixture';

const repsOf = () => Object.fromEntries((['may', 'dan', 'pri'] as RepKey[]).map(r => [r, listOf(r).map(c => c.k)]));
const propsOf = (r: RepKey) => new Set(listOf(r).map(c => c.prop));
beforeEach(() => setToday(DAY0));

/* One case per exclusion rule of B1, plus two callable contacts */
function pool() {
  load({
    props: [prop('P-ok', 'pp'), prop('P-ok2', 'pp'), prop('P-aud', 'ad'), prop('P-due', 'pp'), prop('P-hold', 'pp'), prop('P-lock', 'pp'), prop('P-res', 'pp'),
      prop('P-dnc', 'pp'), prop('P-lead', 'pp', { lead: 'L-1' }), prop('P-pipe', 'pp', { inPipe: 'In AB pipeline' }), prop('P-max', 'pp'), prop('P-stop', 'pp')],
    contacts: [
      ct('C-1', 'P-ok'), ct('C-2', 'P-ok2'),
      ct('C-3', 'P-aud'), // audience not in today's campaign
      ct('C-4', 'P-due', { out: 'Left VM', lastAt: '2026-10-30T10:00', nextAt: '2026-11-04', att: 1 }), // inside its recall window
      ct('C-5', 'P-hold'), // no phone: on hold
      ct('C-6', 'P-lock'), ct('C-7', 'P-lock', { role: 'Secondary owner' }), // household: C-7 is in Daniel's list today
      ct('C-8', 'P-res'), // already in Daniel's list today
      ct('C-9', 'P-dnc', { dnc: true }), ct('C-10', 'P-lead'), ct('C-11', 'P-pipe'), ct('C-12', 'P-max', { att: 6 }),
      ct('C-13', 'P-stop', { stop: { why: 'X said Not Interested', by: null } }),
    ],
    noPhone: ['C-5'],
    workdays: started(),
    reservations: [{ _id: `${TODAY0}:C-7`, ct: 'C-7', rep: 'dan', date: TODAY0, order: 0, done: null }, { _id: `${TODAY0}:C-8`, ct: 'C-8', rep: 'dan', date: TODAY0, order: 1, done: null }],
  });
}

describe('B1 callable pool', () => {
  it('only callable contacts of the campaign audiences enter; each exclusion case stays out', () => {
    pool();
    const may = freeGroups('may').flatMap(g => g.cs.map(c => c.k));
    expect(may.sort()).toEqual(['C-1', 'C-2']);
    expect(Object.fromEntries(['C-3', 'C-4', 'C-5', 'C-8', 'C-9', 'C-10', 'C-11', 'C-12', 'C-13'].map(k => [k, elig(C(k)).k]))).toEqual({
      'C-3': 'pool', // eligible, but its audience is not in Maya's campaign (freeGroups filter)
      'C-4': 'due', 'C-5': 'hold', 'C-8': 'res', 'C-9': 'dnc', 'C-10': 'lead', 'C-11': 'pipe', 'C-12': 'max', 'C-13': 'stop',
    });
    expect(may).not.toContain('C-6'); // household locked by Daniel today
  });
  it('a rep without a campaign today gets nothing from the pool', () => {
    pool();
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1')], campaigns: [], workdays: started() });
    expect(freeGroups('may')).toEqual([]);
  });
});

describe('B2 priority', () => {
  it('P1 before P2 before P3, P4, P5 (rank of the best contact in the household)', () => {
    load({
      props: [prop('P-5', 'pp'), prop('P-4', 'pp'), prop('P-3', 'pp'), prop('P-2', 'pp', { permit: 'Permit Issued' }), prop('P-1', 'pp')],
      contacts: [ct('C-5', 'P-5'), ct('C-4', 'P-4', { out: 'Left VM', lastAt: '2026-10-20T10:00', nextAt: '2026-10-25', att: 1 }),
        ct('C-3', 'P-3', { out: 'Undecided', lastAt: '2026-10-10T10:00', nextAt: '2026-10-20', att: 1, rep: 'may' }),
        ct('C-2', 'P-2'), ct('C-1', 'P-1', { out: 'Follow Up', lastAt: '2026-10-28T10:00', nextAt: TODAY0, att: 1, rep: 'may' })],
      workdays: started(),
    });
    expect(['C-1', 'C-2', 'C-3', 'C-4', 'C-5'].map(k => priOf(C(k)))).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
    expect(freeGroups('may').map(g => g.cs[0].k)).toEqual(['C-1', 'C-2', 'C-3', 'C-4', 'C-5']);
  });
  it.fails('[No implementado] category shares (percent per audience/category) are applied', () => {
    expect(CFG).toHaveProperty('shares');
  });
  it('documents the batch size rounding: max(1, round(n * scale))', () => {
    expect([demoN(200), demoN(100), demoN(1)]).toEqual([14, 7, 1]);
  });
});

/* Households of three people, enough for everyone */
function households(n: number, rules: Record<string, unknown> = {}) {
  const props = Array.from({ length: n }, (_, i) => prop(`P-${i + 1}`, 'pp'));
  const contacts = props.flatMap((p, i) => [0, 1, 2].map(j => ct(`C-${i * 3 + j + 1}`, p._id, { role: j ? 'Secondary owner' : 'Primary owner' })));
  load({ props, contacts, rules });
}

describe('B3 daily list by volume', () => {
  it('the morning run gives every rep of the campaign a list, and no contact is in two lists', () => {
    households(20);
    startNewDay();
    const l = repsOf();
    const all = Object.values(l).flat();
    expect(new Set(all).size).toBe(all.length);
    expect(dupCheck()).toBe(0);
    for (const r of ['may', 'dan', 'pri'] as RepKey[]) expect(l[r].length).toBeGreaterThanOrEqual(demoN(CFG.first));
  });
  it.fails('[Parcial] a rep never gets more than the volume (households are given whole and go over it)', () => {
    households(20);
    startNewDay();
    for (const r of ['may', 'dan', 'pri'] as RepKey[]) expect(listOf(r).length).toBeLessThanOrEqual(demoN(CFG.first));
  });
  it('fewer than the volume when the pool runs out, and the batch records how many', () => {
    households(2);
    startNewDay();
    expect(Object.values(repsOf()).flat().length).toBe(6);
    expect(DAY.pri.batches.at(-1)).toMatchObject({ k: 'Morning allocation', n: 0 });
  });
  it('a rep who is not in today\'s campaign gets no list', () => {
    const s = { _id: 'C-T-A', date: TODAY0, auds: ['pp'], reps: ['may', 'dan'], goal: 1, pos: 0 };
    load({ props: Array.from({ length: 10 }, (_, i) => prop(`P-${i + 1}`, 'pp')), contacts: Array.from({ length: 10 }, (_, i) => ct(`C-${i + 1}`, `P-${i + 1}`)), campaigns: [s] });
    startNewDay();
    expect(listOf('pri')).toEqual([]);
    expect(listOf('may').length).toBeGreaterThan(0);
  });
  it.fails('[No implementado] each rep has their own daily volume', () => {
    expect(CFG).toHaveProperty('volumeByRep');
  });
});

describe('B4 due follow-ups go back to their rep', () => {
  const fu = (rep: string, aud = 'ad') => load({
    props: [prop('P-fu', aud), ...Array.from({ length: 60 }, (_, i) => prop(`P-${i + 1}`, 'pp'))],
    contacts: [ct('C-fu', 'P-fu', { out: 'Follow Up', lastAt: '2026-10-28T10:00', nextAt: TODAY0, att: 1, rep: rep as RepKey }), ...Array.from({ length: 60 }, (_, i) => ct(`C-${i + 1}`, `P-${i + 1}`))],
  });
  it('a follow-up due today is in its rep\'s list even if its audience is not in the campaign, and counts in the volume', () => {
    fu('dan');
    startNewDay();
    expect(listOf('dan').map(c => c.k)).toContain('C-fu');
    expect(listOf('dan')[0].k).toBe('C-fu'); // first: own follow-ups before the rest
    expect(listOf('dan').length).toBe(demoN(CFG.first)); // inside the volume, not on top
  });
  it('if its rep has no campaign today, nobody gets it that day (it waits)', () => {
    fu('pri');
    load({ props: [prop('P-fu', 'pp')], contacts: [ct('C-fu', 'P-fu', { out: 'Follow Up', lastAt: '2026-10-28T10:00', nextAt: TODAY0, att: 1, rep: 'pri' })], campaigns: [{ _id: 'C-T-A', date: TODAY0, auds: ['pp'], reps: ['may', 'dan'], goal: 1, pos: 0 }] });
    startNewDay();
    expect([...listOf('may'), ...listOf('dan'), ...listOf('pri')].map(c => c.k)).not.toContain('C-fu');
  });
  it.fails('[No cumple] the follow-up goes back to the rep who set it (today: to the first rep who ever called the contact)', () => {
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1', { out: 'Left VM', lastAt: '2026-10-20T10:00', nextAt: '2026-10-25', att: 1, rep: 'may' })], workdays: started() });
    saveOutcome('C-1', 'dan', 'Follow Up', '', '2026-11-03');
    expect(C('C-1').rep).toBe('dan');
  });
});

describe('B5 one household, one rep a day', () => {
  it('the morning run never splits a household', () => {
    households(25);
    startNewDay();
    expect(dupCheck()).toBe(0);
    const [a, b, c] = (['may', 'dan', 'pri'] as RepKey[]).map(propsOf);
    for (const p of a) { expect(b.has(p)).toBe(false); expect(c.has(p)).toBe(false); }
  });
  it('"Request more" does not take a household already in another rep\'s list', () => {
    pool();
    requestMore('may');
    expect(listOf('may').map(c => c.k)).not.toContain('C-6');
    expect(dupCheck()).toBe(0);
  });
});

describe('B6 end of day', () => {
  it('unworked contacts go back to the pool without an attempt or a recall window; worked ones keep their state; the household lock is released', () => {
    households(4);
    startNewDay();
    const may = listOf('may'); const worked = may[0];
    saveOutcome(worked.k, 'may', 'Left VM', '');
    const back = openOf('may');
    const before = back.map(c => ({ att: c.att, nextAt: c.nextAt, out: c.out }));
    expect(endDay('may')).toBe(back.length);
    for (const [i, c] of back.entries()) { expect(c.res).toBeNull(); expect({ att: c.att, nextAt: c.nextAt, out: c.out }).toEqual(before[i]); expect(elig(c).ok).toBe(true); }
    expect(listOf('may').map(c => c.k)).toEqual([worked.k]);
    expect(C(worked.k)).toMatchObject({ out: 'Left VM', att: 1 });
    // a returned household can now go to another rep (if the worked contact's household is not in it)
    const freed = back.find(c => c.prop !== worked.prop)!;
    DAY.dan.list = []; // Daniel has finished his list
    expect(freeGroups('dan').some(g => g.p.k === freed.prop)).toBe(true);
    expect(DAY.may.st).toBe('ended');
  });
  it('rules/default.endDay = "pool" is what returns them; other values keep them reserved', () => {
    households(2); CFG.endDay = 'keep';
    startNewDay();
    const n = listOf('may').length;
    endDay('may');
    expect(listOf('may').length).toBe(n);
  });
});

describe('B8 request more', () => {
  it('refused while the list has contacts without a result, with how many', () => {
    households(10);
    startNewDay();
    expect(requestMore('may')).toEqual({ ok: false, n: openOf('may').length });
  });
  it('gives a new batch following the pool and household rules once the list is documented', () => {
    households(20);
    startNewDay();
    for (const c of openOf('may')) saveOutcome(c.k, 'may', 'Left VM', '');
    const r = requestMore('may');
    expect(r.ok).toBe(true);
    expect(r.n).toBeGreaterThanOrEqual(demoN(CFG.more));
    expect(dupCheck()).toBe(0);
  });
  it('empty pool: ok with 0 (the screen then says "No more eligible contacts in your campaign today")', () => {
    households(1);
    startNewDay();
    for (const r of ['may', 'dan', 'pri'] as RepKey[]) for (const c of openOf(r)) saveOutcome(c.k, r, 'Left VM', '');
    expect(requestMore('pri')).toEqual({ ok: true, n: 0 });
  });
  it('Start Workday with an empty list gives the first batch (startAlloc)', () => {
    load({ props: Array.from({ length: 30 }, (_, i) => prop(`P-${i + 1}`, 'pp')), contacts: Array.from({ length: 30 }, (_, i) => ct(`C-${i + 1}`, `P-${i + 1}`)), workdays: [{ _id: `${TODAY0}:may`, rep: 'may', date: TODAY0, st: 'reserved', startedAt: null, endedAt: null, batches: [] }] });
    expect(startAlloc('may')).toBe(demoN(CFG.first));
    expect(DAY.may.st).toBe('started');
    expect(P(listOf('may')[0].prop).aud).toBe('pp');
  });
});
