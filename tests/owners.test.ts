import { beforeEach, describe, expect, it } from 'vitest';
import { C, CTS, PROPS, TODAY, buildWorld, elig, freeGroups, fromDocs, ownerBusy, owners, saveOutcome, slotsOf, toDocs, type ContactDoc, type Snapshot } from '../lib/domain';

/* One contact document per person with `props` (scripts/import-properties.mts): in memory one slot per
 * property, each with its own outreach state; back in the database, one document again. */
const DAY0 = new Date(2026, 10, 2, 8, 20);
const json = <T,>(x: T) => JSON.parse(JSON.stringify(x)) as T;

/** The seeded world, plus a person who owns two properties (and one without a phone, owning one). */
function world() {
  buildWorld(DAY0);
  const docs = json(toDocs());
  const free = PROPS.filter(p => !p.lead && !p.inPipe).map(p => p.k);
  const [pa, pb, pc] = free.slice(-3);
  // Drop the seeded contacts of those properties, then add the owner
  const gone = new Set((docs.contacts as ContactDoc[]).filter(c => [pa, pb, pc].includes(c.prop)).map(c => c._id));
  docs.contacts = docs.contacts.filter(c => !gone.has(c._id as string));
  docs.phone_numbers = docs.phone_numbers.filter(p => !gone.has(p.ct as string));
  docs.call_log = docs.call_log.filter(x => !gone.has(x.ct as string));
  docs.reservations = docs.reservations.filter(x => !gone.has(x.ct as string));
  const base = { role: 'Primary owner', email: '', out: null, lastAt: null, nextAt: null, att: 0, rep: null, dnc: false, supp: false, stop: null, note: '' };
  docs.contacts.push({ _id: 'C-90001', ...base, n: 'JANE OWNER', prop: pa, props: [pa, pb], ownerKey: 'JANE OWNER|1 MAIN ST' });
  docs.contacts.push({ _id: 'C-90002', ...base, n: 'NO PHONE TRUST', prop: pc, props: [pc], ownerKey: 'NO PHONE TRUST|2 MAIN ST' });
  docs.phone_numbers.push({ _id: 'C-90001#0', ct: 'C-90001', idx: 0, n: '(310) 555-0101', st: 'untested' });
  return { docs: docs as Snapshot, pa, pb, pc };
}

let W: ReturnType<typeof world>;
beforeEach(() => { W = world(); fromDocs(json(W.docs)); });

describe('an owner of several properties', () => {
  it('is one document and one slot per property, sharing the phones', () => {
    const a = C('C-90001'), b = C(`C-90001@${W.pb}`);
    expect([a.prop, b.prop]).toEqual([W.pa, W.pb]);
    expect(b.base).toBe('C-90001');
    expect(b.phones).toBe(a.phones);
    expect(slotsOf(a)).toEqual([a, b]);
    expect(owners().filter(c => c.k === 'C-90001')).toHaveLength(1);
    const docs = toDocs();
    expect(docs.contacts.filter(c => String(c._id).startsWith('C-90001'))).toHaveLength(1);
    expect(docs.phone_numbers.filter(p => p.ct === 'C-90001')).toHaveLength(1);
  });

  it('goes back to the same documents (fromDocs -> toDocs)', () => {
    const once = json(toDocs());
    fromDocs(json(once));
    expect(json(toDocs())).toEqual(once);
  });

  it('Not Interested stays with that property; the other keeps its state after a reload', () => {
    saveOutcome('C-90001', 'may', 'Not Interested', 'Sold it');
    const b = C(`C-90001@${W.pb}`);
    expect(C('C-90001').out).toBe('Not Interested');
    expect(b.out).toBeNull();
    expect(b.stop).toBeNull();
    expect(elig(b, true).ok).toBe(true);
    // the slot's own state is saved in pst and comes back
    saveOutcome(b.k, 'dan', 'Left VM', '');
    const d = toDocs().contacts.find(c => c._id === 'C-90001') as ContactDoc;
    expect(d.out).toBe('Not Interested');
    expect(d.pst?.[W.pb]?.out).toBe('Left VM');
    fromDocs(json(toDocs()));
    expect(C(`C-90001@${W.pb}`).out).toBe('Left VM');
    expect(C('C-90001').out).toBe('Not Interested');
  });

  it('Do Not Contact is about the person: every property of theirs leaves the lists', () => {
    saveOutcome(`C-90001@${W.pb}`, 'may', 'Do Not Contact', '');
    expect(C('C-90001').stop?.why).toMatch(/asked not to be contacted/);
    expect(elig(C('C-90001'), true).ok).toBe(false);
  });

  it('is in one list at most a day', () => {
    const a = C('C-90001'), b = C(`C-90001@${W.pb}`);
    expect(ownerBusy(b)).toBe(false);
    a.res = { rep: 'may', date: TODAY };
    expect(ownerBusy(b)).toBe(true);
    for (const r of ['may', 'dan', 'pri'] as const) expect(freeGroups(r).flatMap(g => g.cs).includes(b)).toBe(false);
  });
});

describe('a contact without a phone', () => {
  it('is on hold, never allocated, and comes in as soon as it has a number', () => {
    const c = C('C-90002');
    expect(c.phones).toEqual([]);
    expect(elig(c).k).toBe('hold');
    for (const r of ['may', 'dan', 'pri'] as const) expect(freeGroups(r).flatMap(g => g.cs).includes(c)).toBe(false);
    // a phone added later (phone_numbers) is all it takes
    const docs = json(toDocs());
    docs.phone_numbers.push({ _id: 'C-90002#0', ct: 'C-90002', idx: 0, n: '(310) 555-0102', st: 'untested' });
    fromDocs(docs);
    expect(elig(C('C-90002')).ok).toBe(true);
  });

  it('keeps the screens working: no phone and no property figures', () => {
    expect(CTS.some(c => c.phones.length === 0)).toBe(true);
    const p = PROPS.find(x => x.k === W.pc)!;
    Object.assign(p, { lot: null, prior: null, built: null, since: null });
    expect(() => fromDocs(json(toDocs()))).not.toThrow();
  });
});
