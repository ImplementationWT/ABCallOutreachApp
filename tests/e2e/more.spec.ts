/* A second walk over the actions the first one does not touch, again on both targets. */
import { expect, test, type Page } from '@playwright/test';
import { TOASTS, btn, idle, openApp, openArtifact, toastText , openAsAndrew, openAsMaya, switchApp, userMenu } from './targets';
import { STORAGE, reseed } from './db';

test.beforeEach(async () => { await reseed(); });

async function walk(page: Page) {
  const log: string[] = [];
  const note = async (label: string, v: Promise<string | null> | string | null) => { log.push(`${label}: ${(await v)?.replace(/\s+/g, '').replace(/\d{1,2}:\d{2}(AM|PM)/g, 'T')}`); };
  const text = (sel: string) => page.locator(sel).first().textContent();

  // Rep: dial, follow up with the calendar, script
  await openAsMaya(page);
  await btn(page, 'Start Workday').click(); await idle(page);
  await note('start', toastText(page));
  await page.locator('.ph-r button', { hasText: 'Call' }).first().click(); await idle(page);
  await note('on call', text('.oncall'));
  await page.locator('.ob', { hasText: 'Follow Up' }).first().click(); await idle(page);
  await note('save disabled', String(await btn(page, 'Save and next').isDisabled()));
  await page.locator('.dcard .pk-b').first().click(); await idle(page);
  await note('calendar', text('.pop.cal .ch'));
  await page.locator('.pop.cal button[data-act="calnav"]').last().click(); await idle(page);
  await note('calendar next', text('.pop.cal .ch'));
  await btn(page, 'Next week', '.pop').click(); await idle(page);
  await note('effects', text('.effect'));
  await page.locator('textarea.fld').first().fill('Call after lunch');
  await btn(page, 'Save and next').click(); await idle(page);
  await note('save', toastText(page));
  await btn(page, 'Show', '.wdet').click(); await idle(page);
  await note('script', text('.script'));
  await page.locator('.qi').nth(3).click(); await idle(page);
  await note('picked', text('.wdet .dh'));

  // Follow-ups -> property record and its tabs
  await btn(page, 'My follow-ups', '.sb').click(); await idle(page);
  await page.locator('.row').first().click(); await idle(page);
  await note('record', text('.rh'));
  await btn(page, 'monday', '.jtabs').click(); await idle(page);
  await note('monday tab', text('.op .card'));
  await btn(page, 'Property data', '.jtabs').click(); await idle(page);
  await note('data tab', text('.op .grid4'));
  await btn(page, 'Mark construction started').click(); await idle(page);
  await note('started', toastText(page));

  // Contacts search and highlight, status filter, reopen
  await btn(page, 'Contacts', '.sb').click(); await idle(page);
  await page.locator('#srcts').fill('Brandt'); await idle(page);
  await note('contacts found', text('.toolbar'));
  await page.locator('.row:not(.head)').first().click(); await idle(page);
  await note('contact record', text('.rh h1'));
  await btn(page, 'Properties', '.sb').click(); await idle(page);
  await page.locator('.stat', { hasText: 'Not Interested' }).click(); await idle(page);
  await note('filtered', text('.toolbar'));
  await page.locator('.row:not(.head)').first().click(); await idle(page);
  await note('no banner', text('.nextstep'));
  await btn(page, 'Reopen for outreach').click(); await idle(page);
  await note('reopen', toastText(page));

  // Data modes
  await switchApp(page, 'Data');
  for (const m of ['Tables', 'Access by app', 'Where it runs']) { await btn(page, m, '.toolbar').click(); await idle(page); await note(m, text('.dbw')); }
  await btn(page, 'Process A to Z', '.toolbar').click(); await idle(page);
  await page.locator('.azr').first().click(); await idle(page);
  await note('az go', text('.op h1'));

  // Manager: list modal, open as, pool search
  await openAsAndrew(page);
  await btn(page, 'See list').click(); await idle(page);
  await note('list modal', text('.modal'));
  await page.keyboard.press('Escape'); await idle(page);
  await note('modal closed', String(await page.locator('.modal').count()));
  await btn(page, 'Contact pool', '.sb').click(); await idle(page);
  await page.locator('.stat', { hasText: 'All contacts' }).click(); await idle(page);
  await page.locator('#srpool').fill('Marsh'); await idle(page);
  await note('pool search', text('.rows'));
  await btn(page, 'The day by rep', '.sb').click(); await idle(page);
  await btn(page, 'Open as Daniel').click(); await idle(page);
  await note('as daniel', text('.qhead'));
  await note('as daniel detail', text('.wdet .dh'));

  // Walkthrough list and "if there is time", collapse; theme
  await userMenu(page, 'tour');
  await page.locator('.tourp button[data-act="tourlist"]').click(); await idle(page);
  await note('tour list', text('.tourp .tb'));
  await page.locator('.tourp button[data-act="tourgo"]').nth(1).click(); await idle(page);
  await note('tour reassign', text('.modal .mh'));
  await note('tour collapsed', String(await page.locator('.tourp.col').count()));
  await page.keyboard.press('Escape'); await idle(page);
  await page.locator('.tourp button[data-act="tour"]').first().click(); await idle(page);
  await userMenu(page, 'theme');
  await note('theme', page.evaluate(() => document.documentElement.dataset.theme || ''));
  return log;
}

