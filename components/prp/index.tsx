'use client';
/* ===== PROPERTIES ===== (artifact/app.html): VIEWS.prp side, prpList, prpRecord, prpContacts, prpImport. */
import type React from 'react';
import {
  AUDK, AUDS, C, CALLS, CFG, CTS, LEADS, NO_OUT, PROPS, TODAY,
  ctsOf, elig, first, fmtD, fmtS, propStatus, relDay, type Status,
} from '@/lib/domain';
import { inp, on } from '@/lib/state/actions';
import { S, toast } from '@/lib/state/store';
import { AudPill, Icon, Kv, OutPill, P2Tag, PageHeader, PermitPill, Pill, StPill, StatFilter } from '@/components/ui';
import { Sidebar } from '@/components/shell/Sidebar';
import { HistList } from '@/components/rep';

export function PrpSide() {
  return <Sidebar k="prp" items={[['Records'], ['props', 'Properties', 'home'], ['cts', 'Contacts', 'users'], ['Data'], ['imp', 'Data loads', 'upload']]}
    foot={<><b>{PROPS.length} properties, {CTS.length} contacts</b>Loaded from PropertyRadar. A property has 1 to 4 contacts.</>} />;
}

const STS: Status[] = ['Not Contacted', 'Contacted', 'Potential Lead', 'Not Interested'];
const STCLS: Record<string, string> = { 'Contacted': 'amber', 'Potential Lead': 'green', 'Not Interested': 'red' };
const PROW = 'grid-cols-[minmax(0,1.3fr)_170px_110px_150px_160px_150px]';

function PrpList() {
  const f = S.f.prst, fa = S.f.praud, q = (S.srch.prp || '').toLowerCase();
  const all = PROPS.filter(p => fa === 'all' || p.aud === fa);
  const rows = all.filter(p => (f === 'all' || propStatus(p) === f) && (!q || p.addr.toLowerCase().includes(q) || ctsOf(p.k).some(c => c.n.toLowerCase().includes(q))));
  const lastOf = (pk: string) => CALLS.filter(x => ctsOf(pk).some(c => c.k === x.ct)).sort((a, b) => b.at.localeCompare(a.at))[0];
  return <>
    <PageHeader t="Properties" sub="Every property with its outreach status. The status comes from what its contacts said, with the most advanced one winning." />
    <div className="stats"><StatFilter fk="prst" val="all" label="All" n={all.length} />{STS.map(s => <StatFilter key={s} fk="prst" val={s} label={s} n={all.filter(p => propStatus(p) === s).length} cls={STCLS[s] || ''} />)}</div>
    <div className="toolbar">
      <div className="search"><Icon n="search" s={15} /><input id="srprp" placeholder="Search address or contact" defaultValue={S.srch.prp || ''} {...inp('srch.prp')} /></div>
      {(['all', ...AUDK] as string[]).map(a => <button key={a} className="seg" {...on('filt', `praud|${a}`)} aria-pressed={fa === a}>{a === 'all' ? 'All audiences' : AUDS[a as keyof typeof AUDS].s}</button>)}
      <span className="sp" /><span className="sm muted">{rows.length} properties</span>
    </div>
    <div className="rows">
      <div className={`row head ${PROW}`}><span>Property</span><span>Permit</span><span>Contacts</span><span>Outreach status</span><span>Last call</span><span>Today</span></div>
      {rows.map(p => {
        const cs = ctsOf(p.k), l = lastOf(p.k), r = cs.find(c => c.res && c.res.date === TODAY);
        return <div key={p.k} className={`row ${PROW}`} {...on('openprop', p.k)}>
          <div className="t"><b>{p.addr}</b><small>{AUDS[p.aud].n}</small></div>
          <div className="cell"><PermitPill p={p} /></div>
          <div className="cell">{cs.length} contact{cs.length > 1 ? 's' : ''}</div>
          <div className="cell"><StPill s={propStatus(p)} /></div>
          <div className="cell">{l ? <>{l.out}<small>{fmtS(l.at)} by {first(l.rep)}</small></> : <span className="muted">Never called</span>}</div>
          <div className="cell">{r ? <Pill t={first(r.res!.rep) + '’s list'} cls="blue" /> : p.inPipe ? <Pill t="In AB pipeline" cls="blue" /> : null}</div>
        </div>;
      })}
    </div>
  </>;
}

