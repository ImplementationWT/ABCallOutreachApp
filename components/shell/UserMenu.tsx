'use client';
/* The user's menu in the top bar (not in the artifact, which had separate buttons): Walkthrough,
 * change password (the Account popup), a light / dark switch and log out. */
import { useEffect, useRef, useState } from 'react';
import { dispatch } from '@/lib/state/actions';
import { S } from '@/lib/state/store';
import { Icon } from '@/components/ui';

export function UserMenu({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ right: number; top: number } | null>(null);
  const toggle = () => {
    if (pos) { setPos(null); return; }
    const r = btn.current!.getBoundingClientRect();
    setPos({ right: Math.max(8, innerWidth - r.right), top: r.bottom + 6 });
  };
  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => { if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setPos(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPos(null); btn.current?.focus(); } };
    const shut = () => setPos(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    addEventListener('resize', shut);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); removeEventListener('resize', shut); };
  }, [pos]);
  const run = (act: string) => { setPos(null); dispatch(act); };
  const logout = async () => {
    setPos(null);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload: no session, no state
    location.href = '/login';
  };

  return <>
    <button ref={btn} type="button" id="usermenu" className="me click text-left" aria-haspopup="menu" aria-expanded={!!pos} title="Your account" onClick={toggle}>
      {children}
      <span className="text-muted"><Icon n={pos ? 'chu' : 'chd'} s={16} /></span>
    </button>
    {pos ? <div ref={menu} className="pop w-[270px]" role="menu" aria-label="Your account" style={{ right: pos.right, top: pos.top, left: 'auto' }}>
      <div className="ol">
        <button type="button" role="menuitem" className="opt" data-menu="tour" onClick={() => run('tour')}>
          <Icon n="compass" s={17} /><span>Walkthrough</span>{S.tour.on ? <small>On</small> : null}
        </button>
        <button type="button" role="menuitem" className="opt" data-menu="password" onClick={() => run('account')}>
          <Icon n="key" s={17} /><span>Change password</span>
        </button>
        <button type="button" role="menuitemcheckbox" aria-checked={dark} className="opt" data-menu="theme" onClick={() => dispatch('theme')}>
          <Icon n={dark ? 'moon' : 'sun'} s={17} /><span>Dark mode</span>
          <span aria-hidden="true" className={`ml-auto relative w-[38px] h-[22px] rounded-full transition-colors flex-none ${dark ? 'bg-g500' : 'bg-n200'}`}>
            <span className={`absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow-sh-1 transition-[left] ${dark ? 'left-[19px]' : 'left-[3px]'}`} />
          </span>
        </button>
        <div className="border-t border-line my-[6px] mx-[4px]" role="separator" />
        <button type="button" role="menuitem" className="opt text-r500" data-menu="logout" onClick={logout}>
          <Icon n="logout" s={17} /><span>Log out</span>
        </button>
      </div>
    </div> : null}
  </>;
}
