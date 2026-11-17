import 'server-only';
/* The session cookie, for route handlers. */
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db/mongodb';
import { SESSION_DAYS, sessionUser } from '@/lib/db/auth-core';

export const SESSION_COOKIE = 'ab_session';

export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
/** The signed-in user, or null. */
export async function currentUser() {
  return sessionUser(await getDb(), await sessionToken());
}
export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1', path: '/', maxAge: SESSION_DAYS * 86400 });
}
export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
export const unauthorized = () => Response.json({ error: 'Sign in first' }, { status: 401 });
