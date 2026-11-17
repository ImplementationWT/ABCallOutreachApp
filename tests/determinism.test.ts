import { describe, expect, it } from 'vitest';
import { CALLS, CAMPS, CFG, CTS, DAY, DAYM, LEADS, PEO, PROPS, SEQ, SYNC, buildWorld, fromDocs, getClock, toDocs } from '../lib/domain';
import { artifactWorld } from './artifact-world';

const json = (x: unknown) => JSON.parse(JSON.stringify(x));
const A = artifactWorld();
const state = () => json({ PROPS, CTS, CALLS, LEADS, SYNC, DAY, DAYM, CAMPS, CFG, PEO, SEQ, clock: getClock().getTime() });

describe('seeded world matches artifact/app.html', () => {
  buildWorld();
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
    buildWorld();
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
