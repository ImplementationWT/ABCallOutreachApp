/* What the app does is saved in MongoDB and comes back after a reload. */
import { expect, test } from '@playwright/test';
import { btn, idle, openApp } from './targets';
import { reseed, withDb } from './db';

test.beforeEach(async () => { await reseed(); });

test('a saved call, a new campaign and a rule survive a reload', async ({ page }) => {
  await openApp(page, '/');
  await btn(page, 'Maya Torres').click(); await idle(page);
  await btn(page, 'Start Workday').click(); await idle(page);
  await page.locator('.ob', { hasText: 'Left VM' }).first().click(); await idle(page);
  await page.locator('textarea.fld').first().fill('Saved in MongoDB');
  await btn(page, 'Save and next').click(); await idle(page);
  await expect(page.locator('.qhead b')).toHaveText('Today: 1 of 14 documented');
  await page.waitForTimeout(800);

  await withDb(async db => {
    const call = await db.collection('call_log').findOne({ note: 'Saved in MongoDB' });
    expect(call).toMatchObject({ rep: 'may', out: 'Left VM', live: true });
    expect(await db.collection('workdays').findOne({ _id: '2026-11-02:may' as never })).toMatchObject({ st: 'started' });
    expect(await db.collection('contacts').findOne({ _id: call!.ct })).toMatchObject({ n: 'Laura Whitfield', out: 'Left VM', att: 3 });
  });

  await page.reload(); await page.waitForLoadState('networkidle');
  await expect(page.locator('.qhead b')).toHaveText('Today: 1 of 14 documented');
  await expect(page.locator('.qi.done')).toContainText('Left VM');

  await page.goto('/mgr/camp'); await page.waitForLoadState('networkidle');
  await btn(page, 'New campaign').click(); await idle(page);
  await btn(page, 'Create campaign').click(); await idle(page);
  await page.goto('/mgr/rules'); await page.waitForLoadState('networkidle');
  await page.locator('#cfg-maxAtt').fill('4'); await page.locator('#cfg-maxAtt').blur(); await idle(page);
  await page.waitForTimeout(800);
  await page.reload(); await page.waitForLoadState('networkidle');
  await expect(page.locator('#cfg-maxAtt')).toHaveValue('4');
  await page.goto('/mgr/camp'); await page.waitForLoadState('networkidle');
  await expect(page.locator('.rows').first()).toContainText('C-1103-A');
  await withDb(async db => {
    expect(await db.collection('rules').findOne({})).toMatchObject({ maxAtt: 4 });
    expect(await db.collection('campaigns').countDocuments()).toBe(6);
  });
});

test('the database rejects a malformed document', async ({ request }) => {
  const res = await request.post('/api/state', { data: { changes: { call_log: { upsert: [{ _id: 1, ct: 'C-5001', rep: 'nobody', at: 'yesterday', out: 'Maybe', ph: '' }] } } } });
  expect(res.status()).toBe(500);
  const bad = await request.post('/api/state', { data: { changes: { users: { upsert: [{ _id: 'x' }] } } } });
  expect(bad.status()).toBe(400);
});
