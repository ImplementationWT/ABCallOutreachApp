import { defineConfig } from '@playwright/test';
import { E2E_DB, STORAGE } from './tests/e2e/db';

/* Compares the app with artifact/app.html. Run `npm run build` first.
 * The app runs against its own database (calloutreach_e2e), reseeded in global setup and before
 * every walk that writes. MONGODB_URI comes from .env.local. The tests start signed in as admin
 * (global setup writes the session) and the app's clock is fixed on the artifact's demo day. */
try { process.loadEnvFile('.env.local'); } catch { /* CI sets the variables itself */ }
// Same zone for the seed (Node) and the browser, so the fixed demo day matches on both sides
process.env.TZ = 'America/Los_Angeles';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: { storageState: STORAGE, actionTimeout: 10_000, baseURL: 'http://localhost:3217', viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'America/Los_Angeles' },
  projects: [
    { name: 'read', testMatch: ['compare.spec.ts', 'console.spec.ts'], fullyParallel: true },
    { name: 'write', testMatch: ['flow.spec.ts', 'more.spec.ts', 'db.spec.ts', 'auth.spec.ts', 'users.spec.ts'], dependencies: ['read'], workers: 1 },
  ],
  webServer: { command: 'npx next start -p 3217', url: 'http://localhost:3217', reuseExistingServer: false, timeout: 120_000, env: { MONGODB_DB: E2E_DB } },
});
