/* Screenshot of each view's content (.op) in the artifact and in the app, same state, light and dark,
 * with a pixel diff. The top bar and the sidebar changed on purpose (apps moved to a selector in the
 * sidebar), so only the content is compared; Data now has a sidebar too, so it is not compared.
 * PNGs land in test-results/compare/<case>-<theme>-{artifact,app,diff}.png */
import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { openApp, openArtifact, settle } from './targets';

type Case = { n: string; art: string; app: string; artClick?: string };
const CASES: Case[] = [
  ...['today', 'fu', 'calls', 'help'].map(p => ({ n: 'rep-' + p, art: `vista=rep&pagina=${p}`, app: `/rep/${p}` })),
  ...['live', 'pool', 'leads', 'camp', 'rules', 'perf', 'mail', 'sync', 'help'].map(p => ({ n: 'mgr-' + p, art: `vista=mgr&pagina=${p}`, app: `/mgr/${p}` })),
  ...['props', 'cts', 'imp', 'help'].map(p => ({ n: 'prp-' + p, art: `vista=prp&pagina=${p}`, app: `/prp/${p}` })),
  { n: 'prp-record', art: 'vista=prp&pagina=props', artClick: '905 Arbolada Way', app: '/prp/props/P-1003' },
  ...['call', 'enrich', 'aud', 'prov', 'help'].map(p => ({ n: 'p2-' + p, art: `vista=p2&pagina=${p}`, app: `/p2/${p}` })),
];
const OUT = join(__dirname, '..', '..', 'test-results', 'compare');
mkdirSync(OUT, { recursive: true });
export const results: Record<string, number> = {};

const PHONE = ['rep-today', 'mgr-live', 'mgr-rules', 'prp-props', 'prp-record'];
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
