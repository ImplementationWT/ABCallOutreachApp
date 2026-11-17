'use client';
/* The page frame (the artifact's .shell, #layer, #tourw and #toast) plus what render() and the
 * EVENTS section did around the views: URL sync, scroll to top, highlight, title and keyboard. */
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { dispatch } from '@/lib/state/actions';
import { applyRoute, markApplied, routeOf, urlOf } from '@/lib/state/navigation';
import { S, brand, bump, store, useRev } from '@/lib/state/store';
import { Layer } from './Layer';
import { Toast } from './Toast';
import { TopBar } from './TopBar';
import { Tour } from './Tour';

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function Shell({ children }: { children: React.ReactNode }) {
  const rev = useRev(s => s.rev);
  const pathname = usePathname();
  const router = useRouter();
  const main = useRef<HTMLDivElement>(null);
  const lastPath = useRef(pathname);

  // The URL is applied to S before anything renders (direct load, back and forward).
  const r = routeOf(pathname);
  if (r) applyRoute(r);

  // A new pathname (back, forward, a link): re-render the frame with it.
  useEffect(() => { if (lastPath.current !== pathname) { lastPath.current = pathname; bump(); } }, [pathname]);

  // After each action: push the URL S stands for, scroll to top, highlight, title.
  useIso(() => {
    const url = urlOf();
    const pending = url !== pathname;
    if (pending) { markApplied(); router.push(url, { scroll: false }); }
    document.title = `${brand.emp}, call center demo v1`;
    if (S.top && !pending) { if (main.current) main.current.scrollTop = 0; S.top = false; }
    if (S.hl) {
      const el = document.querySelector<HTMLElement>(`[data-hl="${S.hl}"]`);
      if (el) {
        const q = el.closest<HTMLElement>('.qscroll');
        if (q) { q.scrollTop = Math.max(0, el.offsetTop - q.offsetTop - 60); if (main.current) main.current.scrollTop = 0; } else el.scrollIntoView({ block: 'center' });
        el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl');
        S.hl = null;
      } else if (!pending) S.hl = null;
    }
  }, [rev, pathname]);

  // BOOT: stored theme and old #vista=...&pagina=... links.
  useEffect(() => {
    const th = store.get<string | null>('theme', null);
    if (th) document.documentElement.dataset.theme = th;
  }, []);

  // EVENTS: outside clicks close the popover; keyboard; resize.
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (S.pop && !t.closest('.pop') && !t.closest('[data-act]')) { S.pop = null; bump(); }
    };
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === 'Escape') {
        if (S.pop) { S.pop = null; bump(); return; }
        if (S.modal) { S.modal = null; bump(); return; }
      }
      if (t.id === 'popq' && S.pop && S.pop.t === 'pick') {
        const btns = [...document.querySelectorAll<HTMLElement>('#layer .pop .opt')];
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          S.pop.kb = Math.max(0, Math.min(btns.length - 1, (S.pop.kb || 0) + (e.key === 'ArrowDown' ? 1 : -1)));
          btns.forEach((b, i) => b.classList.toggle('kb', i === (S.pop as { kb: number }).kb));
        }
        if (e.key === 'Enter' && btns[S.pop.kb || 0]) { e.preventDefault(); const b = btns[S.pop.kb || 0]; dispatch(b.dataset.act!, b.dataset.v, b, e); }
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && t.matches('[data-act]:not(button):not(input):not(textarea)')) { e.preventDefault(); t.click(); }
    };
    const resize = () => { if (S.pop) { S.pop = null; bump(); } };
    document.addEventListener('click', click);
    document.addEventListener('keydown', key);
    addEventListener('resize', resize);
    return () => { document.removeEventListener('click', click); document.removeEventListener('keydown', key); removeEventListener('resize', resize); };
  }, []);

  return <>
    <div className="shell">
      <TopBar />
      <div className="main" id="main" ref={main}>{children}</div>
    </div>
    <Layer />
    <Tour />
    <Toast />
  </>;
}
