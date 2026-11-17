import { reseed, resetAdmin } from './db';

/* Fresh e2e database, the default admin and a signed-in browser state for the tests. */
export default async function globalSetup() {
  await reseed();
  await resetAdmin();
}
