'use client';
/* renderLayer() and popHtml() in artifact/app.html: the modal and the picker or calendar popover. */
import { MON, TODAY, WD, T0, addBiz, addDays, iso, nextBiz } from '@/lib/domain';
import { PK, inp, on } from '@/lib/state/actions';
import { S, useApp } from '@/lib/state/store';
import { Icon } from '@/components/ui';
import { MODALS } from '@/components/mgr/modals';

function Pop() {
  const p = S.pop!;
  const st = { left: Math.min(p.x, innerWidth - 350), top: Math.min(p.y, innerHeight - 370) };
  if (p.t === 'cal') {
    const m = p.m, y = m.getFullYear(), mo = m.getMonth(), firstD = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstD; i++) cells.push(<span key={'e' + i} />);
    for (let d = 1; d <= days; d++) {
      const ds = iso(new Date(y, mo, d));
      cells.push(<button key={ds} {...on('calpick', ds)} className={`${ds === TODAY ? 'td' : ''} ${ds === p.sel ? 'sel' : ''}`} disabled={ds < TODAY} style={ds < TODAY ? { opacity: .35 } : undefined}>{d}</button>);
    }
    return <div className="pop cal" style={st}>
      <div className="ch"><button {...on('calnav', -1)} aria-label="Previous month"><Icon n="chl" s={16} /></button><span>{MON[mo]} {y}</span><button {...on('calnav', 1)} aria-label="Next month"><Icon n="chr" s={16} /></button></div>
      <div className="cg">{WD.map(d => <span key={d}>{d.slice(0, 2)}</span>)}{cells}</div>
      <div className="cf"><button className="btn sec sm" {...on('calpick', iso(nextBiz(T0)))}>Tomorrow</button><button className="btn sec sm" {...on('calpick', iso(addBiz(T0, 3)))}>In 3 days</button><button className="btn sec sm" {...on('calpick', iso(addDays(T0, 7)))}>Next week</button></div>
    </div>;
  }
  const def = PK[p.key];
  if (!def) return null;
  const q = (p.q || '').toLowerCase();
  const list = def.opts.filter(o => !q || (o.l + ' ' + (o.d || '') + ' ' + (o.g || '')).toLowerCase().includes(q));
  let lastG: string | undefined;
  const ol: React.ReactNode[] = [];
  list.forEach((o, i) => {
    if (o.g && o.g !== lastG) { ol.push(<div key={'g' + i} className="og">{o.g}</div>); lastG = o.g; }
    // eslint-disable-next-line jsx-a11y/role-supports-aria-props -- same markup as the artifact
    ol.push(<button key={o.v} className={`opt ${i === (p.kb || 0) ? 'kb' : ''}`} {...on('pickset', o.v)} aria-selected={o.v === p.cur}><span>{o.l}</span>{o.d ? <small>{o.d}</small> : null}</button>);
  });
  return <div className="pop" style={st}>
    <input id="popq" placeholder="Type to search..." defaultValue={p.q || ''} {...inp('popq')} autoComplete="off" autoFocus />
    <div className="ol">{ol.length ? ol : <div className="og">No matches</div>}</div>
  </div>;
}

export function Layer() {
  useApp();
  const m = S.modal ? MODALS[S.modal.k](S.modal) : null;
  return <div id="layer">
    {m ? <div className="scrim" {...on('mscrim')}><div className={`modal ${m.wide ? 'wide' : ''}`} role="dialog" aria-label={m.t}>
      <div className="mh"><div><b>{m.t}</b>{m.s ? <small>{m.s}</small> : null}</div><button className="x" {...on('mclose')} aria-label="Close"><Icon n="x" s={16} /></button></div>
      <div className="mb">{m.body}</div>
      {m.foot ? <div className="mf">{m.foot}</div> : null}
    </div></div> : null}
    {S.pop ? <Pop /> : null}
  </div>;
}
