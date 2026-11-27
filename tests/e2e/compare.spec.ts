/* Screenshot of each view's content (.op) in the artifact and in the app, same state, light and dark,
 * with a pixel diff. The top bar and the sidebar changed on purpose (apps moved to a selector in the
 * sidebar), so only the content is compared; Data now has a sidebar too, so it is not compared.
 * The app's sidebar is 20px wider, so its page is captured 20px wider (same content width).
 * Performance, Daily emails, monday sync, How it works and Data were removed from the app (Reports
 * replaces Performance and The day by rep).
 * Views redesigned on purpose after the port are left out: KPI grids (The day by rep, Contact pool,
 * Properties), rules without "To validate" labels, the interactive Performance chart and the tables whose
 * pager (20, 30 or 50 rows per page) changes the height: Contacts and Campaigns. Calling and AI
 * is locked in the app, so its screens are not compared.
 * PNGs land in test-results/compare/<case>-<theme>-{artifact,app,diff}.png */
import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { openApp, openArtifact, settle } from './targets';

type Case = { n: string; art: string; app: string; artClick?: string };
// Sprint 18 (fix/sprint-18), agreed changes: My follow-ups splits Overdue, Today and Upcoming with the
// time and an On hold section; the manager's help no longer promises a fixed 7:00 AM allocation.
const CHANGED = ['mgr-live', 'mgr-pool', 'mgr-rules', 'mgr-perf', 'prp-props', 'prp-cts', 'mgr-camp', 'rep-fu', 'mgr-help'];
const CASES: Case[] = ([
  ...['today', 'fu', 'calls'].map(p => ({ n: 'rep-' + p, art: `vista=rep&pagina=${p}`, app: `/rep/${p}` })),
  ...['live', 'pool', 'leads', 'camp', 'rules'].map(p => ({ n: 'mgr-' + p, art: `vista=mgr&pagina=${p}`, app: `/mgr/${p}` })),
  ...['props', 'cts', 'imp'].map(p => ({ n: 'prp-' + p, art: `vista=prp&pagina=${p}`, app: `/prp/${p}` })),
  { n: 'prp-record', art: 'vista=prp&pagina=props', artClick: '905 Arbolada Way', app: '/prp/props/P-1003' },
] as Case[]).filter(c => !CHANGED.includes(c.n));
const OUT = join(__dirname, '..', '..', 'test-results', 'compare');
mkdirSync(OUT, { recursive: true });
export const results: Record<string, number> = {};

const PHONE = ['rep-today', 'prp-record']; // views that fit the phone screen (longer ones are cut at the viewport)
const RUNS = [
  { name: 'light', theme: 'light' as const, viewport: { width: 1440, height: 900 }, cases: CASES },
  { name: 'dark', theme: 'dark' as const, viewport: { width: 1440, height: 900 }, cases: CASES },
  { name: 'phone', theme: 'light' as const, viewport: { width: 390, height: 844 }, cases: CASES.filter(c => PHONE.includes(c.n)) },
];
for (const { name: theme, theme: colorScheme, viewport, cases } of RUNS) {
  test.describe(theme, () => {
    test.use({ colorScheme, viewport });
    for (const c of cases) {
      test(c.n, async ({ page }) => {
        await openArtifact(page, c.art);
        if (c.artClick) { await page.locator('.row', { hasText: c.artClick }).first().click(); await settle(page); }
        const a = PNG.sync.read(await page.locator('.op').first().screenshot({ animations: 'disabled' }));
        if (viewport.width > 900) await page.setViewportSize({ width: viewport.width + 20, height: viewport.height });
        await openApp(page, c.app);
        const b = PNG.sync.read(await page.locator('.op').first().screenshot({ animations: 'disabled' }));
        expect([b.width, b.height], `${c.n} ${theme}: content size`).toEqual([a.width, a.height]);
        const diff = new PNG({ width: a.width, height: a.height });
        const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
        const ratio = n / (a.width * a.height);
        const base = join(OUT, `${c.n}-${theme}`);
        writeFileSync(base + '-artifact.png', PNG.sync.write(a));
        writeFileSync(base + '-app.png', PNG.sync.write(b));
        writeFileSync(base + '-diff.png', PNG.sync.write(diff));
        writeFileSync(base + '.txt', (ratio * 100).toFixed(3) + '%\n');
        expect(ratio, `${c.n} ${theme}: ${(ratio * 100).toFixed(2)}% of pixels differ`).toBeLessThan(0.02); // content only: a sub-pixel vertical shift of text (different header height) counts more
      });
    }
  });
}
