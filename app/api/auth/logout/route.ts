import { getDb } from '@/lib/db/mongodb';
import { endSession } from '@/lib/db/auth-core';
import { clearSessionCookie, sessionToken } from '@/lib/auth/session';

/* POST /api/auth/logout: closes the session. */
export async function POST() {
  try { await endSession(await getDb(), await sessionToken()); } catch (e) { console.error('Logout failed', e); }
  await clearSessionCookie();
  return Response.json({ ok: true });
}
