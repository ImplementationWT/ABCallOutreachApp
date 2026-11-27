/* Users, roles and permissions: the team users, a rep's limits, Andrew's Users section. */
import { expect, test, type Browser, type Page } from '@playwright/test';
import { ensureTeamUsers } from '../../lib/db/auth-core';
import { resetAdmin, resetUsers, reseed, withDb } from './db';
import { fixClock } from './targets';

test.beforeAll(async () => { await reseed(); await resetUsers(); });
test.afterAll(async () => { await resetUsers(); await resetAdmin(); });

async function signIn(browser: Browser, user: string, pw: string, newPw?: string): Promise<Page> {
  const page = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await fixClock(page);
  await page.goto('/login');
  await page.locator('#username').fill(user);
  await page.locator('#password').fill(pw);
  await page.locator('form button', { hasText: 'Sign in' }).click();
  if (newPw) {
    await expect(page).toHaveURL(/\/password/);
    await page.locator('#pw-current').fill(pw);
    await page.locator('#pw-next').fill(newPw);
    await page.locator('#pw-confirm').fill(newPw);
    await page.locator('form button', { hasText: 'Save and continue' }).click();
  }
  await page.waitForLoadState('networkidle');
  return page;
}

test('team users: Andrew manages, Maya works her own list only', async ({ browser }) => {
  const created = await withDb(db => ensureTeamUsers(db));
  expect(created.map(u => `${u.username}:${u.role}`)).toEqual(['andrew:manager', 'maya:rep', 'daniel:rep', 'priya:rep']);
  const pw = Object.fromEntries(created.map(u => [u.username, u.password]));

  // Maya: first sign-in asks for her own password, then lands in her own list
  const maya = await signIn(browser, 'maya', pw.maya, 'maya-own-pass1');
  await expect(maya).toHaveURL(/\/rep\/today$/);
  await expect(maya.locator('.me b')).toHaveText('Maya Torres');
  await maya.locator('#appsel').click();
  await expect(maya.locator('[role=menu] [role=menuitem]')).toHaveText([/^Rep Workspace/, /^Properties/, /^Calling and AI/]);
  await maya.keyboard.press('Escape');
  await maya.goto('/mgr/live'); await maya.waitForLoadState('networkidle');
  await expect(maya).toHaveURL(/\/rep\/today$/);
  await maya.goto('/'); await maya.waitForLoadState('networkidle');
  await expect(maya).toHaveURL(/\/rep\/today$/);
  expect((await maya.request.get('/api/users')).status()).toBe(403);
  expect((await maya.request.post('/api/state', { data: { changes: { rules: { upsert: [] } } } })).status()).toBe(403);
  await maya.locator('#usermenu').click();
  await expect(maya.locator('[role=menu] [role^=menuitem]')).toHaveText(['Walkthrough', 'Change password', 'Dark mode', 'Log out']);
  await maya.locator('[role=menu] [data-menu="password"]').click();
  await expect(maya.locator('.modal')).toContainText('Signed in as maya');

  // Andrew: lands on The day by rep, has Users in Outreach Manager
  const andrew = await signIn(browser, 'andrew', pw.andrew, 'andrew-own-pass1');
  await expect(andrew).toHaveURL(/\/mgr\/live$/);
  await expect(andrew.locator('.me b')).toHaveText('Andrew Vaitkevicius');
  await andrew.goto('/mgr/users'); await andrew.waitForLoadState('networkidle');
  await expect(andrew.locator('.sb')).toContainText('Users');
  await expect(andrew.locator('tr[data-user]')).toHaveCount(5);
  await expect(andrew.locator('tr[data-user="maya"]')).toContainText('Active');
  await expect(andrew.locator('tr[data-user="daniel"]')).toContainText('Must set a password');

  // He cannot take Users away from himself
  await andrew.locator('tr[data-user="andrew"] button', { hasText: 'Edit' }).click();
  await andrew.locator('.modal [data-perm="users.manage"]').click();
  await andrew.locator('.modal button', { hasText: 'Save' }).click();
  await expect(andrew.locator('.modal [role=alert]')).toHaveText('You cannot take away your own access to Users or deactivate yourself');
  await andrew.locator('.modal .x').click();

  // New viewer user
  await andrew.locator('button', { hasText: 'New user' }).click();
  await andrew.locator('#u-name').fill('Harut Arzumanyan');
  await andrew.locator('#u-username').fill('harut');
  await andrew.locator('.modal .seg', { hasText: 'Viewer' }).click();
  await andrew.locator('.modal button', { hasText: 'Create user' }).click();
  const harutPw = (await andrew.locator('[data-temp-password]').textContent())!;
  expect(harutPw).toMatch(/^[A-Za-z0-9]{12}$/);
  await andrew.locator('.modal button', { hasText: 'Done' }).click();
  await expect(andrew.locator('tr[data-user="harut"]')).toContainText('Viewer');
  const harut = await signIn(browser, 'harut', harutPw, 'harut-own-pass1');
  await harut.locator('#appsel').click();
  await expect(harut.locator('[role=menu] [role=menuitem]')).toHaveText([/^Outreach Manager/, /^Properties/, /^Calling and AI/, /^Data/]);
  await harut.keyboard.press('Escape');
  await harut.goto('/mgr/rules'); await harut.waitForLoadState('networkidle');
  await expect(harut.locator('#cfg-maxAtt')).toHaveAttribute('readonly', '');
  await harut.goto('/mgr/camp'); await harut.waitForLoadState('networkidle');
  await harut.locator('button', { hasText: 'New campaign' }).click();
  await expect(harut.locator('#toast')).toContainText('You do not have permission for this');

  // Reset Maya's password: her session closes, the old password stops working
  andrew.on('dialog', d => d.accept());
  await andrew.locator('tr[data-user="maya"] button', { hasText: 'Reset password' }).click();
  const mayaTemp = (await andrew.locator('[data-temp-password]').textContent())!;
  await andrew.locator('.modal button', { hasText: 'Done' }).click();
  await expect(andrew.locator('tr[data-user="maya"]')).toContainText('Must set a password');
  expect((await maya.request.get('/api/state')).status()).toBe(401);
  const mayaAgain = await signIn(browser, 'maya', mayaTemp, 'maya-own-pass2');
  await expect(mayaAgain).toHaveURL(/\/rep\/today$/);

  // Deactivate Harut
  await andrew.locator('tr[data-user="harut"] button', { hasText: 'Edit' }).click();
  await andrew.locator('.modal .seg', { hasText: 'Deactivated' }).click();
  await andrew.locator('.modal button', { hasText: 'Save' }).click();
  await expect(andrew.locator('tr[data-user="harut"]')).toContainText('Deactivated');
  expect((await harut.request.get('/api/state')).status()).toBe(401);
  const again = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await again.goto('/login');
  await again.locator('#username').fill('harut');
  await again.locator('#password').fill('harut-own-pass1');
  await again.locator('form button', { hasText: 'Sign in' }).click();
  await expect(again.locator('.login [role=alert]')).toHaveText('This user is deactivated. Ask your manager');
});
