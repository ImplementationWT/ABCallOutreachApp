import { defineConfig } from '@playwright/test';

/* Compares the app with artifact/app.html. Run `npm run build` first. */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { actionTimeout: 10_000, baseURL: 'http://localhost:3217', viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'America/Los_Angeles' },
  webServer: { command: 'npx next start -p 3217', url: 'http://localhost:3217', reuseExistingServer: false, timeout: 120_000 },
});
