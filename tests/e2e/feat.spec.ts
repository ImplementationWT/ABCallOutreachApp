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
    // the contact's numbers: only the first one, plus a second number the rep dials
    await withDb(async db => { await db.collection('phone_numbers').deleteMany({ ct, idx: { $ne: 0 } }); await db.collection('phone_numbers').updateOne({ ct, idx: 0 }, { $set: { st: 'untested' } }); await db.collection('phone_numbers').insertOne({ _id: `${ct}#1` as never, ct, idx: 1, n: '(310) 555-0999', st: 'untested' }); });
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
      await db.collection('campaigns').insertOne({ _id: 'C-0915-Z' as never, date: '2026-09-15', auds: ['pp'], reps: ['may'], goal: 1, pos: 50 });
      await db.collection('migrations').deleteOne({ _id: '2026-11-permanent-campaigns' as never });
      const r = await runMigrations(db);
      expect(r.find(x => x.name === '2026-11-permanent-campaigns')).toMatchObject({ skipped: false, result: '1 daily campaign ended' });
      expect(await db.collection('campaigns').findOne({ _id: 'C-0915-Z' as never })).toMatchObject({ status: 'ended', since: '2026-09-15', date: '2026-09-15', auds: ['pp'] });
      expect(await db.collection('campaigns').countDocuments({ status: 'active' })).toBe(2);
      expect((await runMigrations(db)).every(x => x.skipped)).toBe(true);
      await db.collection('campaigns').deleteOne({ _id: 'C-0915-Z' as never });
    });
  });
  test('Campaign Management: the audiences first, then one list (not grouped): active, then paused, then ended', async ({ browser }) => {
    const p = await page(browser, 'admin', '/mgr/camp');
    const y = async (s: string) => (await p.locator(s).first().boundingBox())!.y;
    expect(await y('[data-audiences]')).toBeLessThan(await y('[data-camps]'));
    await expect(p.locator('[data-camps] [data-camp]')).toHaveCount(5);
    const order = await p.locator('[data-camps] [data-camp]').evaluateAll(els => els.map(e => e.getAttribute('data-camp')));
    expect(order.slice(0, 2).sort()).toEqual(['C-ADMB', 'C-PPSM']);
    await expect(p.locator('[data-camp=C-PPSM]')).toContainText('Active');
    await expect(p.locator('[data-camps]')).toContainText('Daily campaign of');
    await expect(p.locator('.grp-h')).toHaveCount(0); // no groups
  });
  test('filter by audience', async ({ browser }) => {
    const p = await page(browser, 'admin', '/mgr/camp');
    await p.click('[data-act=filt][data-v="campaud|mb"]');
    await expect(p.locator('[data-camps] [data-camp]')).toHaveCount(2); // Altadena and Malibu: active and its old daily one
    for (const t of await p.locator('[data-camps] [data-camp]').allTextContents()) expect(t).toContain('Malibu');
    await p.click('[data-act=filt][data-v="campaud|all"]');
    await expect(p.locator('[data-camps] [data-camp]')).toHaveCount(5);
  });
  test('icon buttons: pause turns into resume; edit changes audiences and reps', async ({ browser }) => {
    const p = await page(browser, 'admin', '/mgr/camp');
    const row = p.locator('[data-camp=C-ADMB]');
    await expect(row.locator('button.ibtn')).toHaveCount(3);
    for (const b of await row.locator('button.ibtn').all()) { expect((await b.textContent())?.trim()).toBe(''); expect(await b.getAttribute('aria-label')).toBeTruthy(); }
    expect(await row.locator('[data-act=campend]').evaluate(e => getComputedStyle(e).color)).not.toBe(await row.locator('[data-act=campedit]').evaluate(e => getComputedStyle(e).color)); // red
    await row.locator('[data-act=camppause]').click();
    await expect(row).toContainText('Paused');
    await expect(row.locator('[data-act=camppause]')).toHaveCount(0);
    await row.locator('[data-act=campresume]').click();
    await expect(row).toContainText('Active');
    await row.locator('[data-act=campedit]').click();
    await expect(p.locator('.modal')).toContainText('Edit campaign');
    await p.click('.modal [data-act=ncaud][data-v=mb]'); // Altadena only
    await p.click('.modal [data-act=ncrep][data-v=may]'); // and Maya too
    await p.click('.modal [data-act=ncsave]');
    await expect(p.locator('#toast')).toContainText('saved');
    await p.waitForTimeout(800);
    expect(await withDb(db => db.collection('campaigns').findOne({ _id: 'C-ADMB' as never }))).toMatchObject({ status: 'active', auds: ['ad'], reps: ['dan', 'pri', 'may'] });
    await withDb(db => db.collection('campaigns').updateOne({ _id: 'C-ADMB' as never }, { $set: { auds: ['ad', 'mb'], reps: ['dan', 'pri'] } }));
  });
  test('ending a campaign stops its assignments and keeps its history; the rep sees "No active campaigns"', async ({ browser }) => {
    const calls = await withDb(db => db.collection('call_log').countDocuments({ rep: 'may' }));
    const a = await page(browser, 'admin', '/mgr/camp');
    await a.locator('[data-camp=C-PPSM] [data-act=campend]').click();
    await expect(a.locator('.modal')).toContainText('Ending is final');
    await a.locator('.modal [data-act=campenddone]').click();
    await expect(a.locator('#toast')).toContainText('ended. Its history is kept');
    await expect(a.locator('[data-camp=C-PPSM]')).toContainText('Ended');
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

test.describe('4. Metrics', () => {
  test('catalog: "counts as connect" and "creates a lead"; the migration fills connect on a catalog that does not have it', async () => {
    await withDb(async db => {
      const col = db.collection('outcomes');
      const lead = (await col.find({ lead: true }).toArray()).map(d => d._id);
      expect(lead.sort()).toEqual(['Interested', 'Working on Plans']);
      await col.updateMany({}, { $unset: { connect: '' } });
      await db.collection('migrations').deleteOne({ _id: '2026-11-outcome-connect' as never });
      const r = await runMigrations(db);
      expect(r.find(x => x.name === '2026-11-outcome-connect')).toMatchObject({ skipped: false, result: 'connect set on 11 outcomes' });
      const no = (await col.find({ connect: false }).toArray()).map(d => d._id).sort();
      expect(no).toEqual(['Left VM', 'Not Contacted', 'Wrong Number']);
    });
  });
  test('"counts as connect" stays configurable through the catalog API (the screen was removed)', async ({ playwright }) => {
    const a = await api(playwright, 'andrew');
    expect((await a.post('/api/outcomes', { data: { action: 'update', name: 'Hung Up', connect: false } })).status()).toBe(200);
    expect(await withDb(db => db.collection('outcomes').findOne({ _id: 'Hung Up' as never }))).toMatchObject({ connect: false });
    await withDb(db => db.collection('outcomes').updateOne({ _id: 'Hung Up' as never }, { $set: { connect: true } }));
  });
  test('Reports: number tiles and charts for the day, from the recorded results, against last week', async ({ browser }) => {
    // last week's Monday: two calls by Daniel, one a connect
    await withDb(db => db.collection('call_log').insertMany([
      { _id: 800001 as never, ct: 'C-5001', rep: 'dan', at: '2026-10-26T10:00', out: 'Left VM', note: '', ph: '' },
      { _id: 800002 as never, ct: 'C-5001', rep: 'dan', at: '2026-10-26T10:05', out: 'Undecided', note: '', ph: '' },
    ]));
    const { calls, out } = await withDb(async db => ({
      calls: await db.collection('call_log').find({ at: { $regex: `^${DAY}` }, rep: { $in: ['may', 'dan', 'pri'] } }).toArray(),
      out: Object.fromEntries((await db.collection('outcomes').find({}).toArray()).map(o => [o._id, o])),
    }));
    const per = (rep?: string) => { const cs = calls.filter(c => !rep || c.rep === rep); return { calls: cs.length, con: cs.filter(c => out[c.out].connect).length, convos: cs.filter(c => out[c.out].group === 'conv').length, leads: cs.filter(c => out[c.out].lead).length }; };
    const p = await page(browser, 'admin', '/mgr/reports');
    // the day picker: the date centered in the field, the arrows as tall as the field, no repeated date
    await expect(p.locator('[data-report-day]')).toHaveText('Mon, Nov 2');
    await expect(p.locator('[data-act=repnow]')).toHaveCount(0); // already today
    const field = (await p.locator('[data-report-day] .pk-b').boundingBox())!;
    for (const b of await p.locator('[data-report-bar] .rnav').all()) expect(Math.abs((await b.boundingBox())!.height - field.height)).toBeLessThanOrEqual(1);
    expect(await p.locator('[data-report-day] .pk-b').evaluate(e => getComputedStyle(e).justifyContent)).toBe('center');
    await expect(p.locator('#main')).not.toContainText('How each number is counted');
    const team = per();
    expect(team.calls).toBeGreaterThan(0);
    await expect(p.locator('[data-activity] [data-metric=calls] b')).toHaveText(String(team.calls));
    await expect(p.locator('[data-activity] [data-metric=connects] b')).toHaveText(String(team.con));
    await expect(p.locator('[data-activity] [data-metric=convos] b')).toHaveText(String(team.convos));
    await expect(p.locator('[data-activity] [data-metric=leads] b')).toHaveText(String(team.leads));
    await expect(p.locator('[data-activity] [data-metric=d2c] b')).toHaveText(Math.round(team.con * 100 / team.calls) + '%');
    // calls by rep: one bar per rep with its total; hover shows every metric of that rep
    for (const r of ['may', 'dan', 'pri']) await expect(p.locator(`[data-chart=calls-by-rep] [data-rep=${r}] .vval`)).toHaveText(String(per(r).calls));
    await p.locator('[data-chart=calls-by-rep] [data-rep=dan]').hover();
    const tip = p.locator('[data-chart=calls-by-rep] [data-chart-tip]');
    await expect(tip).toContainText('Daniel Brooks');
    for (const m of ['Calls Made', 'Connects', 'Conversations', 'New Leads', 'Dial to Connect', 'Connect to Lead']) await expect(tip).toContainText(m);
    // the team's trend: 14 days with a crosshair tooltip
    const svg = p.locator('[data-chart=team-trend] svg[role=img]');
    const bb = (await svg.boundingBox())!;
    await svg.hover({ position: { x: bb.width - 110, y: 60 } });
    await expect(p.locator('[data-chart=team-trend] [data-chart-tip]')).toContainText('Calls Made');
    await p.locator('[data-chart=team-trend] summary').click();
    await expect(p.locator('[data-chart=team-trend] .vtable tr')).toHaveCount(15);
    // the conversion rates by rep
    await expect(p.locator('[data-chart=rates-by-rep] [data-rep]')).toHaveCount(3);
    // against the same day last week (the seed's calls that day plus the two above)
    const prev = await withDb(db => db.collection('call_log').countDocuments({ at: { $regex: '^2026-10-26' }, rep: { $in: ['may', 'dan', 'pri'] } }));
    expect(prev).toBeGreaterThanOrEqual(2);
    await expect(p.locator('[data-activity] [data-metric=calls] .rtrend')).toContainText(`vs Oct 26 (${prev})`);
    await expect(p.locator('[data-activity] [data-metric=calls] .rtrend')).toHaveAttribute('data-trend', String(team.calls - prev));
    // the rep with the most calls is first
    const best = ['may', 'dan', 'pri'].sort((x, y) => per(y).calls - per(x).calls)[0];
    expect(await p.locator('[data-chart=calls-by-rep] [data-rep]').first().getAttribute('data-rep')).toBe(best);
    // the previous day
    await p.click('[data-act=repnav][data-v="-1"]');
    await expect(p.locator('[data-report-day]')).toHaveText('Sun, Nov 1');
    await p.click('[data-act=repnow]');
    await expect(p.locator('[data-report-day]')).toHaveText('Mon, Nov 2');
    await withDb(db => db.collection('call_log').deleteMany({ _id: { $in: [800001, 800002] } as never }));
  });
  test('the Outreach Manager (manager) and an administrator see Reports; a rep does not', async ({ browser }) => {
    for (const u of ['andrew', 'admin']) {
      const m = await page(browser, u, '/mgr/reports');
      await expect(m.locator('.op-h h1'), u).toHaveText('Reports');
      await expect(m.locator('[data-activity] [data-metric=calls] b'), u).toBeVisible();
      await expect(m.locator('.sb [data-act=pg_mgr][data-v=reports]'), u).toHaveCount(1);
    }
    const r = await page(browser, 'maya', '/mgr/reports');
    await expect(r).toHaveURL(/\/rep\/today$/);
  });
});

test.describe('5. Menu, Global Assignment Rules, and the removed pages', () => {
  test('the sidebar: Reports, Contact pool, Hand-offs, Campaign Management, Global Assignment Rules, Users; nothing removed is left', async ({ browser }) => {
    const a = await page(browser, 'admin', '/mgr/reports');
    const nav = (await a.locator('.sb button.nav').allTextContents()).map(t => t.trim());
    expect(nav.filter(t => !/^Hand-offs/.test(t))).toEqual(['Reports', 'Contact pool', 'Campaign Management', 'Global Assignment Rules', 'Users']);
    for (const gone of ['The day by rep', 'How it works', 'Performance', 'Daily emails', 'monday sync', 'Call outcomes']) expect(nav, gone).not.toContain(gone);
    await a.locator('#appsel').click();
    await expect(a.locator('[role=menu] [role=menuitem]')).toHaveText([/^Rep Workspace/, /^Outreach Manager/, /^Properties/, /^Calling and AI/]);
  });
  test('Global Assignment Rules: workload and max attempts side by side, then the rules that always apply; no outcome catalog', async ({ browser }) => {
    const a = await page(browser, 'admin', '/mgr/rules');
    await expect(a.locator('.op-h h1')).toHaveText('Global Assignment Rules');
    for (const s of ['#cfg-first', '#cfg-more', '[data-act=cfgset][data-v="refresh|daily"]', '#cfg-maxAtt', '[data-area=priority] .ptbl', '[data-area=global]', '[data-area=elig]']) await expect(a.locator(s).first(), s).toBeVisible();
    // gone: the two fixed choices and the catalog, and the "Fixed in this version" title
    for (const s of ['[data-v^="endDay|"]', '[data-v^="reactivateReset|"]', '[data-outcome]']) await expect(a.locator(s), s).toHaveCount(0);
    await expect(a.locator('#main')).not.toContainText('Fixed in this version');
    await expect(a.locator('#main')).not.toContainText('Call outcomes');
    await expect(a.locator('[data-area=global]')).toContainText('goes back to the pool');
    await expect(a.locator('[data-area=elig]')).toContainText('keeps its attempts');
    // max attempts sits beside the workload, not alone below it
    const w = (await a.locator('[data-area=workload]').boundingBox())!, m = (await a.locator('[data-area=attempts]').boundingBox())!;
    expect(Math.abs(w.y - m.y)).toBeLessThan(2);
    expect(m.x).toBeGreaterThan(w.x + w.width - 1);
  });
  test('the removed pages: old links open Reports; Data and How it works are gone', async ({ browser }) => {
    const a = await page(browser, 'admin', '/mgr/perf');
    await expect(a.locator('.op-h h1')).toHaveText('Reports');
    for (const p of ['/mgr/mail', '/mgr/sync', '/mgr/live']) { await a.goto(p); await a.waitForLoadState('networkidle'); await expect(a.locator('.op-h h1'), p).toHaveText('Reports'); }
    for (const p of ['/rep/today', '/prp/props']) { await a.goto(p); await a.waitForLoadState('networkidle'); await expect(a.locator('.sb'), p).not.toContainText('How it works'); }
    expect((await a.goto('/data'))!.status()).toBe(404);
  });
  test('a setting changed in its area is saved and used: daily allocation', async ({ browser }) => {
    const a = await page(browser, 'admin', '/mgr/rules');
    await a.locator('#cfg-first').fill('150'); await a.locator('#cfg-first').blur();
    await expect(a.locator('#toast')).toContainText('Rule saved');
    await a.waitForTimeout(800);
    expect(await withDb(db => db.collection('rules').findOne({ _id: 'default' as never }))).toMatchObject({ first: 150 });
    await withDb(db => db.collection('rules').updateOne({ _id: 'default' as never }, { $set: { first: 200 } }));
  });
  test('the old Call outcomes link lands in Global Assignment Rules; the manager changes the rules there', async ({ browser }) => {
    const a = await page(browser, 'admin', '/mgr/outc');
    await expect(a.locator('.op-h h1')).toHaveText('Global Assignment Rules');
    const m = await page(browser, 'andrew', '/mgr/rules');
    await expect(m.locator('#cfg-maxAtt')).not.toHaveAttribute('readonly', '');
  });
  test('a rep has no settings: Outreach Manager stays closed', async ({ browser }) => {
    const r = await page(browser, 'maya', '/mgr/rules');
    await expect(r).toHaveURL(/\/rep\/today$/);
  });
});

test.describe('6. Roles: the Outreach Manager (manager) does everything in Outreach Manager; a rep gets 403', () => {
  const NOW = `${DAY}T11:00`;
  const onHold = () => withDb(async db => String((await db.collection('contacts').findOne({ n: 'Raymond Varga' }))!._id));
  test('API: manager and admin edit the catalog, reassign and reactivate; a rep is refused', async ({ playwright }) => {
    const [maya, andrew, admin] = [await api(playwright, 'maya'), await api(playwright, 'andrew'), await api(playwright, 'admin')];
    // the outcome catalog
    expect((await maya.post('/api/outcomes', { data: { action: 'update', name: 'Left VM', hint: 'x' } })).status()).toBe(403);
    for (const u of [andrew, admin]) expect((await u.post('/api/outcomes', { data: { action: 'update', name: 'Left VM', hint: 'Voicemail left' } })).status()).toBe(200);
    // campaigns and rules (POST /api/state)
    const camp = await withDb(db => db.collection('campaigns').findOne({ _id: 'C-PPSM' as never }));
    expect((await maya.post('/api/state', { data: { changes: { campaigns: { upsert: [{ ...camp, status: 'paused' }] } } } })).status()).toBe(403);
    expect((await andrew.post('/api/state', { data: { changes: { campaigns: { upsert: [{ ...camp, goal: 2 }] } } } })).status()).toBe(200);
    expect((await andrew.post('/api/state', { data: { changes: { campaigns: { upsert: [camp] } } } })).status()).toBe(200);
    // Reassign
    expect((await maya.post('/api/work', { data: { action: 'reassign', rep: 'may', to: 'dan', n: 1, now: NOW } })).status()).toBe(403);
    expect((await andrew.post('/api/work', { data: { action: 'reassign', rep: 'dan', to: 'pri', n: 1, now: NOW } })).status()).toBe(200);
    // reactivate an on-hold contact assigned to Priya
    const ct = await onHold();
    const refused = await maya.post('/api/work', { data: { action: 'reactivate', ct, now: NOW } });
    expect(refused.status()).toBe(403);
    expect((await refused.json()).error).toBe('Only the rep assigned to this contact or the Outreach Manager can reactivate it');
    expect((await andrew.post('/api/work', { data: { action: 'reactivate', ct, now: NOW } })).status()).toBe(200);
    expect((await withDb(db => db.collection('contacts').findOne({ _id: ct as never })))!.react).toBe(6);
  });
  test('screens: the manager has every Outreach Manager area, the catalog and the Reactivate button; a rep is sent back to their list', async ({ browser }) => {
    await withDb(async db => { const ct = await db.collection('contacts').findOne({ n: 'Raymond Varga' }); await db.collection('contacts').updateOne({ _id: ct!._id }, { $set: { react: null } }); });
    const m = await page(browser, 'andrew', '/mgr/live');
    const nav = (await m.locator('.sb button.nav').allTextContents()).map(t => t.trim());
    for (const n of ['Reports', 'Campaign Management', 'Global Assignment Rules']) expect(nav, n).toContain(n);
    await m.goto('/mgr/camp'); await m.waitForLoadState('networkidle');
    await expect(m.locator('[data-camp=C-PPSM] [data-act=camppause]')).toBeVisible();
    await m.goto('/mgr/pool'); await m.waitForLoadState('networkidle');
    await m.locator('.stat', { hasText: 'On hold, max attempts' }).click();
    await m.locator('#srpool').fill('Raymond Varga');
    await expect(m.locator('.row', { hasText: 'Raymond Varga' }).locator('[data-act=reactivate]')).toBeVisible();
    for (const path of ['/mgr/live', '/mgr/camp', '/mgr/rules', '/mgr/reports']) {
      const r = await page(browser, 'maya', path);
      await expect(r, path).toHaveURL(/\/rep\/today$/);
    }
  });
});

test.describe('7. Layout', () => {
  test('Reports: no buttons in the header, and room between the count and the progress bar of each rep', async ({ browser }) => {
    const a = await page(browser, 'admin', '/mgr/reports');
    await expect(a.locator('.op-h button')).toHaveCount(0);
    const card = a.locator('.repc').first();
    const gap = (await card.locator('.bar').boundingBox())!.y - ((await card.locator('.repc-prog').boundingBox())!.y + (await card.locator('.repc-prog').boundingBox())!.height);
    expect(gap).toBeGreaterThanOrEqual(7);
  });
  test('the top bar shows whose account it is: name and role', async ({ browser }) => {
    for (const [u, name, role] of [['admin', 'Administrator', 'Administrator'], ['andrew', 'Andrew Vaitkevicius', 'Manager'], ['maya', 'Maya Torres', 'Sales rep']]) {
      const p = await page(browser, u, u === 'maya' ? '/rep/fu' : '/mgr/live');
      await expect(p.locator('#usermenu [data-me] b'), u).toHaveText(name);
      await expect(p.locator('#usermenu [data-me] small'), u).toHaveText(role);
      await expect(p.locator('#usermenu [data-me]'), u).toBeVisible();
    }
  });
});