export function PrpRecord({ k }: { k: string }) {
  const p = PROPS.find(x => x.k === k);
  if (!p) return <div className="empty">Property not found.</div>;
  const tab = S.tab.prp || 'cts', cs = ctsOf(p.k), lead = LEADS.find(l => l.prop === p.k);
  const ids = cs.map(c => c.k), ncalls = CALLS.filter(x => ids.includes(x.ct)).length;
  const reopenable = propStatus(p) === 'Not Interested' && !cs.some(c => c.dnc || c.out === 'Do Not Contact');
  let body: React.ReactNode = null;
  if (tab === 'cts') body = <div className="grid2">{cs.map(c => {
    const e = elig(c, true);
    return <div key={c.k} className="card" data-hl={c.k}>
      <h3><Icon n="user" s={16} />{c.n}<span className="r"><OutPill o={c.out} /></span></h3>
      <p className="sm muted m-[-4px_0_8px]">{c.role === 'Other' ? c.other || 'Other' : c.role}, {c.email}</p>
      <div className="phones">{c.phones.map((x, i) => <div key={i} className={`ph-r ${x.st === 'bad' ? 'bad' : ''}`}><div><b>{x.n}</b><small>{x.st === 'bad' ? 'Wrong number' : x.st === 'ok' ? 'Worked before' : 'Not tried yet'}</small></div></div>)}</div>
      <div className="grid3 mt-[10px]">
        <Kv l="Attempts" v={c.att + ' of ' + CFG.maxAtt} />
        <Kv l="Last call" v={c.lastAt ? fmtS(c.lastAt) : 'Never'} sub={c.rep ? 'by ' + first(c.rep) : ''} />
        <Kv l="Next eligible" v={c.nextAt ? fmtS(c.nextAt) : e.ok ? 'Any day' : 'No'} sub={c.nextAt ? relDay(c.nextAt) : ''} />
      </div>
      <div className="mt-[10px]"><Pill t={e.why} cls={e.tone} />{c.res && c.res.date === TODAY ? <>{' '}<Pill t={'In ' + first(c.res.rep) + '’s list today'} cls="blue" /></> : null}{c.rep ? <>{' '}<Pill t={'Original rep: ' + first(c.rep)} /></> : null}</div>
      {c.note ? <p className="sm mt-[8px]">{c.note}</p> : null}
    </div>;
  })}</div>;
  if (tab === 'hist') body = <div className="card"><HistList pk={p.k} /></div>;
  if (tab === 'info') body = <>
    <div className="grid4">
      <Kv l="Address" v={p.addr} sub={AUDS[p.aud].city} />
      <Kv l="Audience" v={AUDS[p.aud].n} />
      <Kv l="Permit status" v={p.permit === 'None' ? 'No permit yet' : p.permit} sub={p.permitDate ? fmtD(p.permitDate) : ''} />
      <Kv l="Construction started" v={p.started} />
      <Kv l="Lot size" v={p.lot.toLocaleString('en-US') + ' sq ft'} />
      <Kv l="Home before the fire" v={p.prior.toLocaleString('en-US') + ' sq ft'} sub={'built ' + p.built} />
      <Kv l="Owner since" v={p.since} />
      <Kv l="Source" v={p.src} sub="last load Oct 28" />
    </div>
    <p className="sm muted mt-[10px]">Informative columns from the data load. Which ones matter for the script or the priority is to be confirmed with Andrew.</p>
  </>;
  if (tab === 'mon') body = <div className="card">
    <h3><Icon n="sync" s={16} />In monday</h3>
    <div className="mrow"><b>Fire Rebuild Properties</b><span className="muted">Outreach Status: {propStatus(p)}, Permit: {p.permit}, Construction Started: {p.started}</span></div>
    {cs.map(c => <div key={c.k} className="mrow"><b>Fire Rebuild Contacts</b><span>{c.n}</span><span className="muted ml-auto">{c.out || 'Not Contacted'}{c.nextAt ? ', next ' + fmtS(c.nextAt) : ''}</span></div>)}
    {lead ? <div className="mrow"><b>AB Leads</b><span>{lead.k}</span><span className="muted ml-auto">{lead.out}, {fmtS(lead.at)}</span></div> : null}
  </div>;
  const no = cs.find(c => NO_OUT.includes(c.out!));
  const ns = lead
    ? <div className="nextstep"><span className="ic"><Icon n="hand" s={17} /></span><div><b>With AB sales: {lead.k}</b><small>{lead.src === 'Inbound' ? 'Came in by phone to the office' : `${C(lead.ct).n} said ${lead.out} to ${first(lead.rep)} on ${fmtS(lead.at)}`}. The property is out of outbound lists.</small></div><div className="acts"><button className="btn sec sm" {...on('go_mgr_leads')}>See hand-offs</button></div></div>
    : p.inPipe
      ? <div className="nextstep"><span className="ic"><Icon n="hand" s={17} /></span><div><b>Already in AB’s sales pipeline</b><small>{p.inPipe}. Kept out of outbound lists.</small></div></div>
      : reopenable
        ? <div className="nextstep red"><span className="ic"><Icon n="ban" s={17} /></span><div><b>Out of the lists: a contact said no</b><small>{no ? no.n : ''} said {no ? no.out : ''}. Andrew can reopen the property if something changes.</small></div><div className="acts"><button className="btn sec sm" {...on('reopen', p.k)}>Reopen for outreach</button></div></div>
        : null;
  const tabs: [string, string, number?][] = [['cts', 'Contacts', cs.length], ['hist', 'Call history', ncalls], ['info', 'Property data'], ['mon', 'monday']];
  return <>
    <div className="crumb"><button {...on('pg_prp', 'props')}>Properties</button><Icon n="chr" s={14} /><span>{p.addr}</span></div>
    <div className="rh">
      <div><h1>{p.addr}</h1><p>{AUDS[p.aud].city}</p><div className="pills"><StPill s={propStatus(p)} /><AudPill a={p.aud} /><PermitPill p={p} /><Pill t={'Construction started: ' + p.started} cls={p.started === 'Yes' ? 'red' : ''} /></div></div>
      <div className="acts">{p.started === 'No' ? <button className="btn sec sm" {...on('started', p.k)}>Mark construction started</button> : null}</div>
    </div>
    {ns}
    <div className="jtabs">{tabs.map(([tk, l, n]) => <button key={tk} {...on('prtab', tk)} aria-pressed={tab === tk}>{l}{n != null ? <span>{n}</span> : null}</button>)}</div>
    {body}
  </>;
}

