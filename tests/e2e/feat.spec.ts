/* feat/campaign-filtering (Andrew's round 1), end to end on calloutreach_e2e: UI -> API -> MongoDB.
 * Users: maya (rep) and admin. Day: the seed's demo day, Mon Nov 2, 2026 (browser clock fixed). */
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { createSession, ensureTeamUsers } from '../../lib/db/auth-core';
import { resetUsers, reseed, withDb } from './db';
import { runMigrations } from '../../lib/db/migrations';
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

test.describe('2. Permanent campaigns', () => {
  test('migration: the daily campaigns that exist are ended with their history; running it again changes nothing', async () => {
    await withDb(async db => {
      await db.collection('campaigns').insertOne({ _id: 'C-1030-A' as never, date: '2026-10-30', auds: ['pp'], reps: ['may'], goal: 1, pos: 50 });
      await db.collection('migrations').deleteOne({ _id: '2026-11-permanent-campaigns' as never });
      const r = await runMigrations(db);
      expect(r.find(x => x.name === '2026-11-permanent-campaigns')).toMatchObject({ skipped: false, result: '1 daily campaign ended' });
      expect(await db.collection('campaigns').findOne({ _id: 'C-1030-A' as never })).toMatchObject({ status: 'ended', since: '2026-10-30', date: '2026-10-30', auds: ['pp'] });
      expect(await db.collection('campaigns').countDocuments({ status: 'active' })).toBe(2);
      expect((await runMigrations(db)).every(x => x.skipped)).toBe(true);
      await db.collection('campaigns').deleteOne({ _id: 'C-1030-A' as never });
    });
  });
  test('the Campaigns page groups active, paused and ended; several are active at once', async ({ browser }) => {
    const p = await page(browser, 'admin', '/mgr/camp');
    await expect(p.locator('[data-camps=active] [data-camp]')).toHaveCount(2);
    await expect(p.locator('[data-camps=ended] [data-camp]')).toHaveCount(3);
    await expect(p.locator('[data-camp=C-PPSM]')).toContainText('Active');
    await expect(p.locator('[data-camps=ended]')).toContainText('Daily campaign of');
  });
  test('ending a campaign stops its assignments and keeps its history; the rep sees "No active campaigns"', async ({ browser }) => {
    const calls = await withDb(db => db.collection('call_log').countDocuments({ rep: 'may' }));
    const a = await page(browser, 'admin', '/mgr/camp');
    await a.locator('[data-camp=C-PPSM] [data-act=campend]').click();
    await expect(a.locator('.modal')).toContainText('Ending is final');
    await a.locator('.modal [data-act=campenddone]').click();
    await expect(a.locator('#toast')).toContainText('ended. Its history is kept');
    await expect(a.locator('[data-camps=ended] [data-camp=C-PPSM]')).toBeVisible();
    await expect(a.locator('[data-camp=C-PPSM] [data-act=campresume], [data-camp=C-PPSM] [data-act=camppause]')).toHaveCount(0);
    await a.waitForTimeout(800);
    expect(await withDb(db => db.collection('campaigns').findOne({ _id: 'C-PPSM' as never }))).toMatchObject({ status: 'ended', since: DAY });
    expect(await withDb(db => db.collection('call_log').countDocuments({ rep: 'may' }))).toBe(calls);
    // Maya's day not started and her list empty: her start screen says why
    await withDb(async db => { await db.collection('reservations').deleteMany({ date: DAY, rep: 'may' }); await db.collection('workdays').updateOne({ _id: `${DAY}:may` as never }, { $set: { st: 'reserved', startedAt: null } }); });
    const m = await page(browser, 'maya', '/rep/today?no-start');
    await expect(m.locator('.startw [data-empty=nocamp]')).toContainText('No active campaigns');
    await expect(m.locator('.startw')).not.toContainText('No campaign today');
    await withDb(db => db.collection('campaigns').updateOne({ _id: 'C-PPSM' as never }, { $set: { status: 'active', since: null } }));
  });
  test('a manager creates a campaign without a date: it is active at once', async ({ browser }) => {
    const a = await page(browser, 'admin', '/mgr/camp');
    await a.click('[data-act=newcamp]');
    await a.fill('#ncname', 'Malibu permits');
    await a.click('[data-act=ncaud][data-v=pp]'); await a.click('[data-act=ncaud][data-v=mb]');
    await a.click('.modal [data-act=ncsave]');
    await expect(a.locator('#toast')).toContainText('Campaign created: Malibu permits is active');
    await a.waitForTimeout(800);
    const c = await withDb(db => db.collection('campaigns').findOne({ n: 'Malibu permits' }));
    expect(c).toMatchObject({ status: 'active', auds: ['mb'], created: DAY });
    expect(c).not.toHaveProperty('date');
    await withDb(db => db.collection('campaigns').deleteOne({ _id: c!._id }));
  });
});

test.describe('3. Manual dialing', () => {
  test('one click from the list and from the contact card: a tel: link with the normalized number, and the result is recorded in the same view', async ({ browser }) => {
    await withDb(async db => { await db.collection('reservations').deleteMany({ date: DAY, rep: 'may' }); await db.collection('workdays').updateOne({ _id: `${DAY}:may` as never }, { $set: { st: 'reserved', startedAt: null } }); });
    const p = await page(browser, 'maya');
    const row = p.locator('.qi[data-act=qsel]:not(.done)').nth(1);
    const ck = (await row.getAttribute('data-v'))!;
    const link = row.locator('a.qcall');
    const href = (await link.getAttribute('href'))!;
    expect(href).toMatch(/^tel:\+1\d{10}$/);
    await link.click();
    // the contact is selected and on call, without leaving the view
    await expect(p).toHaveURL(/\/rep\/today$/);
    await expect(p.locator('.wdet .dh h2')).toHaveText((await row.locator('b').first().textContent())!);
    await expect(p.locator('.oncall')).toContainText('from your phone');
    const card = p.locator('.ph-r a[data-call]');
    expect(await card.first().getAttribute('href')).toMatch(/^tel:\+1\d{10}$/);
    await p.click(`[data-act=setout][data-v="${ck}|Left VM"]`);
    await p.click(`[data-act=saveout][data-v="${ck}"]`);
    await expect(p.locator('#toast')).toContainText('Left VM saved');
    expect(await withDb(db => db.collection('call_log').findOne({ ct: ck, out: 'Left VM', rep: 'may' }))).toBeTruthy();
  });
  test('a number marked wrong is not offered to call: no link in the card, and the list links the next valid one', async ({ browser }) => {
    const r = await withDb(db => db.collection('reservations').find({ date: DAY, rep: 'may', done: null }).toArray());
    const ct = String(r.find(x => !String(x.ct).includes('@'))!.ct);
    await withDb(async db => {
      await db.collection('phone_numbers').updateMany({ ct }, { $set: { st: 'bad' } });
      await db.collection('phone_numbers').insertOne({ _id: `${ct}#5` as never, ct, idx: 5, n: '(626) 555-0177', st: 'untested' });
    });
    const p = await page(browser, 'maya');
    await p.locator(`.qi[data-v="${ct}"]`).click();
    await expect(p.locator('.ph-r.bad')).not.toHaveCount(0);
    await expect(p.locator('.ph-r.bad a[data-call]')).toHaveCount(0);
    await expect(p.locator('.ph-r a[data-call]')).toHaveCount(1);
    expect(await p.locator(`.qi[data-v="${ct}"] a.qcall`).getAttribute('href')).toBe('tel:+16265550177');
  });
});
