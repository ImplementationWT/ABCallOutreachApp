/* feat/campaign-filtering, point 4: metrics. The calculations only read CallRecords from a source,
 * so the source (today the app's call log, later RingCentral) changes without touching them. */
import { beforeEach, describe, expect, it } from 'vitest';
import { CALLS, DEFAULT_OUTCOMES, OUT, OUTK, appCallSource, dailyReport, fmtRate, metricsOf, pacificDay, saveOutcome, setToday, trend, type CallRecord, type CallSource } from '../../lib/domain';
import { DAY0, ct, load, prop, started } from '../sprint18/fixture';

const rec = (rep: string, day: string, connect = false, lead = false): CallRecord => ({ rep, at: `${day}T10:00`, connect, lead });
const fake = (rs: CallRecord[]): CallSource => ({ name: 'test', calls: (f, t) => rs.filter(r => r.at.slice(0, 10) >= f && r.at.slice(0, 10) <= t) });

describe('catalog: connect and lead', () => {
  it('"creates a lead" is on Working on Plans and Interested only (agreed with Andrew)', () => {
    expect(DEFAULT_OUTCOMES.filter(([, d]) => d.lead).map(([k]) => k)).toEqual(['Working on Plans', 'Interested']);
  });
  it('"counts as a connect" (proposal): every outcome where someone answered', () => {
    expect(DEFAULT_OUTCOMES.filter(([, d]) => d.connect).map(([k]) => k)).toEqual(['Hung Up', 'Undecided', 'Follow Up', 'Working on Plans', 'Interested', 'Not Interested', 'Already Building / Done', 'Do Not Contact']);
    expect(DEFAULT_OUTCOMES.filter(([, d]) => !d.connect).map(([k]) => k)).toEqual(['Not Contacted', 'Left VM', 'Wrong Number']);
  });
  it('a catalog document without the field (before the migration) gets it from its group', () => {
    setToday(DAY0); load({ props: [], contacts: [] });
    expect(OUTK.every(k => typeof OUT[k].connect === 'boolean')).toBe(true);
  });
});

describe('the calculations', () => {
  it('Calls Made, Connects, New Leads, Dial to Connect and Connect to Lead', () => {
    const m = metricsOf([rec('may', 'x', true, true), rec('may', 'x', true), rec('may', 'x'), rec('may', 'x')]);
    expect(m).toEqual({ calls: 4, connects: 2, leads: 1, d2c: 0.5, c2l: 0.5 });
    expect(metricsOf([])).toEqual({ calls: 0, connects: 0, leads: 0, d2c: null, c2l: null });
    expect(fmtRate(0.125)).toBe('13%'); expect(fmtRate(null)).toBe('–');
  });
  it('by rep and day, the team total, and the same day of the week before', () => {
    const r = dailyReport(fake([
      rec('may', '2026-11-02', true), rec('may', '2026-11-02'), rec('dan', '2026-11-02', true, true),
      rec('may', '2026-10-26'), rec('pri', '2026-10-26', true), rec('may', '2026-11-01', true), rec('and', '2026-11-02', true),
    ]), '2026-11-02');
    expect(r.prevDay).toBe('2026-10-26');
    expect(r.reps.map(x => [x.rep, x.m.calls, x.m.connects, x.m.leads])).toEqual([['may', 2, 1, 0], ['dan', 1, 1, 1], ['pri', 0, 0, 0]]);
    expect(r.team.m).toMatchObject({ calls: 3, connects: 2, leads: 1 }); // only the reps (not Andrew), only that day
    expect(r.team.prev).toMatchObject({ calls: 2, connects: 1 });
    expect(trend(r.team.m, r.team.prev, 'calls')).toBe(1);
    expect(trend(r.team.m, r.team.prev, 'd2c')).toBe(17); // 67% - 50%, in points
    expect(trend(r.reps[2].m, r.reps[2].prev, 'd2c')).toBeNull();
  });
  it('a ranking per metric: best first, ties share the place, no rate goes last', () => {
    const r = dailyReport(fake([rec('may', '2026-11-02'), rec('dan', '2026-11-02', true), rec('pri', '2026-11-02')]), '2026-11-02');
    expect(r.rank.calls.map(x => [x.rep, x.place])).toEqual([['may', 1], ['dan', 1], ['pri', 1]]);
    expect(r.rank.connects.map(x => [x.rep, x.place])).toEqual([['dan', 1], ['may', 2], ['pri', 2]]);
    expect(r.rank.c2l.map(x => x.rep)).toEqual(['dan', 'may', 'pri']);
    expect(r.rank.c2l.at(-1)!.v).toBeNull();
  });
  it('the source changes without touching the calculations (same records, same report)', () => {
    setToday(DAY0);
    load({ props: [prop('P-1', 'pp'), prop('P-2', 'pp')], contacts: [ct('C-1', 'P-1'), ct('C-2', 'P-2')], workdays: started() });
    saveOutcome('C-1', 'may', 'Interested', ''); saveOutcome('C-2', 'may', 'Left VM', '');
    const app = dailyReport(appCallSource, '2026-11-02');
    const other = dailyReport(fake(appCallSource.calls('2026-11-02', '2026-11-02')), '2026-11-02');
    expect(app.source).toBe('Call results recorded in the app');
    expect(app.reps).toEqual(other.reps);
    expect(app.reps[0].m).toEqual({ calls: 2, connects: 1, leads: 1, d2c: 0.5, c2l: 1 });
    expect(CALLS.length).toBe(2);
  });
  it('connect comes from the catalog, so an administrator can change it', () => {
    setToday(DAY0);
    load({ props: [prop('P-1', 'pp')], contacts: [ct('C-1', 'P-1')], workdays: started() });
    saveOutcome('C-1', 'may', 'Hung Up', '');
    expect(dailyReport(appCallSource, '2026-11-02').reps[0].m.connects).toBe(1);
    OUT['Hung Up'].connect = false;
    expect(dailyReport(appCallSource, '2026-11-02').reps[0].m.connects).toBe(0);
  });
  it('the default day is today in California', () => {
    expect(pacificDay(new Date('2026-11-03T06:30:00Z'))).toBe('2026-11-02'); // 10:30 PM in Los Angeles
    expect(pacificDay(new Date('2026-11-03T09:00:00Z'))).toBe('2026-11-03');
  });
});
beforeEach(() => setToday(DAY0));
