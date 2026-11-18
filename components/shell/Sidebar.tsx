'use client';
/* sbar() in artifact/app.html: the left navigation of each app, with the Help entry and a footer. */
import type React from 'react';
import { on, pageAct } from '@/lib/state/actions';
import { S, type AppKey } from '@/lib/state/store';
import { Icon } from '@/components/ui';
import { AppSwitcher } from './AppSwitcher';

/** [section] or [page, label, icon, count, soft] */
export type SbItem = [string] | [string, string, string, number?, boolean?];

export function Sidebar({ k, items, foot }: { k: AppKey; items: SbItem[]; foot?: React.ReactNode }) {
  return <>
    <AppSwitcher current={k} />
    {items.map((it, i) => {
      if (it.length === 1) return <div key={i} className="sb-sec">{it[0]}</div>;
      const [pg, label, icon, cnt, soft] = it;
      return <button key={i} className="nav" {...on(pageAct(k), pg)} aria-current={S.page[k] === pg}>
        <span className="ni"><Icon n={icon} s={16} /></span>{label}{cnt ? <span className={`cnt ${soft ? 'soft' : ''}`}>{cnt}</span> : null}
      </button>;
    })}
    <div className="sb-sec">Help</div>
    <button className="nav" {...on(pageAct(k), 'help')} aria-current={S.page[k] === 'help'}><span className="ni"><Icon n="book" s={16} /></span>How it works</button>
    {foot ? <div className="sb-foot">{foot}</div> : null}
  </>;
}
