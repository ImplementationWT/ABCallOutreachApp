'use client';
/* Performance chart: the artifact's stacked bars, by period and interactive.
 * One bar per bucket of the period (a day, or a month in the year view). Hovering (or focusing) a bar
 * dims the others and shows its breakdown; hovering a legend item highlights that series; clicking a
 * bar opens that day or month. */
import { useState } from 'react';
import { pct, sumDays, type Bucket } from '@/lib/domain';
import { dispatch } from '@/lib/state/actions';

type Series = 'none' | 'con' | 'conv';
const SERIES: [Series, string, string][] = [['none', 'No answer', 'bg-n200'], ['con', 'Connected, no conversation', 'bg-b500'], ['conv', 'Conversation', 'bg-g500']];

export function TeamChart({ buckets }: { buckets: Bucket[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const rows = buckets.map(b => ({ b, m: sumDays(null, b.days) }));
  const mx = Math.max(1, ...rows.map(r => r.m.calls));
  const h = (n: number) => Math.round(n * 110 / mx);
  const segOpacity = (s: Series) => (series && series !== s ? 'opacity-25' : 'opacity-100');
  const hovered = rows.find(r => r.b.key === hover);
  const i = hovered ? rows.indexOf(hovered) : -1;
  const left = i < 0 ? 0 : ((i + 0.5) / rows.length) * 100;
  const many = rows.length > 14;

  return <>
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <div className={`vbars ${many ? 'gap-[4px]' : ''}`}>{rows.map(({ b, m }) => {
        const dim = hover && hover !== b.key;
        const on = hover === b.key;
        return <div key={b.key} data-day={b.key} data-future={b.future || undefined}
          className={`c outline-none transition-opacity duration-150 ${b.drill ? 'cursor-pointer' : 'cursor-default'} ${dim ? 'opacity-35' : ''} ${b.future ? 'opacity-40' : ''}`}
          tabIndex={b.future ? -1 : 0} role={b.drill ? 'button' : undefined}
          aria-label={`${b.title}: ${m.calls} calls, ${m.con} connects, ${m.conv} conversations, ${m.leads} leads`}
          onMouseEnter={() => !b.future && setHover(b.key)} onFocus={() => setHover(b.key)} onBlur={() => setHover(null)}
          onClick={() => b.drill && dispatch('perfdrill', b.drill.join('|'))}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && b.drill) { e.preventDefault(); dispatch('perfdrill', b.drill.join('|')); } }}>
          <span className={`v transition-colors ${on ? 'text-g600' : ''} ${many ? 'text-[10px]' : ''}`}>{b.future ? '' : m.calls}</span>
          <div className={`st transition-transform duration-150 origin-bottom ${on ? 'scale-x-110 shadow-sh-1' : ''}`} style={{ height: h(m.calls) }}>
            <i className={`bg-n200 transition-opacity ${segOpacity('none')}`} style={{ height: h(m.calls - m.con) }} />
            <i className={`bg-b500 transition-opacity ${segOpacity('con')}`} style={{ height: h(m.con - m.conv) }} />
            <i className={`bg-g500 transition-opacity ${segOpacity('conv')}`} style={{ height: m.calls ? Math.max(2, h(m.conv)) : 0 }} />
          </div>
          <small className={`${on || b.current ? 'text-ink font-bold' : ''} ${many ? 'text-[10px]' : ''}`}>{b.label}</small>
        </div>;
      })}</div>
      {hovered ? <div role="tooltip" data-chart-tip className="pointer-events-none absolute z-10 bottom-[calc(100%-18px)] w-[220px] p-[10px_12px] rounded-[12px] bg-surface border border-line-2 shadow-sh-2 text-[12.5px]"
        style={{ left: `${left}%`, transform: `translateX(${left < 20 ? '-15%' : left > 80 ? '-85%' : '-50%'})` }}>
        <b className="block text-[13.5px] mb-[4px]">{hovered.b.title}</b>
        {([['Calls', hovered.m.calls, ''], ['No answer', hovered.m.calls - hovered.m.con, 'bg-n200'], ['Connected, no conversation', hovered.m.con - hovered.m.conv, 'bg-b500'], ['Conversations', hovered.m.conv, 'bg-g500'], ['New leads', hovered.m.leads, '']] as [string, number, string][]).map(([l, n, c]) =>
          <div key={l} className="flex items-center gap-[6px] py-[1px]">{c ? <i className={`inline-block w-[9px] h-[9px] rounded-[3px] ${c}`} /> : <i className="inline-block w-[9px]" />}<span className="text-muted">{l}</span><b className="ml-auto tabular-nums">{n}</b></div>)}
        <div className="mt-[5px] pt-[5px] border-t border-dashed border-line text-muted">Dial to connect <b className="text-ink">{hovered.m.d2c}</b> · Convo to lead <b className="text-ink">{pct(hovered.m.leads, hovered.m.conv)}</b></div>
        {hovered.b.drill ? <div className="mt-[4px] text-[11.5px] text-faint">Click to open {hovered.b.drill[0] === 'month' ? 'the month' : 'the day'}</div> : null}
      </div> : null}
    </div>
    <div className="legend">{SERIES.map(([k, l, c]) =>
      <span key={k} className={`cursor-default transition-opacity ${series && series !== k ? 'opacity-50' : ''}`} data-series={k}
        onMouseEnter={() => setSeries(k)} onMouseLeave={() => setSeries(null)}><i className={c} />{l}</span>)}</div>
  </>;
}
