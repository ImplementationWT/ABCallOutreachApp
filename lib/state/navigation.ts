'use client';
/* ===== NAVIGATION ===== (artifact/app.html)
 * The artifact kept the current app, page and record in S. Here the URL mirrors them:
 *   /                 the user's home (HomeRedirect); the artifact's user picker is gone with the real login
 *   /rep|mgr|prp|p2/[page]           (S.view + S.page[app])
 *   /prp/props/[id]   property record (S.det.prp)
 * Actions keep changing S, as in the artifact; <RouteSync> pushes the matching URL afterwards, and
 * each route applies its params to S when it is first rendered (direct load, back and forward).
 */
import { APP_PAGES } from './pages';
import { S, type AppKey, type ViewKey } from './store';

export { APP_PAGES };
export const isApp = (v: string): v is AppKey => v in APP_PAGES;

export function go(app: ViewKey, page?: string, det?: string | null, tab?: string) {
  S.view = app;
  if (isApp(app)) {
    if (page) S.page[app] = page;
    S.det[app] = det || null;
    if (tab) S.tab[app] = tab;
  }
  S.top = true;
}
export const openProp = (k: string, tab?: string) => go('prp', 'props', k, tab || 'cts');

export function urlOf(): string {
  const v = S.view;
  if (v === 'in') return '/';
  if (v === 'prp' && S.det.prp) return `/prp/props/${S.det.prp}`;
  return `/${v}/${S.page[v]}`;
}

export type Route = { view: ViewKey; page?: string; det?: string | null };
let applied = '';
/** Applies a route to S once per distinct route, so a page re-rendering after an action that
 * navigated away does not pull S back. Returns true when S changed. */
export function applyRoute(r: Route): boolean {
  const key = `${r.view}|${r.page || ''}|${r.det || ''}`;
  if (key === applied) return false;
  applied = key;
  const before = urlOf();
  S.view = r.view;
  if (isApp(r.view)) {
    if (r.page) S.page[r.view] = r.page;
    S.det[r.view] = r.det || null;
  }
  return urlOf() !== before;
}
/** Keeps applyRoute in step after an action navigates (the URL push lands on that route). */
export function markApplied() {
  const v = S.view;
  applied = `${v}|${isApp(v) ? S.page[v] : ''}|${isApp(v) ? S.det[v] || '' : ''}`;
}

/** Old artifact links: #vista=mgr&pagina=rules */
export function hashRoute(hash: string): string | null {
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const v = h.get('vista');
  if (!v) return null;
  if (!isApp(v)) return null;
  const pg = h.get('pagina');
  return `/${v}/${pg || S.page[v]}`;
}

/** Inverse of urlOf(): the route a pathname stands for (null when it is not an app route). */
export function routeOf(pathname: string): Route | null {
  const seg = pathname.split('/').filter(Boolean);
  if (!seg.length) return null;
  if (!isApp(seg[0])) return null;
  if (seg[0] === 'prp' && seg[1] === 'props' && seg[2]) return { view: 'prp', page: 'props', det: decodeURIComponent(seg[2]) };
  if (seg.length === 2) return { view: seg[0], page: seg[1] };
  return null;
}
