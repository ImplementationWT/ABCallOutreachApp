'use client';
/* ===== DATA ===== dbPage() in artifact/app.html: process A to Z, tables, access by app, where it runs. */
import { Fragment } from 'react';
import type React from 'react';
import { ACC, AZ, DBN, DBS, DGR } from '@/lib/domain/datamodel';
import { on } from '@/lib/state/actions';
import { APPN, APPS, APP_FASE, S, type AppKey } from '@/lib/state/store';
import { Icon, P2Tag, PageHeader, Pill } from '@/components/ui';

const MODES: [string, string][] = [['az', 'Process A to Z'], ['map', 'Tables'], ['mx', 'Access by app'], ['where', 'Where it runs']];

export function DataPage() {
  const m = S.f.dbm || 'az';
  let body: React.ReactNode = null;
  if (m === 'az') body = <div className="az">{AZ.map(([st, rows], i) => <div key={st} className="azs">
    <h3>{i + 1}. {st}</h3>
    {rows.map(([a, pg, t, d, dbs], j) => <div key={j} className="azr" {...on('azgo', `${a}|${pg}`)}>
      <span><Pill t={APPN[a as AppKey]} cls={APP_FASE[a as AppKey] === 'luego' ? 'violet' : 'green'} /></span>
      <span><b>{t}</b><br /><span className="sm muted">{d}</span></span>
      <span className="sm muted">{dbs.map(k => DBN[k]).join(', ')}</span>
    </div>)}
  </div>)}</div>;
  if (m === 'map') body = Object.entries(DGR).map(([g, [gn, tone]]) => <Fragment key={g}>
    <h3 className="text-[16px] m-[14px_0_8px]">{gn}</h3>
    <div className="dbg">{DBS.filter(b => b.g === g).map(b => <div key={b.k} className={`dbc ${b.ex ? 'ex' : ''} ${tone}`}>
      <h4><Icon n="db" s={15} />{b.n}{b.ex ? <Pill t="Existing" /> : null}</h4>
      <p>{b.d}. {b.c()} rows in the demo.</p>
      {b.f.map(([f, t]) => <div key={f} className="f"><span>{f}</span><span>{t}</span></div>)}
    </div>)}</div>
  </Fragment>);
  if (m === 'mx') body = <>
    <table className="mx"><tbody>
      <tr><th>Table</th>{APPS.map(a => <th key={a[0]}>{a[1]}</th>)}</tr>
      {DBS.map(b => <tr key={b.k}><td>{b.n}</td>{APPS.map(a => { const v = (ACC[a[0]] || {})[b.k]; return <td key={a[0]} className={v || ''}>{v === 'w' ? 'Writes' : v === 'r' ? 'Reads' : ''}</td>; })}</tr>)}
    </tbody></table>
    <p className="sm muted mt-[8px]">The monday boards are written only by the sync, never by hand.</p>
  </>;
  if (m === 'where') body = <div className="grid2">
    <div className="card"><h3><Icon n="monitor" s={16} />AB’s own system</h3><ul className="sm m-0 pl-[18px]"><li>A web app for reps and for Andrew, with a login per person and no monday seats.</li><li>The engine runs every morning and when a rep requests more.</li><li>Its own database, so rules, reservations and the call log are not limited by monday.</li><li>Runs on AB’s infrastructure; where exactly is to confirm with Mike.</li></ul></div>
    <div className="card"><h3><Icon n="sync" s={16} />Connected to monday</h3><ul className="sm m-0 pl-[18px]"><li>monday stays where AB sees the information: properties, contacts, leads and daily metrics.</li><li>Potential Leads arrive in the AB Leads board for the sales team.</li><li>Inbound calls in the AB Leads board keep those properties out of outbound lists.</li></ul></div>
    <div className="card border-dashed"><h3><Icon n="headset" s={16} />Phone provider <P2Tag /></h3><p className="sm muted">Whichever AB picks, as long as it gives call data by API or webhooks. Phase 1 works without it.</p></div>
    <div className="card border-dashed"><h3><Icon n="spark" s={16} />AI and enrichment <P2Tag /></h3><p className="sm muted">AI summaries from the provider’s transcript; a number search for contacts on hold.</p></div>
  </div>;
  return <div className="dbw">
    <PageHeader t="Data" sub="The tables behind the apps, the process from A to Z, who writes or reads each table, and where it runs." />
    <div className="toolbar">{MODES.map(([k, l]) => <button key={k} className="seg" {...on('dbm', k)} aria-pressed={m === k}>{l}</button>)}</div>
    {body}
  </div>;
}
