'use client';
/* ===== OUTREACH MANAGER ===== (artifact/app.html): VIEWS.mgr side, mgrLive, mgrPool, mgrLeads,
 * mgrCamps, mgrRules, perfTable, mgrPerf, mgrMail, mgrSync. Modals are in ./modals.tsx. */
import type React from 'react';
import {
  AUDK, AUDS, C, CALLS, CAMPS, CFG, CTS, DAY, LEADS, OUT, OUTK, recallOf, P, PEO, PRANK, PRI, PROPS, REPS, TODAY,
  CAMP_ST, activeCamps, callsOn, campName, campsName, demoN, docOf, dupCheck, elig, first, fmtS, fmtT, fmtUS, fmtWD, listOf, mOf, openOf, ownerOf, propStatus, relDay,
  type Pri, type RepKey,
} from '@/lib/domain';
import { inp, on } from '@/lib/state/actions';
import { S, bump, toast } from '@/lib/state/store';
import { can } from '@/lib/state/auth';
import { UsersPage } from './users';
import { OutcomesPage } from './outcomes';
import { ReportsPage } from './reports';
import type { SbItem } from '@/components/shell/Sidebar';
import { Sidebar } from '@/components/shell/Sidebar';
import { Avatar, Bar, Icon, KPI_GRID, Kv, OutPill, PageHeader, Pill, PrTag, StatFilter, paged } from '@/components/ui';

export function MgrSide() {
  return <Sidebar k="mgr" items={[['Today'], ['live', 'The day by rep', 'target'], ['pool', 'Contact pool', 'users'], ['leads', 'Hand-offs to sales', 'hand', LEADS.filter(l => l.fresh).length], ['Settings'], ['camp', 'Campaign Management', 'cal'], ['rules', 'Global Assignment Rules', 'gear'], ...(can('mgr.manage') ? [['Results'], ['reports', 'Reports', 'chart']] as SbItem[] : []), ...(can('users.manage') ? [['Admin'], ['users', 'Users', 'key']] as SbItem[] : [])]} />;
}

