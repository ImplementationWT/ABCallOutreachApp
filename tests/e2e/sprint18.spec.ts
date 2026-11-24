/* Sprint 18 validation, end to end (UI -> API -> MongoDB -> other views), on calloutreach_e2e.
 * test.fail() = the criterion is NOT met today: the test states the expected behaviour and is
 * expected to fail; Playwright reports it as passing until the gap is fixed (then it must be flipped).
 * Users: maya and daniel (reps), admin. Day: the seed's demo day, Mon Nov 2, 2026 (browser clock fixed). */
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { createSession, ensureTeamUsers } from '../../lib/db/auth-core';
import { resetUsers, reseed, withDb } from './db';
import { fixClock } from './targets';

const DAY = '2026-11-02';
const BASE = 'http://localhost:3217';
const cookie = (token: string) => ({ cookies: [{ name: 'ab_session', value: token, domain: 'localhost', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' as const }], origins: [] });
const token = (user: string) => withDb(db => createSession(db, user));

test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  await reseed();
  await withDb(async db => { await ensureTeamUsers(db); await db.collection('users').updateMany({}, { $set: { mustChange: false } }); });
});
test.afterAll(async () => { await resetUsers(); await reseed(); });

async function page(browser: Browser, user: string, path = '/rep/today', width = 1440): Promise<Page> {
  const p = await browser.newPage({ storageState: cookie(await token(user)), viewport: { width, height: 900 } });
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

test.describe('6. API: a rep cannot read or change another rep\'s data', () => {
  test('a rep cannot allocate for another rep, nor manage users', async ({ playwright }) => {
    const maya = await api(playwright, 'maya');
    expect((await maya.post('/api/allocate', { data: { kind: 'more', rep: 'dan', now: `${DAY}T09:00` } })).status()).toBe(403);
    expect((await maya.get('/api/users')).status()).toBe(403);
  });
  test('GET /api/state gives a rep only their own lists, workdays and numbers, and only the properties of their work', async ({ playwright }) => {
    const maya = await api(playwright, 'maya');
    const s = await (await maya.get('/api/state')).json();
    expect(s.reservations.filter((r: { rep: string }) => r.rep !== 'may')).toEqual([]);
    expect(s.workdays.filter((r: { rep: string }) => r.rep !== 'may')).toEqual([]);
    expect(s.daily_metrics.filter((r: { rep: string }) => r.rep !== 'may')).toEqual([]);
    expect(s.sync_log).toEqual([]);
    // a contact that is only in Daniel's list (its property is not in Maya's work) is not sent
    const dan = await withDb(db => db.collection('reservations').find({ date: DAY, rep: 'dan' }).toArray());
    const all = await withDb(db => db.collection('contacts').find({}).toArray());
    const propOf = (k: string) => k.includes('@') ? k.split('@')[1] : String(all.find(c => String(c._id) === k)!.prop);
    const mayProps = new Set(s.properties.map((p: { _id: string }) => p._id));
    const onlyDan = dan.map(r => String(r.ct)).filter(k => !mayProps.has(propOf(k)));
    expect(onlyDan.length).toBeGreaterThan(0);
    for (const k of onlyDan) expect(s.contacts.map((c: { _id: string }) => c._id)).not.toContain(k.split('@')[0]);
    // a manager still gets everything
    const admin = await (await (await api(playwright, 'admin')).get('/api/state')).json();
    expect(admin.reservations.length).toBeGreaterThan(s.reservations.length);
  });
  test('POST /api/state refuses any write from a rep (a contact in another rep\'s list, a workday)', async ({ playwright }) => {
    const r = await withDb(db => db.collection('reservations').findOne({ date: DAY, rep: 'dan' }));
    const c = await withDb(db => db.collection('contacts').findOne({ _id: String(r!.ct).split('@')[0] as never }));
    const maya = await api(playwright, 'maya');
    expect((await maya.post('/api/state', { data: { changes: { contacts: { upsert: [{ ...c, out: 'Do Not Contact', note: 'changed by maya' }] } } } })).status()).toBe(403);
    const w = await withDb(db => db.collection('workdays').findOne({ _id: `${DAY}:dan` as never }));
    expect((await maya.post('/api/state', { data: { changes: { workdays: { upsert: [{ ...w, st: 'ended' }] } } } })).status()).toBe(403);
    expect(await withDb(db => db.collection('contacts').findOne({ _id: c!._id }))).toMatchObject({ out: c!.out ?? null });
  });
  test('POST /api/work: a rep cannot save a result, end the day or reassign for another rep, nor on a contact outside their list', async ({ playwright }) => {
    const r = await withDb(db => db.collection('reservations').findOne({ date: DAY, rep: 'dan', done: null }));
    const maya = await api(playwright, 'maya');
    const now = `${DAY}T09:00`;
    expect((await maya.post('/api/work', { data: { action: 'save', rep: 'dan', ct: r!.ct, out: 'Left VM', now } })).status()).toBe(403);
    const own = await maya.post('/api/work', { data: { action: 'save', rep: 'may', ct: r!.ct, out: 'Left VM', now } });
    expect(own.status()).toBe(403);
    expect((await own.json()).error).toBe('This contact is not in your list today');
    expect((await maya.post('/api/work', { data: { action: 'endday', rep: 'dan', now } })).status()).toBe(403);
    expect((await maya.post('/api/work', { data: { action: 'reassign', rep: 'may', to: 'dan', n: 1, now } })).status()).toBe(403);
  });
  test('nobody writes call results through POST /api/state (only the server saves them)', async ({ playwright }) => {
    const admin = await api(playwright, 'admin');
    const res = await admin.post('/api/state', { data: { changes: { call_log: { upsert: [{ _id: 999999, ct: 'x', rep: 'may', at: `${DAY}T09:00`, out: 'Left VM', ph: '' }] } } } });
    expect(res.status()).toBe(403);
  });
});

test.describe('C1. Outcome catalog (administrator only)', () => {
  test('only an administrator edits it; recall days of at least 1; names are unique', async ({ playwright }) => {
    for (const u of ['maya', 'andrew']) {
      const r = await (await api(playwright, u)).post('/api/outcomes', { data: { action: 'create', name: 'X', status: 'Contacted' } });
      expect(r.status(), u).toBe(403);
    }
    const admin = await api(playwright, 'admin');
    expect((await admin.post('/api/outcomes', { data: { action: 'create', name: 'Zero days', status: 'Contacted', recallDays: 0 } })).status()).toBe(400);
    expect((await admin.post('/api/outcomes', { data: { action: 'create', name: 'left vm', status: 'Contacted' } })).status()).toBe(409);
    expect((await admin.post('/api/outcomes', { data: { action: 'update', name: 'Left VM', recallDays: 0 } })).status()).toBe(400);
    // nobody writes the catalog through POST /api/state
    expect((await admin.post('/api/state', { data: { changes: { outcomes: { upsert: [{ _id: 'Y' }] } } } })).status()).toBe(403);
  });
  test('an administrator creates and deactivates outcomes on the screen; the rep\'s form follows the catalog', async ({ browser }) => {
    const a = await page(browser, 'admin', '/mgr/outc');
    await expect(a.locator('[data-outcome]')).toHaveCount(11);
    await a.getByRole('button', { name: 'New outcome' }).click();
    await a.locator('#o-name').fill('Moved away');
    await a.locator('#o-days').fill('3');
    await a.locator('[data-prop=property]').click();
    await a.getByRole('button', { name: 'Create outcome' }).click();
    await expect(a.locator('[data-outcome="Moved away"]')).toBeVisible();
    await a.locator('[data-toggle="Hung Up"]').click();
    await expect(a.locator('[data-outcome="Hung Up"]')).toContainText('Inactive');
    const doc = await withDb(db => db.collection('outcomes').findOne({ _id: 'Moved away' as never }));
    expect(doc).toMatchObject({ active: true, countsAsAttempt: true, recallDays: 3, propagates: 'property', needsFollowUp: false });
    const m = await page(browser, 'maya');
    const ck = (await m.locator('[data-act=saveout]').first().getAttribute('data-v'))!;
    await expect(m.locator(`[data-act=setout][data-v="${ck}|Moved away"]`)).toBeVisible();
    await expect(m.locator(`[data-act=setout][data-v="${ck}|Hung Up"]`)).toHaveCount(0);
    // back as it was for the rest of the file
    await withDb(async db => { await db.collection('outcomes').updateOne({ _id: 'Hung Up' as never }, { $set: { active: true } }); await db.collection('outcomes').deleteOne({ _id: 'Moved away' as never }); });
  });
});

test.describe('A. Rep Workspace', () => {
  test('A1 reloading does not regenerate or duplicate the list', async ({ browser }) => {
    const p = await page(browser, 'maya');
    const before = await withDb(db => db.collection('reservations').find({ date: DAY }).toArray());
    const list = await p.locator('[data-act=qsel]').evaluateAll(e => e.map(x => x.getAttribute('data-v')));
    await p.reload(); await p.waitForLoadState('networkidle');
    expect(await p.locator('[data-act=qsel]').evaluateAll(e => e.map(x => x.getAttribute('data-v')))).toEqual(list);
    const after = await withDb(db => db.collection('reservations').find({ date: DAY }).toArray());
    expect(after.map(r => `${r._id}:${r.rep}`).sort()).toEqual(before.map(r => `${r._id}:${r.rep}`).sort());
  });
  test('[No cumple] A1 if the morning run gave a rep nothing, the start screen says so (not a normal empty list)', async ({ browser }) => {
    test.fail();
    await withDb(async db => { await db.collection('reservations').deleteMany({ date: DAY, rep: 'pri' }); await db.collection('workdays').updateOne({ _id: `${DAY}:pri` as never }, { $set: { st: 'reserved', startedAt: null } }); });
    await withDb(db => db.collection('campaigns').updateMany({ date: DAY }, { $pull: { reps: 'pri' } as never }));
    const p = await page(browser, 'admin', '/mgr/live');
    await p.click('[data-act=viewas][data-v=pri]');
    await expect(p.locator('.startw')).toContainText(/No campaign today/i, { timeout: 3000 });
  });
  test('A2 the list is in priority order, and saving updates the counters without a reload', async ({ browser }) => {
    const p = await page(browser, 'maya');
    // Documented rule (lib/state/rep.ts:6-9): a household's contacts stay together, households ordered
    // by the best priority among their open contacts, then by the engine's order
    const rows = (await p.locator('.qsec', { hasText: 'To call' }).locator('xpath=following-sibling::*[@data-act="qsel"]').evaluateAll(els => els.map(e => ({ pr: (e.textContent!.match(/P[1-5]/) || [''])[0], addr: e.querySelectorAll('small')[0]?.textContent || '' }))));
    expect(rows.length).toBeGreaterThan(0);
    const order: string[] = []; const best: Record<string, number> = {};
    for (const r of rows) { if (order.at(-1) !== r.addr) { expect(order, `household ${r.addr} split in the queue`).not.toContain(r.addr); order.push(r.addr); } best[r.addr] = Math.min(best[r.addr] ?? 9, Number(r.pr.slice(1))); }
    const seq = order.map(a => best[a]);
    console.log('A2 queue', JSON.stringify(rows.map(r => r.pr + ' ' + r.addr)));
    expect(seq).toEqual([...seq].sort((x, y) => x - y));
    const head = p.locator('.qhead b');
    const m = (await head.innerText()).match(/(\d+) of (\d+)/)!;
    const ck = await p.locator('[data-act=saveout]').first().getAttribute('data-v');
    await p.click(`[data-act=setout][data-v="${ck}|Left VM"]`);
    await p.click(`[data-act=saveout][data-v="${ck}"]`);
    await expect(head).toHaveText(`Today: ${Number(m[1]) + 1} of ${m[2]} documented`);
  });
  test('A4 validations: result required, follow-up date and time only when the outcome needs it, nothing in the past; notes saved whole', async ({ browser }) => {
    const p = await page(browser, 'maya');
    const ck = (await p.locator('[data-act=saveout]').first().getAttribute('data-v'))!;
    const save = p.locator(`[data-act=saveout][data-v="${ck}"]`);
    await expect(save).toBeDisabled();
    await p.click(`[data-act=setout][data-v="${ck}|Follow Up"]`);
    await expect(save).toBeDisabled(); // needs the date and the time
    await p.locator('.dcard [data-act=cal]').last().click();
    await expect(p.locator('[data-act=calpick][data-v="2026-11-01"]')).toBeDisabled();
    // today is allowed, but only at a later time (the clock is 8:20 AM)
    await p.locator('[data-act=calpick][data-v="2026-11-02"]').first().click();
    await p.locator(`#fut-${ck}`).fill('08:00');
    await expect(save).toBeDisabled();
    await expect(p.locator('.savebar')).toContainText('The call back must be later than now.');
    await p.locator('.dcard [data-act=cal]').last().click();
    await p.locator('[data-act=calpick][data-v="2026-11-03"]', { hasNotText: 'Tomorrow' }).click();
    await p.locator(`#fut-${ck}`).fill('10:30');
    await expect(save).toBeEnabled();
    await expect(p.locator('.effect')).toContainText('Comes back to you (P1) on Tue, Nov 3 at 10:30 AM');
    const note = 'Long note. '.repeat(200).trim();
    await p.locator(`#note-${ck}`).fill(note);
    await save.click();
    await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
    const call = await withDb(db => db.collection('call_log').find({ ct: ck }).sort({ _id: -1 }).limit(1).next());
    expect(call).toMatchObject({ out: 'Follow Up', rep: 'may', note, key: expect.any(String) });
    const c = await withDb(db => db.collection('contacts').findOne({ _id: ck as never }));
    expect(c).toMatchObject({ out: 'Follow Up', nextAt: '2026-11-03', fuAt: '2026-11-03T10:30', rep: expect.any(String) });
    // A3: it is in My follow-ups, on that date and time (no time zone shift)
    await p.goto('/rep/fu'); await p.waitForLoadState('networkidle');
    await expect(p.locator('.grp', { hasText: 'Tue, Nov 3' })).toContainText('10:30 AM');
  });
  test('A4 the server checks every save: result, follow-up date and time, nothing in the past, same save once', async ({ playwright }) => {
    const r = await withDb(db => db.collection('reservations').findOne({ date: DAY, rep: 'may', done: null }));
    const maya = await api(playwright, 'maya');
    const now = `${DAY}T09:00`;
    const save = (x: object) => maya.post('/api/work', { data: { action: 'save', rep: 'may', ct: r!.ct, now, ...x } });
    const err = async (x: object) => { const res = await save(x); return [res.status(), (await res.json()).error]; };
    expect(await err({ out: '' })).toEqual([400, 'Pick a result']);
    expect(await err({ out: 'Maybe' })).toEqual([400, 'Pick a result from the list']);
    expect(await err({ out: 'Follow Up' })).toEqual([400, 'Pick the date and time of the follow-up']);
    expect(await err({ out: 'Follow Up', fu: '2026-11-03' })).toEqual([400, 'Pick the date and time of the follow-up']);
    expect(await err({ out: 'Follow Up', fu: `${DAY}T08:59` })).toEqual([400, 'The follow-up must be later than now']);
    await withDb(db => db.collection('outcomes').updateOne({ _id: 'Hung Up' as never }, { $set: { active: false } }));
    expect(await err({ out: 'Hung Up' })).toEqual([400, 'Pick a result from the list']);
    await withDb(db => db.collection('outcomes').updateOne({ _id: 'Hung Up' as never }, { $set: { active: true } }));
    const n0 = await withDb(db => db.collection('call_log').countDocuments({ ct: r!.ct }));
    const [a, b] = await Promise.all([save({ out: 'Follow Up', fu: `${DAY}T15:00`, key: 'same-save-1' }), save({ out: 'Follow Up', fu: `${DAY}T15:00`, key: 'same-save-1' })]);
    expect([a.status(), b.status()]).toEqual([200, 200]);
    expect(await withDb(db => db.collection('call_log').countDocuments({ ct: r!.ct }))).toBe(n0 + 1);
    expect(await withDb(db => db.collection('contacts').findOne({ _id: String(r!.ct).split('@')[0] as never }))).toMatchObject({ fuAt: `${DAY}T15:00`, nextAt: DAY });
  });
  test('A4 a double click on Save writes one call, not two', async ({ browser }) => {
    const p = await page(browser, 'maya');
    const ck = (await p.locator('[data-act=saveout]').first().getAttribute('data-v'))!;
    const n0 = await withDb(db => db.collection('call_log').countDocuments({ ct: ck }));
    await p.click(`[data-act=setout][data-v="${ck}|Not Contacted"]`);
    await p.locator(`[data-act=saveout][data-v="${ck}"]`).dblclick();
    await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
    expect(await withDb(db => db.collection('call_log').countDocuments({ ct: ck }))).toBe(n0 + 1);
  });
  test('A5 the detail shows the household, its people and the history with author and date, including the call just saved', async ({ browser }) => {
    const p = await page(browser, 'maya');
    const ck = (await p.locator('[data-act=saveout]').first().getAttribute('data-v'))!;
    await p.click(`[data-act=setout][data-v="${ck}|Hung Up"]`);
    await p.locator(`#note-${ck}`).fill('She hung up after the intro');
    await p.click(`[data-act=saveout][data-v="${ck}"]`);
    await p.click(`[data-act=qsel][data-v="${ck}"]`);
    const hist = p.locator('.dcard', { hasText: 'History at this property' });
    // the clock is frozen in the tests, so every call has the same minute: find the line, not the first one
    const li = hist.locator('li', { hasText: 'She hung up after the intro' });
    await expect(li).toContainText('Hung Up');
    await expect(li).toContainText('by Maya Torres');
    await expect(li.locator('time')).toHaveText(/^\w{3} \d+, \d+:\d{2} (AM|PM)$/);
    await expect(p.locator('.dcard', { hasText: 'The property' })).toContainText('Other contacts at this property');
  });
  for (const w of [375, 768, 1440]) {
    test(`A6 rep views at ${w}px: no horizontal scroll, Save reachable`, async ({ browser }) => {
      for (const path of ['/rep/today', '/rep/fu', '/rep/calls']) {
        const p = await page(browser, 'maya', path, w);
        const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(over, path).toBeLessThanOrEqual(0);
        if (path === '/rep/today') {
          const b = await p.locator('[data-act=saveout]').first().boundingBox();
          expect(b && b.x >= 0 && b.x + b.width <= w).toBe(true);
        }
        await p.close();
      }
    });
  }
});

test.describe('B. Engine on the server', () => {
  test('B7 two morning runs at the same time: one runs, one does nothing, no list is duplicated', async ({ playwright }) => {
    const NEXT = '2026-11-03';
    await withDb(async db => { await db.collection('workdays').deleteMany({ date: NEXT }); await db.collection('reservations').deleteMany({ date: NEXT }); await db.collection('campaigns').insertOne({ _id: 'C-1103-T' as never, date: NEXT, auds: ['pp', 'sm', 'mb', 'ad'], reps: ['may', 'dan', 'pri'], goal: 1, pos: 99 }); });
    const [a, b] = [await api(playwright, 'maya'), await api(playwright, 'daniel')];
    const rs = await Promise.all([a, b].map(x => x.post('/api/allocate', { data: { kind: 'morning', now: `${NEXT}T07:00` } }).then(r => r.json())));
    expect(rs.map(r => r.ran).sort()).toEqual([false, true]);
    const again = await (await a.post('/api/allocate', { data: { kind: 'morning', now: `${NEXT}T07:05` } })).json();
    expect(again.ran).toBe(false);
    const res = await withDb(db => db.collection('reservations').find({ date: NEXT }).toArray());
    expect(res.length).toBeGreaterThan(0);
    expect(new Set(res.map(r => r.ct)).size).toBe(res.length);
    expect(await withDb(db => db.collection('workdays').countDocuments({ date: NEXT }))).toBe(3);
  });
  test('B5 + B8 two reps ask for more at once on shared households: no household split', async ({ playwright }) => {
    await withDb(async db => {
      await db.collection('reservations').deleteMany({ date: DAY, rep: { $in: ['may', 'dan'] } });
      await db.collection('workdays').updateMany({ date: DAY, rep: { $in: ['may', 'dan'] } }, { $set: { st: 'started' } });
      await db.collection('campaigns').updateMany({ date: DAY }, { $set: { auds: ['pp', 'sm', 'mb', 'ad'], reps: ['may', 'dan', 'pri'] } });
    });
    const [a, b] = [await api(playwright, 'maya'), await api(playwright, 'daniel')];
    const rs = await Promise.all([a.post('/api/allocate', { data: { kind: 'more', rep: 'may', now: `${DAY}T10:00` } }), b.post('/api/allocate', { data: { kind: 'more', rep: 'dan', now: `${DAY}T10:00` } })]);
    for (const r of rs) expect((await r.json()).ok).toBe(true);
    const res = await withDb(db => db.collection('reservations').find({ date: DAY }).toArray());
    const cts = await withDb(db => db.collection('contacts').find({}, { projection: { prop: 1 } }).toArray());
    const propOf = (k: string) => k.includes('@') ? k.split('@')[1] : String(cts.find(c => String(c._id) === k)!.prop);
    const byProp: Record<string, Set<string>> = {};
    for (const r of res) (byProp[propOf(String(r.ct))] ||= new Set()).add(String(r.rep));
    expect(Object.entries(byProp).filter(([, s]) => s.size > 1)).toEqual([]);
  });
  test('B5 the property lock is in MongoDB: one lock per property and day, a lock held elsewhere is respected, End workday frees it', async ({ playwright }) => {
    const NEXT = '2026-11-04';
    await withDb(async db => {
      for (const c of ['workdays', 'reservations', 'property_locks']) await db.collection(c).deleteMany({ date: NEXT });
      await db.collection('campaigns').insertOne({ _id: 'C-1104-T' as never, date: NEXT, auds: ['pp', 'sm', 'mb', 'ad'], reps: ['may', 'dan', 'pri'], goal: 1, pos: 98 });
    });
    const maya = await api(playwright, 'maya');
    expect((await (await maya.post('/api/allocate', { data: { kind: 'morning', now: `${NEXT}T07:00` } })).json()).ran).toBe(true);
    const cts = await withDb(db => db.collection('contacts').find({}, { projection: { prop: 1 } }).toArray());
    const propOf = (k: string) => k.includes('@') ? k.split('@')[1] : String(cts.find(c => String(c._id) === k)!.prop);
    const res = await withDb(db => db.collection('reservations').find({ date: NEXT }).toArray());
    const locks = await withDb(db => db.collection('property_locks').find({ date: NEXT }).toArray());
    const want = Object.fromEntries(res.map(r => [`${NEXT}:${propOf(String(r.ct))}`, r.rep]));
    expect(Object.fromEntries(locks.map(l => [String(l._id), l.rep]))).toEqual(want);
    // another server holds a free property for Daniel: Maya's next batch never takes it
    const taken = new Set(res.map(r => propOf(String(r.ct))));
    const props = await withDb(db => db.collection('properties').find({ aud: 'pp', lead: null, inPipe: null }).toArray());
    const free = props.map(p => String(p._id)).filter(p => !taken.has(p));
    await withDb(async db => {
      await db.collection('property_locks').insertMany(free.map(p => ({ _id: `${NEXT}:${p}` as never, date: NEXT, prop: p, rep: 'dan' })));
      await db.collection('workdays').updateOne({ _id: `${NEXT}:may` as never }, { $set: { st: 'started' } });
      await db.collection('reservations').updateMany({ date: NEXT, rep: 'may' }, { $set: { done: 1 } });
    });
    const more = await (await maya.post('/api/allocate', { data: { kind: 'more', rep: 'may', now: `${NEXT}T10:00` } })).json();
    expect(more.ok).toBe(true);
    const mine = await withDb(db => db.collection('reservations').find({ date: NEXT, rep: 'may' }).toArray());
    for (const r of mine) expect(free).not.toContain(propOf(String(r.ct)));
    // End workday frees the locks of what goes back to the pool
    await withDb(db => db.collection('reservations').updateMany({ date: NEXT, rep: 'may' }, { $set: { done: null } }));
    expect((await maya.post('/api/work', { data: { action: 'endday', rep: 'may', now: `${NEXT}T18:00` } })).status()).toBe(200);
    expect(await withDb(db => db.collection('property_locks').countDocuments({ date: NEXT, rep: 'may' }))).toBe(0);
    await withDb(async db => { for (const c of ['workdays', 'reservations', 'property_locks', 'campaigns']) await db.collection(c).deleteMany({ $or: [{ date: NEXT }, { _id: 'C-1104-T' as never }] }); });
  });
  test('B5 the browser never writes reservations', async ({ playwright }) => {
    const admin = await api(playwright, 'admin');
    const res = await admin.post('/api/state', { data: { changes: { reservations: { upsert: [{ _id: `${DAY}:X`, ct: 'X', rep: 'may', date: DAY, order: 0, done: null }] } } } });
    expect(res.status()).toBe(403);
  });
  test('B8 the rep sees a clear message when the pool is empty (no error)', async ({ browser }) => {
    await withDb(async db => { await db.collection('campaigns').updateMany({ date: DAY }, { $set: { auds: [] } }); await db.collection('reservations').deleteMany({ date: DAY, rep: 'may' });
      // her own follow-ups come back even without audiences: move them out of today so the pool is really empty
      await db.collection('contacts').updateMany({ rep: 'may' }, { $set: { nextAt: '2026-12-31' } }); });
    const p = await page(browser, 'maya');
    await p.locator('[data-act=reqmore]').first().click();
    await expect(p.locator('#toast')).toContainText('No more eligible contacts in your campaign today');
  });
  test('[No implementado] B7 the morning run happens at a set hour (California time), without anyone opening the app', async () => {
    test.fail();
    // No scheduler exists: the run happens on the first load of the day. Expect a configured hour in the rules.
    const rules = await withDb(db => db.collection('rules').findOne({ _id: 'default' as never }));
    expect(rules).toHaveProperty('morningAt');
  });
});
