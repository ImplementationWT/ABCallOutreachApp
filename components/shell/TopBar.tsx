'use client';
/* Top bar (renderTop in artifact/app.html): brand with a name you rename by double click, the app
 * switcher with badges (phase 2 app dashed), Data, Walkthrough, light or dark, and the user. */
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { DAY, LEADS, PEO, openOf } from '@/lib/domain';
import { on } from '@/lib/state/actions';
import { routeOf } from '@/lib/state/navigation';
import { APPS, APP_FASE, EMP0, S, brand, bump, store, useApp, type AppKey } from '@/lib/state/store';
import { Avatar, Icon } from '@/components/ui';

const noop = () => () => {};
function whoNow(view: string) {
  if (view === 'rep') return S.user;
  if (view === 'in') return null;
  return 'and' as const;
}
function badges(): Record<AppKey, number> {
  const u = S.user;
  return { rep: DAY[u].st === 'started' ? openOf(u).length : DAY[u].st === 'reserved' ? 1 : 0, mgr: LEADS.filter(l => l.fresh).length, prp: 0, p2: 0 };
}

export function TopBar() {
  useApp();
  const empRef = useRef<HTMLElement>(null);
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  useEffect(() => {
    brand.emp = store.get('emp', EMP0);
    bump();
  }, []);
  const pathname = usePathname();
  // Before hydration ends the view comes from the URL (S is shared while prerendering routes).
  const view = mounted ? S.view : routeOf(pathname)?.view ?? S.view;
  const b = badges();
  const w = whoNow(view), p = w ? PEO[w] : null;
  const de = mounted ? document.documentElement : null;
  const dark = !!de && (de.dataset.theme === 'dark' || (!de.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches));

  const startEdit = () => {
    const el = empRef.current!;
    el.contentEditable = 'true'; el.focus();
    const r = document.createRange(); r.selectNodeContents(el); const s = getSelection()!; s.removeAllRanges(); s.addRange(r);
  };
  const endEdit = () => {
    const el = empRef.current!;
    if (el.contentEditable !== 'true') return;
    el.contentEditable = 'false';
    const v = (el.textContent || '').trim();
    brand.emp = v || EMP0; store.set('emp', brand.emp); el.textContent = brand.emp; bump();
  };

  return (
    <header className="top">
      <div className="brand">
        <div className="mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" /></svg></div>
        <div>
          <b id="emp" key={brand.emp} ref={empRef} title="Double click to rename" onDoubleClick={startEdit} onBlur={endEdit}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            suppressContentEditableWarning>{brand.emp}</b>
          <small>Call Center</small>
        </div>
      </div>
      <nav className="appsw" id="appsw" aria-label="Apps">
        {APPS.map(([k, n, icon, tone]) => {
          const lu = APP_FASE[k] === 'luego';
          return <button key={k} className={`sw-b ${tone} ${lu ? 'luego' : ''}`} {...on('view', k)} aria-current={view === k} title={lu ? 'Phase 2' : 'Phase 1'}>
            <span className="si"><Icon n={icon} s={15} /></span>{n}{lu ? <span className="ph">phase 2</span> : null}{b[k] ? <span className="bd">{b[k]}</span> : null}
          </button>;
        })}
        <button className="sw-b tb" {...on('view', 'db')} aria-current={view === 'db'}><span className="si"><Icon n="db" s={15} /></span>Data</button>
      </nav>
      <div className="tools" id="tools">
        <button className={`tbtn ${S.tour.on ? 'on' : ''}`} {...on('tour')} title="Presenter walkthrough"><Icon n="compass" s={16} />Walkthrough</button>
        <button className="ib" {...on('theme')} title="Light or dark mode"><Icon n={dark ? 'sun' : 'moon'} s={17} /></button>
        {p && w
          ? <div className="me click" {...on('signout')} title="Switch user"><Avatar k={w} /><div><b>{p.n}</b><small>{p.r}</small></div></div>
          : <button className="tbtn" {...on('signout')}><Icon n="user" s={16} />Sign in</button>}
      </div>
    </header>
  );
}