const CROW = 'grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_160px_150px_90px_140px]';
function PrpContacts() {
  const q = (S.srch.cts || '').toLowerCase();
  const rows = CTS.filter(c => { const p = PROPS.find(x => x.k === c.prop)!; return !q || (c.n + ' ' + p.addr + ' ' + c.phones.map(x => x.n).join(' ')).toLowerCase().includes(q); });
  return <>
    <PageHeader t="Contacts" sub="Owners and other contacts of each property. A contact can have more than one phone; the app remembers which one worked." />
    <div className="toolbar"><div className="search"><Icon n="search" s={15} /><input id="srcts" placeholder="Search name, address or phone" defaultValue={S.srch.cts || ''} {...inp('srch.cts')} /></div><span className="sp" /><span className="sm muted">{rows.length} contacts</span></div>
    <div className="rows">
      <div className={`row head ${CROW}`}><span>Contact</span><span>Property</span><span>Phones</span><span>Last result</span><span>Attempts</span><span>Next eligible</span></div>
      {rows.map(c => {
        const p = PROPS.find(x => x.k === c.prop)!;
        return <div key={c.k} className={`row ${CROW}`} {...on('openct', c.k)}>
          <div className="t"><b>{c.n}</b><small>{c.role === 'Other' ? c.other || 'Other' : c.role}</small></div>
          <div className="t"><b className="font-semibold">{p.addr}</b><small>{AUDS[p.aud].s}</small></div>
          <div className="cell">{c.phones[0].n}<small>{c.phones.length > 1 ? '+' + (c.phones.length - 1) + ' more' : ''}{c.phones.some(x => x.st === 'bad') ? ' (one wrong)' : ''}</small></div>
          <div className="cell"><OutPill o={c.out} /></div>
          <div className="cell">{c.att}</div>
          <div className="cell">{c.nextAt ? fmtS(c.nextAt) : ''}</div>
        </div>;
      })}
    </div>
  </>;
}