test('artifact and app agree on the remaining actions', async ({ browser }) => {
  const pa = await browser.newPage({ storageState: STORAGE }); await pa.addInitScript(TOASTS);
  await openArtifact(pa);
  const a = await walk(pa);
  const pb = await browser.newPage({ storageState: STORAGE }); await pb.addInitScript(TOASTS);
  await openApp(pb, '/');
  const b = await walk(pb);
  expect(b.length).toBe(a.length);
  for (let i = 0; i < a.length; i++) expect(b[i], `step ${i}`).toBe(a[i]);
});

test('app: old #vista links, back button and the rename', async ({ page }) => {
  await openApp(page, '/#vista=mgr&pagina=rules');
  await expect(page).toHaveURL(/\/mgr\/rules$/);
  await expect(page.locator('.op-h h1')).toHaveText('Assignment rules');
  await page.locator('.sb button', { hasText: 'Performance' }).click();
  await expect(page).toHaveURL(/\/mgr\/perf$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/mgr\/rules$/);
  await expect(page.locator('.op-h h1')).toHaveText('Assignment rules');
  await expect(page.locator('.op-h h1')).toHaveCount(1);
  await page.locator('#emp').dblclick();
  await page.keyboard.type('Acme Rebuild');
  await page.keyboard.press('Enter');
  await expect(page.locator('#emp')).toHaveText('Acme Rebuild');
  await expect(page).toHaveTitle('Acme Rebuild, call center demo v1');
  await page.reload();
  await expect(page.locator('#emp')).toHaveText('Acme Rebuild');
  await openApp(page, '/prp/props/P-1003');
  await expect(page.locator('.rh h1')).toHaveText('905 Arbolada Way');
});

async function drag(page: Page) {
  await userMenu(page, 'tour');
  const box = async () => { const b = (await page.locator('.tourp').boundingBox())!; return [Math.round(b.x), Math.round(b.y)]; };
  const h = (await page.locator('.tourp .th').boundingBox())!;
  const before = await box();
  await page.mouse.move(h.x + 60, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x - 340, h.y - 300, { steps: 8 });
  await page.mouse.up();
  const after = await box();
  await page.locator('.tourp button', { hasText: /^Next/ }).click(); await idle(page);
  return [before, after, await box()];
}
test('the walkthrough panel drags the same', async ({ browser }) => {
  const pa = await browser.newPage({ storageState: STORAGE }); await openArtifact(pa);
  const pb = await browser.newPage({ storageState: STORAGE }); await openApp(pb, '/');
  const a = await drag(pa), b = await drag(pb);
  expect(b).toEqual(a);
  expect(b[1][0]).toBeLessThan(b[0][0]);
});

test('app: the Performance chart reacts to hover and there are no "To validate" labels', async ({ page }) => {
  await openApp(page, '/mgr/perf');
  const day = page.locator('[data-day]').nth(3);
  await day.hover();
  await expect(page.locator('[data-chart-tip]')).toContainText('Calls');
  await expect(page.locator('[data-chart-tip]')).toContainText('Dial to connect');
  await expect(page.locator('[data-day]').nth(0)).toHaveClass(/opacity-35/);
  await page.mouse.move(0, 0);
  await expect(page.locator('[data-chart-tip]')).toHaveCount(0);
  await page.locator('[data-series="conv"]').hover();
  await expect(page.locator('[data-series="none"]')).toHaveClass(/opacity-50/);
  for (const p of ['/mgr/perf', '/mgr/rules']) { await page.goto(p); await page.waitForLoadState('networkidle'); await expect(page.locator('.op')).not.toContainText('To validate'); }
});

test('app: Performance by day, week, month and year', async ({ page }) => {
  await openApp(page, '/mgr/perf');
  const label = page.locator('[data-period-label]');
  await expect(label).toHaveText('Today, Nov 2');
  await page.locator('.segs .seg', { hasText: 'Week' }).click();
  await expect(label).toHaveText('Nov 2 – Nov 8');
  await expect(page.locator('[aria-label="Next period"]')).toBeDisabled();
  await page.locator('[aria-label="Previous period"]').click();
  await expect(label).toHaveText('Oct 26 – Nov 1');
  await expect(page.locator('.ptbl tr.tot')).toContainText(/Team\s*\d+/);
  await page.locator('.segs .seg', { hasText: 'Year' }).click();
  await expect(label).toHaveText('2026');
  await expect(page.locator('[data-day]')).toHaveCount(12);
  await page.locator('[data-day="2026-10-01"]').click();
  await expect(page.locator('.segs .seg[aria-pressed=true]')).toHaveText('Month');
  await expect(label).toHaveText('October 2026');
  await page.locator('[aria-label="Back to this month"]').click();
  await expect(label).toHaveText('November 2026');
});

test('app: Calling and AI is locked for everyone', async ({ page }) => {
  await openApp(page, '/p2/call');
  await expect(page).toHaveURL(/\/mgr\/live$/);
  await page.locator('#appsel').click();
  await expect(page.locator('[data-app="p2"]')).toHaveAttribute('aria-disabled', 'true');
  await page.locator('[data-app="p2"]').click({ force: true });
  await expect(page).toHaveURL(/\/mgr\/live$/);
});
