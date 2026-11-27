/* No console errors (hydration mismatches included) on any route, in light and dark. */
import { expect, test } from '@playwright/test';
import { APP_PAGES } from '../../lib/state/pages';
import { STORAGE } from './db';
import { fixClock } from './targets';

const ROUTES = ['/', '/prp/props', '/prp/props/P-1003', ...Object.entries(APP_PAGES).flatMap(([a, ps]) => ps.map(p => `/${a}/${p}`))];
for (const colorScheme of ['light', 'dark'] as const) {
  test(`console is clean (${colorScheme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme, storageState: STORAGE });
    await ctx.addInitScript(() => localStorage.setItem('abc-demo-emp', '"Acme Rebuild"'));
    const page = await ctx.newPage();
    await fixClock(page);
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${page.url()} ${m.text()}`); });
    page.on('pageerror', e => errors.push(`${page.url()} ${e.message}`));
    for (const r of ROUTES) { await page.goto(r); await page.waitForLoadState('networkidle'); }
    expect(errors).toEqual([]);
    await ctx.close();
  });
}
