'use client';
/* ===== WALKTHROUGH ===== renderTour() in artifact/app.html: the draggable presenter panel. */
import { useRef } from 'react';
import { TOUR, tourText } from '@/lib/domain/tour';
import { TOUR_MAS, on } from '@/lib/state/actions';
import { S, useApp } from '@/lib/state/store';
import { Icon } from '@/components/ui';

export function Tour() {
  useApp();
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const t = S.tour;
  if (!t.on) return <div id="tourw" />;
  const st = TOUR[t.i], tot = TOUR.reduce((a, x) => a + x.min, 0);
  const pos = t.x != null && t.y != null ? { left: Math.max(8, Math.min(t.x, innerWidth - 120)), top: Math.max(8, Math.min(t.y, innerHeight - 60)), right: 'auto', bottom: 'auto' } : undefined;

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const p = panel.current!.getBoundingClientRect();
    drag.current = { dx: e.clientX - p.left, dy: e.clientY - p.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    S.tour.x = e.clientX - drag.current.dx; S.tour.y = e.clientY - drag.current.dy;
    Object.assign(panel.current!.style, { left: S.tour.x + 'px', top: S.tour.y + 'px', right: 'auto', bottom: 'auto' });
  };
  const onUp = () => { drag.current = null; };

  return <div id="tourw">
    <div ref={panel} className={`tourp ${t.col ? 'col' : ''}`} style={pos}>
      <div className="th" data-drag="1" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        <Icon n="compass" s={16} /><div><b>Walkthrough {t.i + 1} of {TOUR.length}</b><br /><small>About {tot} minutes</small></div>
        <span className="r">
          <button {...on('tourlist')} title="All steps" aria-pressed={t.list}><Icon n="list" s={15} /></button>
          <button {...on('tourcol')} title={t.col ? 'Expand' : 'Collapse'}><Icon n={t.col ? 'chu' : 'chd'} s={15} /></button>
          <button {...on('tour')} title="Close"><Icon n="x" s={15} /></button>
        </span>
      </div>
      {t.list
        ? <div className="tb">
          <div className="tlist">{TOUR.map((x, i) => <button key={i} {...on('tourto', i)} className={i === t.i ? 'on' : ''}><span className="muted">{i + 1}</span><span className="flex-1">{x.t}</span><span className="muted">{x.min} min</span></button>)}</div>
          <div className="sb-sec p-[10px_8px_4px]">If there is time</div>
          <div className="tlist">{TOUR_MAS.map(([x], i) => <button key={i} {...on('tourgo', i)}><span className="muted">+</span><span className="flex-1">{x}</span></button>)}</div>
        </div>
        : <div className="tb">
          <h4>{st.t}</h4>
          <div className="why"><b className="sm">Why it matters</b><div className="sm">{st.dolor}</div></div>
          <b className="sm">Show</b><ul>{st.show.map((s, i) => <li key={i}>{tourText(s)}</li>)}</ul>
          <div className="say"><b className="sm">Say</b><div className="sm">{st.say}</div></div>
        </div>}
      <div className="tf">
        <button className="btn sec sm" {...on('tourstep', -1)} disabled={t.i === 0}><Icon n="chl" s={14} />Back</button>
        <div className="dots">{TOUR.map((x, i) => <button key={i} {...on('tourto', i)} className={i === t.i ? 'on' : ''} title={x.t} aria-label={`Step ${i + 1}`} />)}</div>
        {t.i < TOUR.length - 1 ? <button className="btn pri sm" {...on('tourstep', 1)}>Next<Icon n="chr" s={14} /></button> : <button className="btn pri sm" {...on('tour')}>Finish</button>}
      </div>
    </div>
  </div>;
}
