import { getDb } from '@/lib/db/mongodb';
import { changePassword, sessionUser } from '@/lib/db/auth-core';
import { sessionToken, unauthorized } from '@/lib/auth/session';

/* POST /api/auth/password { current, next }: changes the signed-in user's password and closes
 * their other sessions. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const db = await getDb();
  const token = await sessionToken();
  const user = await sessionUser(db, token);
  if (!user || !token) return unauthorized();
  const r = await changePassword(db, user, String(body.current || ''), String(body.next || ''), token);
  return r.ok ? Response.json({ ok: true }) : Response.json({ error: r.error }, { status: 400 });
}
