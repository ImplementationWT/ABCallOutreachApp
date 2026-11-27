'use client';
/* Top bar (renderTop in artifact/app.html): brand with a name you rename by double click, the app
 * user menu (Walkthrough, change password, dark mode). The app tabs moved to the sidebar (AppSwitcher). */
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { PEO, type PersonKey } from '@/lib/domain';
import { routeOf } from '@/lib/state/navigation';
import { getMe, useMe } from '@/lib/state/auth';
import { EMP0, S, brand, bump, store, useApp } from '@/lib/state/store';
import { Avatar } from '@/components/ui';
import { UserMenu } from './UserMenu';
import { ROLES } from '@/lib/auth/roles';

const noop = () => () => {};
/** The person shown in the avatar: the rep whose list is open, else the signed-in user's person (the
 * artifact showed Andrew outside the Rep Workspace). */
function whoNow(view: string) {
  if (view === 'rep') return S.user;
  const p = getMe()?.person;
  return (p && p in PEO ? p : 'and') as PersonKey;
}

export function TopBar() {
  useApp();
  const empRef = useRef<HTMLElement>(null);
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  useEffect(() => {
    brand.emp = store.get('emp', EMP0);
    bump();
  }, []);
  const pathname = usePathname() ?? '/';
  // Before hydration ends the view comes from the URL (S is shared while prerendering routes).
  const view = mounted ? S.view : routeOf(pathname)?.view ?? S.view;
  // The account only after hydration: the server never knows who is signed in
  const me0 = useMe(s => s.me), me = mounted ? me0 : null;
  // The stored company name only after hydration too: the server always renders the default
  const emp = mounted ? brand.emp : EMP0;
  const w = whoNow(view), p = PEO[w];
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
          <b id="emp" key={emp} ref={empRef} title="Double click to rename" onDoubleClick={startEdit} onBlur={endEdit}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            suppressContentEditableWarning>{emp}</b>
          <small>Call Center</small>
        </div>
      </div>
      <div className="tools" id="tools">
        <UserMenu dark={dark}>
          {/* Before hydration ends nothing here depends on state: the server's S is shared between
              requests, so its rep or person could differ from the browser's */}
          {!mounted ? <span className="av" aria-hidden="true" />
            : me && !me.person && view !== 'rep'
              ? <span className="av" title={me.name}>{me.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()}</span>
              : <Avatar k={w} />}
          {/* Whose account this is: the signed-in user's name, and their role below */}
          {me ? <div className="me-id" data-me><b>{me.name}</b><small>{ROLES[me.role].n}</small></div> : mounted ? <div className="me-id"><b>{p.n}</b><small>{p.r}</small></div> : <div className="me-id" aria-hidden="true" />}
        </UserMenu>
      </div>
    </header>
  );
}
