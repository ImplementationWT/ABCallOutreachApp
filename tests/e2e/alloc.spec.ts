/* Allocation runs on the server, one at a time: two reps who ask for more at the same moment, each
 * with the app loaded before the other's request, never get the same contact; and Start Workday with
 * an empty list brings the first batch without asking for more. */
import { expect, test, type Browser, type Page } from '@playwright/test';
import { createSession, ensureTeamUsers } from '../../lib/db/auth-core';
import { ARTIFACT_DAY, resetUsers, reseed, withDb } from './db';
import { fixClock } from './targets';

const DAY = '2026-11-02';
test.beforeAll(async () => {
  await reseed();
  await withDb(async db => {
    await ensureTeamUsers(db);
    await db.collection('users').updateMany({}, { $set: { mustChange: false } });
    // Maya and Daniel: day started with an empty list, so "Request more" gives them a batch.
    // Priya: day not started and an empty list, so "Start Workday" gives her the first batch.
    await db.collection('reservations').deleteMany({ date: DAY, rep: { $in: ['may', 'dan', 'pri'] } });
    await db.collection('workdays').updateMany({ date: DAY, rep: { $in: ['may', 'dan'] } }, { $set: { st: 'started', startedAt: `${DAY}T08:00` } });
    await db.collection('workdays').updateOne({ date: DAY, rep: 'pri' }, { $set: { st: 'reserved', startedAt: null } });
    // ...from the same campaign (same audiences), as in production, so they compete for the same contacts
    await db.collection('campaigns').deleteMany({ date: DAY });
    await db.collection('campaigns').insertOne({ _id: 'C-1102-A' as never, date: DAY, auds: ['pp', 'sm', 'mb', 'ad'], reps: ['may', 'dan', 'pri'], goal: 1, pos: 0 });
  });
});
test.afterAll(async () => { await resetUsers(); await reseed(); });

async function as(browser: Browser, user: string): Promise<Page> {
  const token = await withDb(db => createSession(db, user));
  const page = await browser.newPage({ storageState: { cookies: [{ name: 'ab_session', value: token, domain: 'localhost', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] } });
  await fixClock(page);
  await page.goto('/rep/today');
  await page.waitForLoadState('networkidle');
  return page;
}
const listOf = async (page: Page) => (await page.locator('[data-act=qsel]').evaluateAll(els => els.map(e => e.getAttribute('data-v')!))).map(k => k.split('@')[0]);

test('two reps asking for more at once never get the same contact', async ({ browser }) => {
  expect(ARTIFACT_DAY.getDate()).toBe(2);
  const [maya, dan] = await Promise.all([as(browser, 'maya'), as(browser, 'daniel')]);
  expect(await listOf(maya)).toEqual([]);
  expect(await listOf(dan)).toEqual([]);
  // Both pages were loaded before either request: in the browser alone they would pick the same contacts
  await Promise.all([maya.locator('[data-act=reqmore]').first().click(), dan.locator('[data-act=reqmore]').first().click()]);
  for (const p of [maya, dan]) await expect(p.locator('#toast')).toContainText('more contacts added to your list');
  const [a, b] = [await listOf(maya), await listOf(dan)];
  expect(a.length).toBeGreaterThan(0);
  expect(b.length).toBeGreaterThan(0);
  expect(a.filter(k => b.includes(k))).toEqual([]);
  // The database agrees with each screen
  const res = await withDb(db => db.collection('reservations').find({ date: DAY, rep: { $in: ['may', 'dan'] } }).toArray());
  expect(res.filter(r => r.rep === 'may').map(r => String(r.ct).split('@')[0]).sort()).toEqual([...a].sort());
  expect(res.filter(r => r.rep === 'dan').map(r => String(r.ct).split('@')[0]).sort()).toEqual([...b].sort());
  // A reload shows the same lists
  await maya.reload(); await maya.waitForLoadState('networkidle');
  expect((await listOf(maya)).sort()).toEqual([...a].sort());
});

test('Start Workday with an empty list brings the first batch, none of it in another list', async ({ browser }) => {
  const pri = await as(browser, 'priya');
  expect(await listOf(pri)).toEqual([]);
  await pri.locator('[data-act=startday]').click();
  await expect(pri.locator('#toast')).toContainText(/Workday started: \d+ contacts for today/);
  const mine = await listOf(pri);
  expect(mine.length).toBeGreaterThan(0);
  const others = await withDb(db => db.collection('reservations').find({ date: DAY, rep: { $ne: 'pri' } }).toArray());
  expect(mine.filter(k => others.some(r => String(r.ct).split('@')[0] === k))).toEqual([]);
  expect(await withDb(db => db.collection('workdays').findOne({ _id: `${DAY}:pri` as never }))).toMatchObject({ st: 'started' });
});
