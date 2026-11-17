import { getDb } from '@/lib/db/mongodb';
import { ensureAuth, login } from '@/lib/db/auth-core';
import { setSessionCookie } from '@/lib/auth/session';

/* POST /api/auth/login { username, password }: opens a session (httpOnly cookie).
 * Five wrong passwords in a row lock the user for five minutes. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || '').trim(), password = String(body.password || '');
  if (!username || !password) return Response.json({ error: 'Enter your user and password' }, { status: 400 });
  try {
    const db = await getDb();
    await ensureAuth(db);
    const r = await login(db, username, password);
    if (!r.ok) return Response.json({ error: r.reason === 'locked' ? 'Too many attempts. Try again in a few minutes' : 'User or password is not correct' }, { status: r.reason === 'locked' ? 429 : 401 });
    await setSessionCookie(r.token);
    return Response.json({ ok: true, user: r.user });
  } catch (e) {
    console.error('Login failed', e);
    return Response.json({ error: 'Could not reach the database' }, { status: 503 });
  }
}
