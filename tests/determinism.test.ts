import { describe, expect, it } from 'vitest';
import { CALLS, CAMPS, CFG, CTS, DAY, DAYM, LEADS, PEO, PROPS, SEQ, SYNC, TODAY, addDays, buildWorld, fromDocs, getClock, iso, toDocs } from '../lib/domain';

/** The artifact's fixed demo day; the seed is relative to whatever day it runs. */
const ARTIFACT_DAY = new Date(2026, 10, 2, 8, 20);
import { artifactWorld } from './artifact-world';

const json = (x: unknown) => JSON.parse(JSON.stringify(x));
const A = artifactWorld();
const state = () => json({ PROPS, CTS, CALLS, LEADS, SYNC, DAY, DAYM, CAMPS, CFG, PEO, SEQ, clock: getClock().getTime() });

describe('seeded world matches artifact/app.html', () => {
  buildWorld(ARTIFACT_DAY);
  it('first 5 properties and contacts', () => {
    expect(json(PROPS.slice(0, 5))).toEqual(json(A.PROPS.slice(0, 5)));
    expect(json(CTS.slice(0, 5))).toEqual(json(A.CTS.slice(0, 5)));
  });
  it('totals', () => {
    expect([PROPS.length, CTS.length, CALLS.length, LEADS.length, SYNC.length])
      .toEqual([A.PROPS.length, A.CTS.length, A.CALLS.length, A.LEADS.length, A.SYNC.length]);
  });
  it('every record, the morning allocation and the past metrics', () => {
    expect(json(PROPS)).toEqual(json(A.PROPS));
    expect(json(CTS)).toEqual(json(A.CTS));
    expect(json(CALLS)).toEqual(json(A.CALLS));
    expect(json(LEADS)).toEqual(json(A.LEADS));
    expect(json(SYNC)).toEqual(json(A.SYNC));
    expect(json(DAY)).toEqual(json(A.DAY));
    expect(json(DAYM)).toEqual(json(A.DAYM));
    expect(getClock().getTime()).toBe(A.CLOCK.getTime());
  });
});

describe('MongoDB documents', () => {
  it('rebuild exactly the same state (toDocs -> fromDocs)', () => {
    buildWorld(ARTIFACT_DAY);
    const before = state(), docs = json(toDocs());
    fromDocs(docs);
    expect(state()).toEqual(before);
    expect(json(toDocs())).toEqual(docs);
  });
  it('have unique ids in every collection', () => {
    buildWorld();
    for (const [name, docs] of Object.entries(toDocs())) expect(new Set(docs.map(d => d._id)).size, name).toBe(docs.length);
  });
});

describe('seed relative to the day it runs', () => {
  it('moves every date by the same number of days', () => {
    buildWorld(ARTIFACT_DAY);
    const a = json(toDocs());
    const later = new Date(2027, 2, 1, 8, 20); // a Monday, like the artifact's day
    buildWorld(later);
    expect(TODAY).toBe('2027-03-01');
    const b = json(toDocs());
    const shift = (s: string) => s.replace(/\d{4}-\d{2}-\d{2}/g, d => iso(addDays(new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8)), 119)));
    expect(b.call_log.map((c: { at: string }) => c.at)).toEqual(a.call_log.map((c: { at: string }) => shift(c.at)));
    expect(b.reservations.length).toBe(a.reservations.length);
    expect(b.campaigns.filter((c: { status: string }) => c.status === 'active').length).toBe(2); // permanent campaigns: no date
    expect(b.campaigns.filter((c: { date?: string }) => c.date).map((c: { date: string }) => c.date)).toEqual(a.campaigns.filter((c: { date?: string }) => c.date).map((c: { date: string }) => shift(c.date)));
  });
});