/* ----- The day by rep ----- */
function RepCard({ r }: { r: RepKey }) {
  const d = DAY[r], cn = campsName(r), m = mOf(callsOn(r, TODAY)), all = d.list.length, dn = docOf(r).length + listOf(r).filter(c => !d.done[c.k] && (c.stop || P(c.prop).lead)).length;
  const st = d.st === 'off' ? <Pill t="Off today" /> : d.st === 'started' ? <Pill t={'Calling since ' + fmtT(d.startedAt!)} cls="green dot" /> : d.st === 'ended' ? <Pill t={'Ended ' + fmtT(d.endedAt!)} cls="ink" /> : <Pill t="Not started" cls="amber dot" />;
  const own = listOf(r).filter(c => ownerOf(c) === r).length;
  return <div className={`repc ${d.st === 'off' ? 'off' : ''}`}>
    <div className="h"><Avatar k={r} /><div><b>{PEO[r].n}</b><small>{cn || 'No active campaign'}</small></div><span className="r">{st}</span></div>
    <div className="sm flex justify-between repc-prog"><span>{dn} of {all} documented</span><span className="muted">{own} own follow-ups</span></div><Bar n={dn} d={all} />
    <div className="nums"><div><small>Calls</small><b>{m.calls}</b></div><div><small>Connects</small><b>{m.con}</b></div><div><small>Convos</small><b>{m.conv}</b></div><div><small>Leads</small><b>{m.leads}</b></div></div>
    <div className="foot"><button className="btn sec sm" {...on('replist', r)}><Icon n="list" s={14} />See list</button><button className="btn sec sm" {...on('reassign', r)} disabled={!openOf(r).length}><Icon n="shuffle" s={14} />Reassign</button><button className="btn ghost sm" {...on('viewas', r)}>Open as {first(r)}</button></div>
  </div>;
}
function MgrLive() {
  const res = CTS.filter(c => c.res && c.res.date === TODAY).length;
  const docd = REPS.reduce((a, r) => a + docOf(r).length, 0);
  const pool = CTS.filter(c => elig(c).k === 'pool').length;
  const mt = mOf(callsOn(null, TODAY));
  const dup = dupCheck();
  const today = LEADS.filter(l => l.at.slice(0, 10) === TODAY);
  return <>
    <PageHeader t="The day by rep" sub={`${fmtWD(TODAY)}. Each rep got an even share from the morning allocation, follow-ups went back to the rep who set them, and every contact is reserved for one rep only.`} />
    <div className={`stats ${KPI_GRID}`}><div className="stat"><small>Reserved today</small><b>{res}</b></div><div className="stat green"><small>Documented</small><b>{docd}</b></div><div className="stat"><small>Calls so far</small><b>{mt.calls}</b></div><div className="stat green"><small>New leads today</small><b>{mt.leads}</b></div><div className="stat blue"><small>Eligible, not reserved</small><b>{pool}</b></div><div className={`stat ${dup ? 'red' : 'green'}`}><small>Same house, two reps</small><b>{dup}</b></div></div>
    <div className="reps">{REPS.map(r => <RepCard key={r} r={r} />)}</div>
    <div className="grid2">
      <div className="card"><h3><Icon n="cal" s={16} />Active campaigns<span className="r"><button className="btn ghost sm" {...on('pg_mgr', 'camp')}>All</button></span></h3>{activeCamps().length ? activeCamps().map(c => <div key={c.k} className="mrow"><b>{campName(c)}</b><span className="muted">{c.auds.map(a => AUDS[a].s).join(', ')}</span><span className="ml-auto flex gap-[4px]">{c.reps.map(r => <Avatar key={r} k={r} sm />)}</span></div>) : <p className="sm muted">No active campaigns: nobody gets a list until one is created or resumed.</p>}</div>
      <div className="card"><h3><Icon n="hand" s={16} />Hand-offs to sales today<span className="r"><button className="btn ghost sm" {...on('pg_mgr', 'leads')}>All</button></span></h3>
        {today.length ? today.map(l => <div key={l.k} className="mrow cursor-pointer" {...on('openprop', l.prop)}><b>{C(l.ct).n}</b><span className="muted">{P(l.prop).addr || "No address"}</span><span className="ml-auto"><Pill t={l.out} cls="green" /></span></div>)
          : <p className="sm muted">None yet today. When a rep marks Interested or Working on Plans, it shows here and in the AB Leads board in monday.</p>}
      </div>
    </div>
  </>;
}

/* ----- Contact pool ----- */
const POOLF: [string, string, string][] = [['pool', 'Eligible, not reserved', 'green'], ['res', 'Reserved today', 'blue'], ['due', 'Not due yet', ''], ['hold', 'On hold, no number', 'amber'], ['stop', 'Removed by the property', 'red'], ['closed', 'Closed', 'red'], ['dnc', 'Do Not Call or suppressed', 'red'], ['pipe', 'In AB sales pipeline', 'blue'], ['lead', 'Handed to sales', 'green'], ['max', 'On hold, max attempts', 'amber'], ['all', 'All contacts', '']];
const POOL_COLS = 'grid-cols-[40px_minmax(0,1.2fr)_minmax(0,1fr)_150px_150px_minmax(0,1.3fr)]';
function MgrPool() {
  const E = CTS.map(c => [c, elig(c)] as const);
  const cnt = (k: string) => k === 'all' ? E.length : E.filter(x => x[1].k === k).length;
  const f = S.f.pool, q = (S.srch.pool || '').toLowerCase();
  const rk = (p?: Pri) => p ? PRANK[p] : 9;
  const rows = E.filter(([c, e]) => (f === 'all' || e.k === f) && (!q || (c.n + ' ' + P(c.prop).addr).toLowerCase().includes(q)))
    .sort((a, b) => rk(a[1].pri) - rk(b[1].pri) || (a[0].nextAt || '').localeCompare(b[0].nextAt || ''));
  const pg = paged('pool', rows);
  return <>
    <PageHeader t="Contact pool" sub="Every contact and why it is, or is not, in today’s lists. The rules run in this order: handed to sales, Do Not Call and suppression, already in AB’s pipeline, closed, removed by another contact, no valid phone, max attempts, not due yet." />
    <div className={`stats ${KPI_GRID}`}>{POOLF.map(([k, l, cl]) => <StatFilter key={k} fk="pool" val={k} label={l} n={cnt(k)} cls={cl} />)}</div>
    <div className="toolbar"><div className="search"><Icon n="search" s={15} /><input id="srpool" placeholder="Search name or address" defaultValue={S.srch.pool || ''} {...inp('srch.pool')} /></div><span className="sp" /><span className="sm muted">{rows.length} contacts</span></div>
    <div className="rows">
      <div className={`row head ${POOL_COLS}`}><span /><span>Contact</span><span>Property</span><span>Last result</span><span>Next eligible</span><span>Status</span></div>
      {pg.rows.map(([c, e]) => {
        const p = P(c.prop);
        return <div key={c.k} className={`row ${POOL_COLS}`} {...on('openprop', p.k)}>
          {e.pri ? <PrTag pr={e.pri} sm /> : <span />}
          <div className="t"><b>{c.n}</b><small>{c.role === 'Other' ? c.other || 'Other' : c.role}, attempt {c.att}</small></div>
          <div className="t"><b className="font-semibold">{p.addr || "No address"}</b><small>{AUDS[p.aud].s}, {p.permit === 'None' ? 'no permit' : p.permit}</small></div>
          <div className="cell"><OutPill o={c.out} /><small>{c.lastAt ? fmtS(c.lastAt) + (c.rep ? ' by ' + first(c.rep) : '') : ''}</small></div>
          <div className="cell">{c.nextAt ? <><b>{fmtWD(c.nextAt)}</b><small>{relDay(c.nextAt)}</small></> : <span className="muted">Any day</span>}</div>
          <div className="cell"><Pill t={e.why.length > 46 ? e.why.slice(0, 44) + '...' : e.why} cls={e.tone} />{e.k === 'max' && can('mgr.manage') ? <button className="btn sec sm mt-[4px]" {...on('reactivate', c.k)}><Icon n="refresh" s={14} />Reactivate</button> : null}</div>
        </div>;
      })}
    </div>
    {pg.pager}
  </>;
}

