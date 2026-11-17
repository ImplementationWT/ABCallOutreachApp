'use client';
/* ===== HOW IT WORKS ===== helpPage(k) in artifact/app.html */
import { HELP } from '@/lib/domain/help';
import { on, pageAct } from '@/lib/state/actions';
import { APPN, APPS, type AppKey } from '@/lib/state/store';
import { Icon, PageHeader } from '@/components/ui';

export function HelpPage({ k }: { k: AppKey }) {
  const hp = HELP[k];
  return <>
    <PageHeader t={'How it works: ' + APPN[k]} />
    <div className="help-intro"><div className="who">{hp.who}</div><p className="mt-[6px]">{hp.intro}</p></div>
    <h3 className="text-[16px]">The process</h3>
    <div className="flow">{hp.flow.map((f, i) => <div key={i}><i>{i + 1}</i><span>{f}</span></div>)}</div>
    <h3 className="text-[16px] m-[16px_0_8px]">Views</h3>
    {hp.views.map(([pg, n, icon, d, us]) => <div key={pg} className="hv">
      <div className="h"><Icon n={icon} s={17} /><b>{n}</b><button className="btn sec sm" {...on(pageAct(k), pg)}>Open</button></div>
      <p className="sm mt-[4px]">{d}</p>
      <ul>{us.map((u, i) => <li key={i}>{u}</li>)}</ul>
    </div>)}
    <h3 className="text-[16px] m-[16px_0_8px]">Connection with the other apps</h3>
    <div className="rel">{hp.rel.map(([a, t]) => <button key={a} {...on('view', a)}><Icon n={APPS.find(x => x[0] === a)![2]} s={16} /><span><b>{APPN[a as AppKey]}</b><br /><span className="sm muted">{t}</span></span></button>)}</div>
    <div className="note mt-[16px]"><b>Assumptions in this demo.</b> Hung Up and Not Interested are results we added: without Hung Up, connects and conversations would always match; without Not Interested, a &quot;not now&quot; would be a Do Not Contact. The waiting times, max attempts, end of day rule and the tie break inside a priority are proposals to validate with Andrew. Names, addresses and phones are fictional.</div>
  </>;
}
