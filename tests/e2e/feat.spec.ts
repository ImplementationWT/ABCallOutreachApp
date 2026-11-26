/* feat/campaign-filtering (Andrew's round 1), end to end on calloutreach_e2e: UI -> API -> MongoDB.
 * Users: maya (rep) and admin. Day: the seed's demo day, Mon Nov 2, 2026 (browser clock fixed). */
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { createSession, ensureTeamUsers } from '../../lib/db/auth-core';
import { resetUsers, reseed, withDb } from './db';
import { fixClock } from './targets';

const DAY = '2026-11-02';
const NOW = `${DAY}T09:00`;
const BASE = 'http://localhost:3217';
const cookie = (token: string) => ({ cookies: [{ name: 'ab_session', value: token, domain: 'localhost', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' as const }], origins: [] });
const token = (user: string) => withDb(db => createSession(db, user));

test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  await reseed();
  await withDb(async db => { await ensureTeamUsers(db); await db.collection('users').updateMany({}, { $set: { mustChange: false } }); });
});
test.afterAll(async () => { await resetUsers(); await reseed(); });

async function page(browser: Browser, user: string, path = '/rep/today'): Promise<Page> {
  const p = await browser.newPage({ storageState: cookie(await token(user)), viewport: { width: 1440, height: 900 } });
  await fixClock(p);
  await p.goto(path);
  await p.waitForLoadState('networkidle');
  const start = p.locator('[data-act=startday]');
  if (path === '/rep/today' && await start.count()) { await start.click(); await expect(p.locator('#toast')).toContainText('Workday started'); await p.waitForLoadState('networkidle'); }
  return p;
}
async function api(pw: { request: { newContext: (o: object) => Promise<APIRequestContext> } }, user: string) {
  return pw.request.newContext({ baseURL: BASE, storageState: cookie(await token(user)) });
}
/** A contact of Maya's list today, not documented yet, that is its own document (not a second property slot). */
const mayaOpen = () => withDb(async db => {
  const r = await db.collection('reservations').find({ date: DAY, rep: 'may', done: null }).toArray();
  return String(r.find(x => !String(x.ct).includes('@'))!.ct);
});

test.describe('1. Wrong Number', () => {
  test('it is not an attempt; the number dialed is marked wrong; a wrong number cannot be the one saved', async ({ playwright }) => {
    expect(await withDb(db => db.collection('outcomes').findOne({ _id: 'Wrong Number' as never }))).toMatchObject({ countsAsAttempt: false });
    const ct = await mayaOpen();
    await withDb(db => db.collection('phone_numbers').insertOne({ _id: `${ct}#1` as never, ct, idx: 1, n: '(310) 555-0999', st: 'untested' }));
    const att = (await withDb(db => db.collection('contacts').findOne({ _id: ct as never })))!.att;
    const maya = await api(playwright, 'maya');
    const res = await maya.post('/api/work', { data: { action: 'save', rep: 'may', ct, out: 'Wrong Number', ph: 1, now: NOW } });
    expect(res.status()).toBe(200);
    const phones = await withDb(db => db.collection('phone_numbers').find({ ct }).sort({ idx: 1 }).toArray());
    expect(phones[1].st).toBe('bad');
    expect(phones[0].st).not.toBe('bad');
    expect((await withDb(db => db.collection('contacts').findOne({ _id: ct as never })))!.att).toBe(att);
    expect(await withDb(db => db.collection('call_log').findOne({ ct, out: 'Wrong Number' }))).toMatchObject({ ph: '(310) 555-0999' });
    // saving again on the number already marked wrong is refused
    const again = await maya.post('/api/work', { data: { action: 'save', rep: 'may', ct, out: 'Left VM', ph: 1, now: NOW } });
    expect(again.status()).toBe(400);
    expect((await again.json()).error).toBe('That number is marked wrong: call another one');
  });
  test('with no other valid number the contact leaves the pool (Contact pool: on hold, no number)', async ({ playwright }) => {
    const ct = await mayaOpen();
    await withDb(db => db.collection('phone_numbers').deleteMany({ ct, idx: { $ne: 0 } }));
    const maya = await api(playwright, 'maya');
    expect((await maya.post('/api/work', { data: { action: 'save', rep: 'may', ct, out: 'Wrong Number', now: NOW } })).status()).toBe(200);
    expect(await withDb(db => db.collection('phone_numbers').findOne({ ct, idx: 0 }))).toMatchObject({ st: 'bad' });
    expect(await withDb(db => db.collection('contacts').findOne({ _id: ct as never }))).toMatchObject({ out: 'Wrong Number', nextAt: null });
  });
});
