import { defineConfig } from '@playwright/test';
import { E2E_DB } from './tests/e2e/db';

/* Compares the app with artifact/app.html. Run `npm run build` first.
 * The app runs against its own database (calloutreach_e2e), reseeded in global setup and before
 * every walk that writes. MONGODB_URI comes from .env.local. */
try { process.loadEnvFile('.env.local'); } catch { /* CI sets the variables itself */ }

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: { actionTimeout: 10_000, baseURL: 'http://localhost:3217', viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'America/Los_Angeles' },
  projects: [
    { name: 'read', testMatch: ['compare.spec.ts', 'console.spec.ts'], fullyParallel: true },
    { name: 'write', testMatch: ['flow.spec.ts', 'more.spec.ts', 'db.spec.ts'], dependencies: ['read'], workers: 1 },
  ],
  webServer: { command: 'npx next start -p 3217', url: 'http://localhost:3217', reuseExistingServer: false, timeout: 120_000, env: { MONGODB_DB: E2E_DB } },
});