/* ----- Hand-offs to sales ----- */
const LEAD_COLS = 'grid-cols-[80px_minmax(0,1.2fr)_minmax(0,1fr)_150px_130px_minmax(0,1.4fr)]';
function MgrLeads() {
  const l = LEADS.slice().sort((a, b) => b.at.localeCompare(a.at)), pg = paged('leads', l);
  return <>
    <PageHeader t="Hand-offs to sales" sub="The rep’s job is to find interest and pass it on. Every Potential Lead becomes an item in the AB Leads board in monday, with the call history, for the internal team. Inbound calls taken by the office are there too, and their properties stay out of outbound lists." />
    <div className="rows">
      <div className={`row head ${LEAD_COLS}`}><span>Lead</span><span>Property</span><span>Contact</span><span>Source</span><span>Date</span><span>Note</span></div>
      {pg.rows.map(x => {
        const p = P(x.prop), c = C(x.ct);
        return <div key={x.k} className={`row ${x.fresh ? 'alert bg-g25' : ''} ${LEAD_COLS}`} {...on('openprop', p.k)}>
          <div className="cell"><b>{x.k}</b></div>
          <div className="t"><b>{p.addr || "No address"}</b><small>{AUDS[p.aud].s}, {p.permit === 'None' ? 'no permit' : p.permit}</small></div>
          <div className="t"><b className="font-semibold">{c.n}</b><small>{x.out}</small></div>
          <div className="cell">{x.src === 'Inbound' ? <Pill t="Inbound, office" cls="blue" /> : <Pill t={'Outbound, ' + first(x.rep)} cls="green" />}<small>In AB Leads (monday)</small></div>
          <div className="cell">{fmtS(x.at)}<small>{fmtT(x.at)}</small></div>
          <div className="cell muted">{x.note || ''}</div>
        </div>;
      })}
    </div>
    {pg.pager}
  </>;
}

