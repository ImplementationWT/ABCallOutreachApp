'use client';
/* The app selector at the top of the sidebar (in the artifact the apps were tabs in the top bar).
 * Shows the current app; it opens a list with the apps the user may open, each with its count. */
import { useEffect, useRef, useState } from 'react';
import { DAY, LEADS, openOf } from '@/lib/domain';
import { VIEW_PERM, isLocked } from '@/lib/auth/roles';
import { dispatch } from '@/lib/state/actions';
import { useMe } from '@/lib/state/auth';
import { APPS, APP_FASE, S, type AppKey, type ViewKey } from '@/lib/state/store';
import { Icon } from '@/components/ui';

type Item = { k: ViewKey; n: string; icon: string; tone: string; phase2?: boolean };
const ITEMS: Item[] = [...APPS.map(([k, n, icon, tone]) => ({ k, n, icon, tone, phase2: APP_FASE[k] === 'luego' }))];

/** The counts the artifact showed on each app tab. */
function count(k: ViewKey) {
  const u = S.user;
  if (k === 'rep') return DAY[u].st === 'started' ? openOf(u).length : DAY[u].st === 'reserved' ? 1 : 0;
  if (k === 'mgr') return LEADS.filter(l => l.fresh).length;
  return 0;
}

const Tile = ({ it, on }: { it: Item; on?: boolean }) =>
  <span className={`${it.tone} w-[32px] h-[32px] rounded-[10px] grid place-items-center flex-none ${on ? 'bg-[var(--t600)] text-n0' : 'bg-[var(--t50)] text-[var(--t600)]'}`}><Icon n={it.icon} s={16} /></span>;

export function AppSwitcher({ current }: { current: AppKey }) {
  const me = useMe(s => s.me);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const open = !!pos;
  const setOpen = (o: boolean) => { if (!o) { setPos(null); return; } const r = btn.current!.getBoundingClientRect(); setPos({ left: r.left, top: r.bottom + 6, width: Math.max(r.width, 260) }); };
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const items = ITEMS.filter(it => !me || me.perms.includes(VIEW_PERM[it.k]));
  const cur = ITEMS.find(it => it.k === current)!;

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    const shut = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    addEventListener('resize', shut);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); removeEventListener('resize', shut); };
  }, [open]);

  return <>
    <button ref={btn} type="button" id="appsel" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
      className="flex items-center gap-[10px] w-full min-h-[50px] p-[7px_10px_7px_7px] mb-[6px] rounded-[14px] border-[1.5px] border-line bg-surface text-left hover:border-g400 max-[900px]:w-auto max-[900px]:flex-none max-[900px]:mb-0">
      <Tile it={cur} on />
      <span className="flex-1 min-w-0"><small className="block text-[11px] font-bold text-faint uppercase tracking-[.04em]">App</small><b className="block text-[14px] whitespace-nowrap overflow-hidden text-ellipsis">{cur.n}</b></span>
      <Icon n={open ? 'chu' : 'chd'} s={16} />
    </button>
    {pos ? <div ref={menu} className="pop" role="menu" aria-label="Apps" style={pos}>
      <div className="ol">{items.map(it => {
        const n = count(it.k);
        if (isLocked(it.k)) return <button key={it.k} type="button" role="menuitem" className="opt opacity-55 cursor-not-allowed" data-app={it.k} aria-disabled="true" title="Locked for now" onClick={() => {}}>
          <Tile it={it} /><span>{it.n}</span><span className="ml-auto inline-flex items-center gap-[4px] text-[11.5px] font-bold text-muted"><Icon n="key" s={13} />Locked</span>
        </button>;
        return <button key={it.k} type="button" role="menuitem" className={`opt ${it.k === current ? 'bg-g50 font-bold' : ''}`} data-app={it.k} aria-current={it.k === current}
          onClick={() => { setOpen(false); dispatch('view', it.k); }}>
          <Tile it={it} on={it.k === current} /><span>{it.n}</span>
          {it.phase2 ? <span className="p2tag ml-auto">Phase 2</span> : n ? <span className="ml-auto min-w-[20px] h-[20px] px-[6px] rounded-[10px] bg-r500 text-white text-[11px] font-bold grid place-items-center">{n}</span> : null}
        </button>;
      })}</div>
    </div> : null}
  </>;
}
