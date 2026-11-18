'use client';
/* Performance > "Team, last 10 business days": the artifact's stacked bars, interactive.
 * Hovering (or focusing) a day dims the others and shows its breakdown; hovering a legend item
 * highlights that series in every bar. */
import { useState } from 'react';
import { fmtS, fmtWD, mDay, pastDays, pct } from '@/lib/domain';

type Series = 'none' | 'con' | 'conv';
const SERIES: [Series, string, string][] = [['none', 'No answer', 'bg-n200'], ['con', 'Connected, no conversation', 'bg-b500'], ['conv', 'Conversation', 'bg-g500']];

export function TeamChart() {
  const [day, setDay] = useState<string | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const days = pastDays();
  const rows = days.map(d => ({ d, m: mDay(null, d) }));
  const mx = Math.max(1, ...rows.map(r => r.m.calls));
  const h = (n: number) => Math.round(n * 110 / mx);
  const segOpacity = (s: Series) => (series && series !== s ? 'opacity-25' : 'opacity-100');
  const hovered = rows.find(r => r.d === day);
  const i = hovered ? rows.indexOf(hovered) : -1;
  const left = i < 0 ? 0 : ((i + 0.5) / rows.length) * 100;

  return <>
    <div className="relative" onMouseLeave={() => setDay(null)}>
      <div className="vbars">{rows.map(({ d, m }) => {
        const dim = day && day !== d;
        return <div key={d} className={`c cursor-pointer outline-none transition-opacity duration-150 ${dim ? 'opacity-35' : ''}`} tabIndex={0} data-day={d}
          aria-label={`${fmtWD(d)}: ${m.calls} calls, ${m.con} connects, ${m.conv} conversations, ${m.leads} leads`}
          onMouseEnter={() => setDay(d)} onFocus={() => setDay(d)} onBlur={() => setDay(null)}>
          <span className={`v transition-colors ${day === d ? 'text-g600' : ''}`}>{m.calls}</span>
          <div className={`st transition-transform duration-150 origin-bottom ${day === d ? 'scale-x-110 shadow-sh-1' : ''}`} style={{ height: h(m.calls) }}>
            <i className={`bg-n200 transition-opacity ${segOpacity('none')}`} style={{ height: h(m.calls - m.con) }} />
            <i className={`bg-b500 transition-opacity ${segOpacity('con')}`} style={{ height: h(m.con - m.conv) }} />
            <i className={`bg-g500 transition-opacity ${segOpacity('conv')}`} style={{ height: Math.max(2, h(m.conv)) }} />
          </div>
          <small className={day === d ? 'text-ink font-bold' : ''}>{fmtS(d)}</small>
        </div>;
      })}</div>
      {hovered ? <div role="tooltip" data-chart-tip className="pointer-events-none absolute z-10 bottom-[calc(100%-18px)] w-[220px] p-[10px_12px] rounded-[12px] bg-surface border border-line-2 shadow-sh-2 text-[12.5px]"
        style={{ left: `${left}%`, transform: `translateX(${left < 20 ? '-15%' : left > 80 ? '-85%' : '-50%'})` }}>
        <b className="block text-[13.5px] mb-[4px]">{fmtWD(hovered.d)}</b>
        {[['Calls', hovered.m.calls, ''], ['No answer', hovered.m.calls - hovered.m.con, 'bg-n200'], ['Connected, no conversation', hovered.m.con - hovered.m.conv, 'bg-b500'], ['Conversations', hovered.m.conv, 'bg-g500'], ['New leads', hovered.m.leads, '']].map(([l, n, c]) =>
          <div key={l as string} className="flex items-center gap-[6px] py-[1px]">{c ? <i className={`inline-block w-[9px] h-[9px] rounded-[3px] ${c}`} /> : <i className="inline-block w-[9px]" />}<span className="text-muted">{l}</span><b className="ml-auto tabular-nums">{n}</b></div>)}
        <div className="mt-[5px] pt-[5px] border-t border-dashed border-line text-muted">Dial to connect <b className="text-ink">{hovered.m.d2c}</b> · Convo to lead <b className="text-ink">{pct(hovered.m.leads, hovered.m.conv)}</b></div>
      </div> : null}
    </div>
    <div className="legend">{SERIES.map(([k, l, c]) =>
      <span key={k} className={`cursor-default transition-opacity ${series && series !== k ? 'opacity-50' : ''}`} data-series={k}
        onMouseEnter={() => setSeries(k)} onMouseLeave={() => setSeries(null)}><i className={c} />{l}</span>)}</div>
  </>;
}