/* ----- Campaigns (permanent: active until paused or ended) ----- */
const CAMP_COLS = 'grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_110px_110px_130px_minmax(170px,auto)]';
/** Contacts reserved today for the campaign's reps whose property is in its audiences. */
const reservedIn = (c: (typeof CAMPS)[number]) => c.reps.reduce((a, r) => a + DAY[r].list.filter(k => c.auds.includes(P(C(k).prop).aud)).length, 0);
function CampRow({ c }: { c: (typeof CAMPS)[number] }) {
  const st = CAMP_ST[c.status], man = can('mgr.manage');
  const calls = CALLS.filter(x => c.reps.includes(x.rep as RepKey) && x.at.slice(0, 10) === TODAY && c.auds.includes(P(C(x.ct).prop).aud)).length;
  const when = c.date ? `Daily campaign of ${fmtUS(c.date)}` : c.status === 'active' ? `Active since ${c.since ? fmtS(c.since) : c.created ? fmtS(c.created) : 'creation'}` : c.since ? `${st.n} ${fmtS(c.since)}` : st.n;
  return <div className={`row ${CAMP_COLS}`} data-camp={c.k}>
    <div className="t"><b>{campName(c)}</b><small>{c.k}, goal {c.goal} potential lead{c.goal === 1 ? '' : 's'} per rep</small></div>
    <div className="t"><b className="font-semibold">{c.auds.map(a => AUDS[a].s).join(', ')}</b><small>{when}</small></div>
    <div className="cell flex gap-[4px]">{c.reps.map(r => <Avatar key={r} k={r} sm />)}</div>
    <div className="cell"><Pill t={st.n} cls={st.tone} /></div>
    <div className="cell">{c.status === 'active' ? `${reservedIn(c)} reserved today` : 'No new assignments'}<small>{calls} calls today</small></div>
    <div className="cell flex-row gap-[6px] justify-end">{man && c.status === 'active' ? <button className="btn sec sm" {...on('camppause', c.k)}><Icon n="pause" s={14} />Pause</button> : null}
      {man && c.status === 'paused' ? <button className="btn sec sm" {...on('campresume', c.k)}><Icon n="play" s={14} />Resume</button> : null}
      {man && c.status !== 'ended' ? <button className="btn ghost sm" {...on('campend', c.k)}><Icon n="x" s={14} />End</button> : null}</div>
  </div>;
}
function MgrCamps() {
  const by = (s: string) => CAMPS.filter(c => c.status === s);
  const groups: [string, string, string][] = [['active', 'Active', 'bg-g500'], ['paused', 'Paused', 'bg-a500'], ['ended', 'Ended', '']];
  return <>
    <PageHeader t="Campaign Management" sub="A campaign is a set of audiences and the reps who work it. It stays active until someone pauses or ends it, and several can be active at once. Each daily allocation takes the contacts of every active campaign of the rep together, with the same rules; a contact in two campaigns is assigned once." acts={<button className="btn pri" {...on('newcamp')}><Icon n="plus" s={15} />New campaign</button>} />
    {groups.map(([k, l, dot]) => { const cs = by(k), pg = paged('camp-' + k, cs); return <div key={k} className="grp" data-camps={k}><div className="grp-h"><i className={dot} />{l}<span className="n">{cs.length}</span></div>{cs.length ? <><div className="rows">{pg.rows.map(c => <CampRow key={c.k} c={c} />)}</div>{pg.pager}</> : <p className="sm muted p-[6px_2px]">{k === 'active' ? 'No active campaigns: nobody gets a list until one is created or resumed.' : 'None.'}</p>}</div>; })}
    <div className="card"><h3><Icon n="users" s={16} />Audiences</h3>
      <div className="grid4">{AUDK.map(a => { const ps = PROPS.filter(p => p.aud === a); return <Kv key={a} l={AUDS[a].n} v={ps.length + ' properties'} sub={`${ps.filter(p => propStatus(p) === 'Potential Lead').length} potential leads, ${ps.filter(p => p.permit === 'Permit Issued').length} with permit`} />; })}</div>
      <p className="sm muted mt-[8px]">Each campaign includes the contacts of its audiences. Building a campaign from filters on any data column comes later.</p>
    </div>
  </>;
}

