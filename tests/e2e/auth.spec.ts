/* Login, protected pages and API, change password, log out, lockout. */
import { expect, test, type Page } from '@playwright/test';
import { resetAdmin } from './db';
import { fixClock } from './targets';

test.use({ storageState: { cookies: [], origins: [] } });
test.afterAll(async () => { await resetAdmin(); });

async function signIn(page: Page, user: string, pw: string) {
  await page.locator('#username').fill(user);
  await page.locator('#password').fill(pw);
  await page.locator('form button', { hasText: 'Sign in' }).click();
}

test('pages and the API need a session; admin / adminmaster123 signs in', async ({ page, request }) => {
  await fixClock(page);
  expect((await request.get('/api/state')).status()).toBe(401);
  await page.goto('/mgr/rules');
  await expect(page).toHaveURL(/\/login\?next=%2Fmgr%2Frules$/);
  await signIn(page, 'admin', 'wrong-password');
  await expect(page.locator('.login [role=alert]')).toHaveText('User or password is not correct');
  await signIn(page, 'admin', 'adminmaster123');
  await expect(page).toHaveURL(/\/mgr\/rules$/);
  await expect(page.locator('.op-h h1')).toHaveText('Assignment rules');
});

test('change the password, log out and sign in with the new one', async ({ page }) => {
  await fixClock(page);
  await page.goto('/login');
  await signIn(page, 'admin', 'adminmaster123');
  await expect(page).toHaveURL(/\/mgr\/live$/);
  await expect(page.locator('.op-h h1')).toHaveText('The day by rep');
  await page.locator('#usermenu').click();
  await page.locator('[role=menu] [data-menu="password"]').click();
  await expect(page.locator('.modal')).toContainText('Signed in as admin');
  const form = page.locator('.modal form');
  await form.locator('#pw-current').fill('nope-nope');
  await form.locator('#pw-next').fill('n3w-password!');
  await form.locator('#pw-confirm').fill('n3w-password!');
  await form.locator('button', { hasText: 'Change password' }).click();
  await expect(form.locator('[role=status]')).toHaveText('The current password is not correct');
  await form.locator('#pw-current').fill('adminmaster123');
  await form.locator('#pw-confirm').fill('something-else');
  await form.locator('button', { hasText: 'Change password' }).click();
  await expect(form.locator('[role=status]')).toHaveText('The new password and its confirmation do not match');
  await form.locator('#pw-confirm').fill('n3w-password!');
  await form.locator('button', { hasText: 'Change password' }).click();
  await expect(form.locator('[role=status]')).toHaveText('Password changed. Other sessions of this user were closed.');
  await page.locator('.modal button', { hasText: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/rep/today');
  await expect(page).toHaveURL(/\/login/);
  await signIn(page, 'admin', 'adminmaster123');
  await expect(page.locator('.login [role=alert]')).toHaveText('User or password is not correct');
  await signIn(page, 'admin', 'n3w-password!');
  await expect(page).toHaveURL(/\/rep\/today$/);
});

test('five wrong passwords lock the user for a while', async ({ page }) => {
  await resetAdmin();
  await page.goto('/login');
  for (let i = 0; i < 5; i++) { await signIn(page, 'admin', 'wrong-' + i); await page.waitForTimeout(150); }
  await expect(page.locator('.login [role=alert]')).toHaveText('Too many attempts. Try again in a few minutes');
  await signIn(page, 'admin', 'adminmaster123');
  await expect(page.locator('.login [role=alert]')).toHaveText('Too many attempts. Try again in a few minutes');
});