const IROW = 'grid-cols-[130px_minmax(0,1fr)_120px_120px_120px_minmax(0,1fr)]';
const LOADS: [string, string, number, number, number, string][] = [
  ['Oct 28, 2026', 'PropertyRadar, Pacific Palisades and Sunset Mesa', 34, 66, 3, 'Matched by address and phone'],
  ['Oct 28, 2026', 'PropertyRadar, Malibu and Altadena', 29, 56, 2, 'Contacts without a phone: 9, waiting for enrichment'],
];
function PrpImport() {
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    if (el.files && el.files.length) toast(`${el.files[0].name} received. In the app it is matched by address and phone before loading`);
    el.value = '';
  };
  return <>
    <PageHeader t="Data loads" sub="How properties and contacts get into the app. Phase 1 loads PropertyRadar exports; phase 2 adds a daily feed and new audiences by trigger."
      acts={<label className="btn pri"><Icon n="upload" s={15} />Load a PropertyRadar file<input type="file" accept=".csv,.xlsx" data-up="imp" style={{ display: 'none' }} onChange={onFile} /></label>} />
    <div className="rows">
      <div className={`row head ${IROW}`}><span>Date</span><span>File</span><span>Properties</span><span>Contacts</span><span>Duplicates</span><span>Note</span></div>
      {LOADS.map((r, i) => <div key={i} className={`row ${IROW}`}><div className="cell"><b>{r[0]}</b></div><div className="t"><b>{r[1]}</b></div><div className="cell">{r[2]}</div><div className="cell">{r[3]}</div><div className="cell">{r[4]} merged</div><div className="cell muted">{r[5]}</div></div>)}
    </div>
    <div className="grid2 mt-[14px]">
      <div className="card"><h3><Icon n="check" s={16} />What a load does</h3><ul className="sm m-0 pl-[18px]"><li>Matches each row to an existing property by address, and each contact by phone, so nothing is loaded twice.</li><li>Keeps every phone of a contact as its own number, so a wrong one does not lose the others.</li><li>Leaves the call history untouched.</li><li>Pushes new properties and contacts to monday.</li></ul></div>
      <div className="card border-dashed"><h3><Icon n="layers" s={16} />Phase 2 <P2Tag /></h3><ul className="sm m-0 pl-[18px]"><li>Daily automatic feed instead of manual files.</li><li>Batch enrichment for contacts without a phone, before lists are built.</li><li>New audiences by trigger: property sold, new permit issued, priority contacts.</li><li>One zone still to load: AB confirms which one.</li></ul></div>
    </div>
  </>;
}

export const PrpPages: Record<'props' | 'cts' | 'imp', () => React.ReactNode> = { props: PrpList, cts: PrpContacts, imp: PrpImport };