/* ----- Settings helpers ----- */
const cfgChange = () => { if (!can('mgr.manage')) return; toast('Rule saved. The next allocation uses it'); bump(); };
function Num({ k, v, w = 70 }: { k: string; v: number; w?: number }) {
  return <input className={`numin ${w === 62 ? 'w-[62px]' : 'w-[70px]'}`} type="number" min={0} defaultValue={v} readOnly={!can('mgr.manage')} {...inp('cfg.' + k)} onChange={cfgChange} id={'cfg-' + k} />;
}
function Rule({ icon, t, d, r, tag }: { icon: string; t: string; d: React.ReactNode; r?: React.ReactNode; tag?: React.ReactNode }) {
  return <div className="rule"><span className="ic2"><Icon n={icon} s={15} /></span><div><b>{t}</b> {tag}<br /><span className="sm muted">{d}</span></div><div className="r flex-none whitespace-nowrap [&_.segs]:flex-nowrap">{r}</div></div>;
}
/* ===== Global Assignment Rules: every rule of the engine on one page =====
 * First what can be changed (Outreach Manager: change, mgr.manage), then what is fixed in this
 * version. Campaigns are on their own page (Campaign Management). */
function MgrRules() {
  const man = can('mgr.manage'), dup = dupCheck();
  const eligRows: [string, string, string, React.ReactNode][] = [['ban', 'Not on Do Not Call or suppression lists', 'National registry filter is confirmed by AB.', ''], ['hand', 'Not already an AB client or in an active sale', 'Cross check with the AB Leads board by phone and address, including inbound calls.', ''], ['ban', 'Not removed by another contact of the property', 'One no, or one lead, takes the rest of the house out.', <Pill key="m" t="Manuel’s rule" cls="blue" />], ['call', 'Valid and callable phone', 'A Wrong Number marks that number and is not an attempt; with no other number the contact waits.', ''], ['flag', 'Under the max attempts', `After ${CFG.maxAtt} attempts the contact leaves the lists.`, ''], ['cal', 'Due according to the last result', 'The waiting time of each call outcome.', '']];
  return <>
    <PageHeader t="Global Assignment Rules" sub="Every rule of the assignment engine: first what you can change, then what is fixed in this version. Changes apply to the next allocation." />
    <h2 className="rsec" data-rules-part="change">What you can change</h2>
    <div className="grid2">
      <div className="card p-[6px_4px]" data-area="workload"><h3 className="p-[10px_14px_0]"><Icon n="users" s={16} />Workload, the same for every rep</h3>
        <Rule icon="target" t="Daily allocation per rep" d={`Up to this many eligible contacts each morning. Today reps make about 108 calls a day. In this demo: ${demoN(CFG.first)}, scaled to its data.`} r={<><Num k="first" v={CFG.first} /><span className="sm muted">contacts</span></>} />
        <Rule icon="plus" t="Request more" d={`Next batch when the rep has documented the whole list. In this demo: ${demoN(CFG.more)}.`} r={<><Num k="more" v={CFG.more} /><span className="sm muted">contacts</span></>} />
        <Rule icon="refresh" t="List refresh" d="Daily is what the engine does. Weekly is pending with Andrew: the engine does not use it yet." r={<span className="segs">{['daily', 'weekly'].map(k => <button key={k} className="seg" {...on('cfgset', `refresh|${k}`)} aria-pressed={CFG.refresh === k}>{k === 'daily' ? 'Daily' : 'Weekly'}</button>)}</span>} />
        <Rule icon="logout" t="Not called at the end of the day" d="Back to the pool with its priority, or kept by the same rep tomorrow." r={<span className="segs">{[['pool', 'Back to pool'], ['keep', 'Same rep']].map(([k, l]) => <button key={k} className="seg" {...on('cfgset', `endDay|${k}`)} aria-pressed={CFG.endDay === k}>{l}</button>)}</span>} />
      </div>
      <div className="card p-[6px_4px]" data-area="attempts"><h3 className="p-[10px_14px_0]"><Icon n="flag" s={16} />Attempts</h3>
        <Rule icon="flag" t="Max attempts per contact" d="Every call counts except Wrong Number (each outcome says if it counts). At the max the contact goes on hold; a follow-up set on the last attempt is kept." r={<><Num k="maxAtt" v={CFG.maxAtt} /><span className="sm muted">calls</span></>} />
        <Rule icon="refresh" t="Reactivating an on-hold contact" d="Its rep or the Outreach Manager puts it back in the pool. Agreed with Andrew: it keeps its attempts." r={<span className="segs">{[['false', 'Keep the attempts'], ['true', 'Back to 0']].map(([k, l]) => <button key={k} className="seg" {...on('cfgset', `reactivateReset|${k}`)} aria-pressed={String(!!CFG.reactivateReset) === k}>{l}</button>)}</span>} />
      </div>
    </div>
    {man ? <OutcomesPage embedded /> : <div className="card"><h3><Icon n="cal" s={16} />When a contact can be called again</h3>
      <table className="ptbl"><tbody><tr><th>Result</th><th>Property status</th><th>Eligible again</th></tr>
        {OUTK.map(o => <tr key={o}><td>{o}{OUT[o].proposed ? <> <Pill t="Proposed" cls="amber" /></> : null}</td><td>{OUT[o].status}</td><td>{waitText(o)}</td></tr>)}
      </tbody></table>
      <p className="sm muted mt-[8px]">The Outreach Manager edits the outcomes.</p>
    </div>}

    <h2 className="rsec mt-[22px]" data-rules-part="fixed">Fixed in this version</h2>
    <div className="grid2">
      <div>
        <div className="card" data-area="priority"><h3><Icon n="list" s={16} />Priorities</h3>
          <table className="ptbl"><tbody><tr><th>Priority</th><th>Criteria</th><th>Assignment</th></tr>{(Object.entries(PRI) as [Pri, (typeof PRI)[Pri]][]).map(([k, x]) => <tr key={k}><td><PrTag pr={k} sm /></td><td>{x.d}</td><td>{x.who === 'Original rep' ? <Pill t="Original rep" cls="violet" /> : <Pill t="Any rep" />}</td></tr>)}</tbody></table>
          <p className="sm muted mt-[8px]">Strict order, P1 to P5, also when the daily allocation runs out, across all active campaigns. Which outcome gives P1, P3 or P4 is set in the call outcomes above.</p>
        </div>
        <div className="card p-[6px_4px]" data-area="global"><h3 className="p-[10px_14px_0]"><Icon n="gear" s={16} />For every rep and campaign</h3>
          <Rule icon="clock" t="Oldest waiting first" d="Inside a priority, the property that waited longest since its last call goes first (never called counts as oldest)." r="" />
          <Rule icon="home" t="A property’s contacts stay together" d="The list keeps every contact of a property in a row, ordered by the best priority among them." r="" />
          <Rule icon="users" t="No duplicates" d="A contact is in one list only, even when it is in two campaigns, and a property and all its contacts stay with one rep for the day." r={<Pill t={`Same house, two reps today: ${dup}`} cls={dup ? 'red' : 'green'} />} />
          <Rule icon="shuffle" t="Even split" d="Each new property goes to the rep with the lowest load who can take it. A rep’s own follow-ups and undecided contacts go back to them." r="" />
          <Rule icon="clock" t="Calling hours" d={CFG.hours + '. Shown to the team; the app does not block calls outside these hours yet.'} r="" />
        </div>
      </div>
      <div className="card p-[6px_4px]" data-area="elig"><h3 className="p-[10px_14px_0]"><Icon n="shield" s={16} />Eligibility, checked in this order</h3>
        {eligRows.map(([i, t, d, tg], ix) => <Rule key={ix} icon={i} t={t} d={d} r="" tag={tg} />)}
      </div>
    </div>
  </>;
}

/** "Eligible again" for an outcome of the catalog (the days are edited in Call outcomes). */
function waitText(o: string): string {
  const d = OUT[o];
  if (d.needsFollowUp) return 'On the date and time the rep sets, same rep';
  if (d.lead) return 'Goes to AB sales';
  if (d.final) return 'Never';
  const r = recallOf(o), t = `${r.days} ${r.cal ? 'day' : 'business day'}${r.days > 1 ? 's' : ''}`;
  if (d.phone === 'bad') return `Next number in ${t}, or on hold`;
  return d.sameRep ? `${t}, same rep` : t;
}
/* rules: Global Assignment Rules (the old Assignment rules route, so old links still land);
 * outc: the old Call outcomes page, now inside Global Assignment Rules. */
export const MgrPages: Record<'live' | 'pool' | 'leads' | 'camp' | 'rules' | 'users' | 'outc' | 'reports', () => React.ReactNode> = {
  live: MgrLive, pool: MgrPool, leads: MgrLeads, camp: MgrCamps, rules: MgrRules, users: UsersPage, outc: MgrRules, reports: ReportsPage,
};
