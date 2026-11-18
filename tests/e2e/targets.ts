import type { Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

export const ARTIFACT = pathToFileURL(join(__dirname, '..', '..', 'artifact', 'app.html')).href;

/** Opens the artifact at a #vista=...&pagina=... state (the artifact's own BOOT reads it). */
export async function openArtifact(page: Page, hash = '') {
  await page.goto(ARTIFACT + (hash ? '#' + hash : ''));
  await settle(page);
}
/** The artifact's demo day, so the app (which uses the real date) shows the same screens. */
export const fixClock = (page: Page) => page.clock.setFixedTime(new Date(2026, 10, 2, 8, 20));
export async function openApp(page: Page, path: string) {
  await fixClock(page);
  await page.goto(path);
  await settle(page);
}
export async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

/** Every toast shown, in order (both write the toast's content anew on each call). */
export const TOASTS = `window.__toasts = []; new MutationObserver(ms => { for (const m of ms) { const t = (m.target).closest && (m.target).closest('#toast'); if (t && m.type === 'childList' && t.textContent) { window.__toasts.push(t.textContent.trim()); return; } } }).observe(document, { subtree: true, childList: true });`;
const seen = new WeakMap<Page, number>();
export async function toastText(page: Page) {
  const i = seen.get(page) || 0;
  await page.waitForFunction(n => (window as unknown as { __toasts: string[] }).__toasts.length > n, i, { timeout: 5000 });
  seen.set(page, i + 1);
  return page.evaluate(n => (window as unknown as { __toasts: string[] }).__toasts[n], i);
}
/** Lets a route change land (the app navigates after the click; the artifact re-renders in place). */
export const idle = (page: Page) => page.waitForTimeout(150);
/** First button with that text (the sidebar's app selector #appsel is skipped: it shows the current app's name). */
export const btn = (page: Page, text: string | RegExp, scope = 'body') => page.locator(scope).locator('button:not(#appsel)', { hasText: text }).first();


const isArtifact = (page: Page) => page.url().startsWith('file:');
/** Maya's list: the artifact picks her in its user picker; the app (signed in as admin) uses
 * "Open as Maya" in The day by rep, which does the same (S.user = may, Rep Workspace). */
export async function openAsMaya(page: Page) {
  if (isArtifact(page)) { await btn(page, 'Maya Torres').click(); await idle(page); return; }
  await switchApp(page, 'Outreach Manager');
  await btn(page, 'The day by rep', '.sb').click(); await idle(page);
  await btn(page, 'Open as Maya').click(); await idle(page);
}
/** Andrew's view: the artifact goes back to its picker and picks him; the app opens Outreach Manager. */
export async function openAsAndrew(page: Page) {
  if (isArtifact(page)) { await page.locator('.me.click').click(); await idle(page); await btn(page, 'Andrew Vaitkevicius').click(); await idle(page); return; }
  await switchApp(page, 'Outreach Manager');
  await btn(page, 'The day by rep', '.sb').click(); await idle(page);
}

/** Opens an app: the artifact's tabs in the top bar, the app's selector at the top of the sidebar. */
export async function switchApp(page: Page, name: string) {
  if (isArtifact(page)) { await btn(page, name, '#appsw').click(); await idle(page); return; }
  await page.locator('#appsel').click();
  await page.locator('[role=menu] [role=menuitem]', { hasText: name }).click(); await idle(page);
}
