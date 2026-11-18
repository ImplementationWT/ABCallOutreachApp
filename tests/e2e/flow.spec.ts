/* The full demo walk, run on the artifact and on the app with the same clicks.
 * Every toast and key text is collected and both transcripts must match. */
import { expect, test, type Page } from '@playwright/test';
import { TOASTS, btn, idle, openApp, openArtifact, settle, toastText , openAsAndrew, openAsMaya, switchApp, userMenu } from './targets';
import { STORAGE, reseed } from './db';

async function walk(page: Page, who: string) {
  const log: string[] = [];
  const note = async (label: string, v: Promise<string | null> | string | null) => { log.push(`${label}: ${(await v)?.replace(/\s+/g, ' ').trim()}`); console.log(who, log[log.length - 1].slice(0, 140)); };

  // Rep: Maya
  await openAsMaya(page);
  await note('rep header', page.locator('.op-h h1').textContent());
  await btn(page, 'Start Workday').click(); await idle(page);
  await note('start', toastText(page));
  await note('selected', page.locator('.wdet .dh h2').textContent());
  await note('queue head', page.locator('.qhead b').textContent());
  await page.locator('.ob', { hasText: 'Left VM' }).first().click(); await idle(page);
  await note('effects', page.locator('.effect').first().textContent());
  await btn(page, 'Save and next').click(); await idle(page);
  await note('save', toastText(page));
  await note('next selected', page.locator('.wdet .dh h2').textContent());
  await page.locator('.ob', { hasText: 'Interested' }).filter({ hasNotText: 'Not' }).first().click(); await idle(page);
  await btn(page, 'Save and next').click(); await idle(page);
  await note('lead', toastText(page));
  await btn(page, 'Request more', '.op-h').click(); await idle(page);
  await note('request more', toastText(page));
  await btn(page, 'My follow-ups', '.sb').click(); await idle(page);
  await note('follow-ups', page.locator('.op').textContent());
  await btn(page, 'My calls today', '.sb').click(); await idle(page);
  await note('calls today', page.locator('.op').textContent());
  await btn(page, 'My Outbound Dashboard', '.sb').click(); await idle(page);
  await btn(page, 'End workday', '.op-h').click(); await idle(page);
  await note('end day', toastText(page));
  await note('ended', page.locator('.startw').textContent());

  // Manager: Andrew
  await openAsAndrew(page);
  await note('live', page.locator('.op').textContent());
  await page.locator('button[data-act="reassign"]:not([disabled])').first().click(); await idle(page);
  await note('reassign modal', page.locator('.modal').textContent());
  await page.locator('.modal .mf .btn.pri').click(); await idle(page);
  await note('reassign', toastText(page));
  await btn(page, 'Campaigns', '.sb').click(); await idle(page);
  await btn(page, 'New campaign').click(); await idle(page);
  await note('new campaign modal', page.locator('.modal').textContent());
  await btn(page, 'Create campaign').click(); await idle(page);
  await note('campaign', toastText(page));
  await btn(page, 'Assignment rules', '.sb').click(); await idle(page);
  await btn(page, 'Weekly').click(); await idle(page);
  await note('rule', toastText(page));
  await page.locator('#cfg-maxAtt').fill('5');
  await page.locator('#cfg-maxAtt').blur();
  await note('max attempts', toastText(page));
  await btn(page, 'Contact pool', '.sb').click(); await idle(page);
  await note('pool', page.locator('.stats').textContent());
  await btn(page, 'Hand-offs to sales', '.sb').click(); await idle(page);
  await note('leads', page.locator('.rows').textContent());
  await btn(page, 'monday sync', '.sb').click(); await idle(page);
  await note('sync', page.locator('.synclog').textContent());

  // Property record
  await switchApp(page, 'Properties');
  await page.locator('.row', { hasText: '905 Arbolada Way' }).first().click(); await idle(page);
  await settle(page);
  await note('record', page.locator('.op').textContent());
  await btn(page, 'Call history').click(); await idle(page);
  await note('history', page.locator('.op .card').textContent());

  // Walkthrough, start to end
  await userMenu(page, 'tour');
  for (let i = 0; i < 8; i++) {
    await note(`tour ${i + 1}`, page.locator('.tourp').textContent());
    // The last step went to Calling and AI, which is locked in the app
    if (i < 7) await note(`tour ${i + 1} screen`, page.locator('.op h1, .op h2, .login h1').first().textContent());
    if (i < 7) await btn(page, /^Next/, '.tourp').click(); await idle(page);
  }
  await btn(page, 'Finish', '.tourp').click(); await idle(page);
  await note('tour closed', String(await page.locator('.tourp').count()));
  return log;
}

test('artifact and app walk the same', async ({ browser }) => {
  const pa = await browser.newPage({ storageState: STORAGE });
  await pa.addInitScript(TOASTS);
  await openArtifact(pa);
  const a = await walk(pa, 'artifact');
  await reseed();
  const pb = await browser.newPage({ storageState: STORAGE });
  await pb.addInitScript(TOASTS);
  await openApp(pb, '/');
  const b = await walk(pb, 'app');
  // Whitespace is left out: the artifact's template strings put line breaks between tags, JSX does not
  // (the screenshot comparison covers how it looks).
  // Times too: the artifact's clock moved a minute per action, the app's is fixed (real time, frozen by the test).
  const bare = (s?: string) => s?.replace(/\s+/g, '').replace(/\d{1,2}:\d{2}(AM|PM)/g, 'T');
  expect(b.length).toBe(a.length);
  for (let i = 0; i < a.length; i++) expect(bare(b[i]), `step ${i}: ${a[i].slice(0, 40)}`).toBe(bare(a[i]));
});
