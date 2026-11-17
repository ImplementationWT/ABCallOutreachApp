'use client';
/* The signed-in user in the browser: role, permissions and the rep they are (GET /api/auth/me).
 * The server checks the same permissions on every request; this only shapes what the app offers. */
import { create } from 'zustand';
import { isLockedRep, type Me, type Perm } from '@/lib/auth/roles';
import type { RepKey } from '@/lib/domain';
import { S, bump } from './store';

export const useMe = create<{ me: Me | null }>(() => ({ me: null }));
export const getMe = () => useMe.getState().me;
/** Until /api/auth/me answers, nothing is allowed (the views wait for the data anyway). */
export const can = (p: Perm) => !!getMe()?.perms.includes(p);
export const lockedRep = () => { const me = getMe(); return !!me && isLockedRep(me); };

export async function loadMe() {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload to the login
  if (res.status === 401) { location.href = '/login?next=' + encodeURIComponent(location.pathname); return; }
  if (!res.ok) return;
  const me = (await res.json()) as Me;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the password page is outside the app
  if (me.mustChange) { location.href = '/password?next=' + encodeURIComponent(location.pathname); return; }
  // A rep works as themselves: the rep workspace shows their own list
  if (isLockedRep(me)) S.user = me.person as RepKey;
  useMe.setState({ me });
  bump();
}
