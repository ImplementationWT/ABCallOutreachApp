import type { Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

export const ARTIFACT = pathToFileURL(join(__dirname, '..', '..', 'artifact', 'app.html')).href;

/** Opens the artifact at a #vista=...&pagina=... state (the artifact's own BOOT reads it). */
export async function openArtifact(page: Page, hash = '') {
  await page.goto(ARTIFACT + (hash ? '#' + hash : ''));
  await settle(page);
}
export async function openApp(page: Page, path: string) {
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
export const btn = (page: Page, text: string | RegExp, scope = 'body') => page.locator(scope).locator('button', { hasText: text }).first();

