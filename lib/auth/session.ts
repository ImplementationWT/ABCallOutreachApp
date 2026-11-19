import 'server-only';
/* The session cookie and permission checks, for route handlers. */
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db/mongodb';
import { SESSION_DAYS, sessionUserDoc, type UserDoc } from '@/lib/db/auth-core';
import type { Perm } from '@/lib/auth/roles';

export const SESSION_COOKIE = 'ab_session';

export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
/** The signed-in, active user (document), or null. */
export async function currentUserDoc(): Promise<UserDoc | null> {
  return sessionUserDoc(await getDb(), await sessionToken());
}
export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1', path: '/', maxAge: SESSION_DAYS * 86400 });
}
export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
export const unauthorized = () => Response.json({ error: 'Sign in first' }, { status: 401 });
export const forbidden = () => Response.json({ error: 'You do not have permission for this' }, { status: 403 });

/** The signed-in user if they have `perm`; otherwise the 401/403 response to return. */
export async function requirePerm(perm: Perm): Promise<{ user: UserDoc } | { res: Response }> {
  const user = await currentUserDoc();
  if (!user) return { res: unauthorized() };
  if (!user.perms.includes(perm)) return { res: forbidden() };
  return { user };
}
