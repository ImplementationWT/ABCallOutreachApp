'use client';
/* ===== OUTREACH MANAGER ===== (artifact/app.html): VIEWS.mgr side, mgrLive, mgrPool, mgrLeads,
 * mgrCamps, mgrRules, perfTable, mgrPerf, mgrMail, mgrSync. Modals are in ./modals.tsx. */
import type React from 'react';
import {
  AUDK, AUDS, C, CALLS, CAMPS, CFG, CTS, DAY, LEADS,  P, PRANK, PRI, PROPS, TODAY,
  CAMP_ST, campName, demoN, dupCheck, elig, first, fmtS, fmtT, fmtUS, fmtWD, propStatus, relDay,
  type AudKey, type Pri, type RepKey,
} from '@/lib/domain';
import { inp, on } from '@/lib/state/actions';
import { S, bump, toast } from '@/lib/state/store';
import { can } from '@/lib/state/auth';
import { UsersPage } from './users';
import { ReportsPage } from './reports';
import type { SbItem } from '@/components/shell/Sidebar';
import { Sidebar } from '@/components/shell/Sidebar';
import { Avatar, Icon, KPI_GRID, Kv, OutPill, PageHeader, Pill, PrTag, StatFilter, paged } from '@/components/ui';

export function MgrSide() {
  return <Sidebar k="mgr" items={[['Today'], ['reports', 'Reports', 'chart'], ['pool', 'Contact pool', 'users'], ['leads', 'Hand-offs to sales', 'hand', LEADS.filter(l => l.fresh).length], ['Settings'], ['camp', 'Campaign Management', 'cal'], ['rules', 'Global Assignment Rules', 'gear'], ...(can('users.manage') ? [['Admin'], ['users', 'Users', 'key']] as SbItem[] : [])]} />;
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

/* ----- Campaign Management (permanent campaigns: active until paused or ended) -----
 * The audiences first, then every campaign in one list (active, then paused, then ended), filtered
 * by audience. Each row: edit, pause or resume, and end, as icon buttons. */
const CAMP_COLS = 'grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_110px_100px_140px_120px]';
const ST_ORDER: Record<string, number> = { active: 0, paused: 1, ended: 2 };
/** Contacts reserved today for the campaign's reps whose property is in its audiences. */
const reservedIn = (c: (typeof CAMPS)[number]) => c.reps.reduce((a, r) => a + DAY[r].list.filter(k => c.auds.includes(P(C(k).prop).aud)).length, 0);
function CampRow({ c }: { c: (typeof CAMPS)[number] }) {
  const st = CAMP_ST[c.status], man = can('mgr.manage');
  const calls = CALLS.filter(x => c.reps.includes(x.rep as RepKey) && x.at.slice(0, 10) === TODAY && c.auds.includes(P(C(x.ct).prop).aud)).length;
  const when = c.date ? `Daily campaign of ${fmtUS(c.date)}` : c.status === 'active' ? `Active since ${c.since ? fmtS(c.since) : c.created ? fmtS(c.created) : 'creation'}` : c.since ? `${st.n} ${fmtS(c.since)}` : st.n;
  const name = campName(c);
  return <div className={`row ${CAMP_COLS}`} data-camp={c.k}>
    <div className="t"><b>{name}</b><small>{c.k}, goal {c.goal} potential lead{c.goal === 1 ? '' : 's'} per rep</small></div>
    <div className="t"><b className="font-semibold">{c.auds.map(a => AUDS[a].s).join(', ')}</b><small>{when}</small></div>
    <div className="cell flex gap-[4px]">{c.reps.map(r => <Avatar key={r} k={r} sm />)}</div>
    <div className="cell"><Pill t={st.n} cls={st.tone} /></div>
    <div className="cell">{c.status === 'active' ? `${reservedIn(c)} reserved today` : 'No new assignments'}<small>{calls} calls today</small></div>
    <div className="cell flex-row gap-[6px] justify-end">{man && c.status !== 'ended' ? <>
      <button className="ibtn" {...on('campedit', c.k)} aria-label={`Edit ${name}`} title="Edit"><Icon n="edit" s={15} /></button>
      {c.status === 'active'
        ? <button className="ibtn" {...on('camppause', c.k)} aria-label={`Pause ${name}`} title="Pause"><Icon n="pause" s={15} /></button>
        : <button className="ibtn go" {...on('campresume', c.k)} aria-label={`Resume ${name}`} title="Resume"><Icon n="play" s={15} /></button>}
      <button className="ibtn red" {...on('campend', c.k)} aria-label={`End ${name}`} title="End"><Icon n="stop" s={14} /></button>
    </> : null}</div>
  </div>;
}
function MgrCamps() {
  const aud = (S.f.campaud as string) || 'all';
  const rows = CAMPS.filter(c => aud === 'all' || c.auds.includes(aud as AudKey))
    .sort((a, b) => ST_ORDER[a.status] - ST_ORDER[b.status] || (b.created || b.date || '').localeCompare(a.created || a.date || '') || a.k.localeCompare(b.k));
  const pg = paged('camps', rows);
  return <>
    <PageHeader t="Campaign Management" sub="A campaign is a set of audiences and the reps who work it. It stays active until someone pauses or ends it, and several can be active at once. Each daily allocation takes the contacts of every active campaign of the rep together; a contact in two campaigns is assigned once." acts={<button className="btn pri" {...on('newcamp')}><Icon n="plus" s={15} />New campaign</button>} />
    <div className="grid4 mb-[16px]" data-audiences>{AUDK.map(a => { const ps = PROPS.filter(p => p.aud === a); return <Kv key={a} l={AUDS[a].n} v={ps.length + ' properties'} sub={`${ps.filter(p => propStatus(p) === 'Potential Lead').length} potential leads, ${ps.filter(p => p.permit === 'Permit Issued').length} with permit`} />; })}</div>
    <div className="toolbar" data-camp-filter><span className="sm muted">Audience</span><span className="segs">
      {(['all', ...AUDK] as string[]).map(k => <button key={k} className="seg" {...on('filt', `campaud|${k}`)} aria-pressed={aud === k}>{k === 'all' ? 'All' : AUDS[k as AudKey].s}</button>)}
    </span><span className="sp" /><span className="sm muted">{rows.length} campaign{rows.length === 1 ? '' : 's'}</span></div>
    {rows.length ? <><div className="rows" data-camps>
      <div className={`row head ${CAMP_COLS}`}><span>Campaign</span><span>Audiences</span><span>Reps</span><span>Status</span><span>Today</span><span /></div>
      {pg.rows.map(c => <CampRow key={c.k} c={c} />)}</div>{pg.pager}</>
      : <div className="empty">No campaigns with this audience.</div>}
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
 * First what can be changed (Outreach Manager: change, mgr.manage), then the rules that are fixed.
 * Campaigns are on their own page (Campaign Management). */
function MgrRules() {
  const dup = dupCheck();
  const eligRows: [string, string, string, React.ReactNode][] = [['ban', 'Not on Do Not Call or suppression lists', 'National registry filter is confirmed by AB.', ''], ['hand', 'Not already an AB client or in an active sale', 'Cross check with the AB Leads board by phone and address, including inbound calls.', ''], ['ban', 'Not removed by another contact of the property', 'One no, or one lead, takes the rest of the house out.', <Pill key="m" t="Manuel’s rule" cls="blue" />], ['call', 'Valid and callable phone', 'A Wrong Number marks that number and is not an attempt; with no other number the contact waits.', ''], ['flag', 'Under the max attempts', `After ${CFG.maxAtt} attempts the contact leaves the lists.`, ''], ['cal', 'Due according to the last result', 'Each call outcome sets when the contact can be called again.', '']];
  return <>
    <PageHeader t="Global Assignment Rules" sub="Every rule of the assignment engine: first what you can change, then the rules that always apply. Changes apply to the next allocation." />
    <h2 className="rsec" data-rules-part="change">What you can change</h2>
    <div className="grid2">
      <div className="card p-[6px_4px]" data-area="workload"><h3 className="p-[10px_14px_0]"><Icon n="users" s={16} />Workload, the same for every rep</h3>
        <Rule icon="target" t="Daily allocation per rep" d={`Up to this many eligible contacts each morning. Today reps make about 108 calls a day. In this demo: ${demoN(CFG.first)}, scaled to its data.`} r={<><Num k="first" v={CFG.first} /><span className="sm muted">contacts</span></>} />
        <Rule icon="plus" t="Request more" d={`Next batch when the rep has documented the whole list. In this demo: ${demoN(CFG.more)}.`} r={<><Num k="more" v={CFG.more} /><span className="sm muted">contacts</span></>} />
        <Rule icon="refresh" t="List refresh" d="Daily is what the engine does. Weekly is pending with Andrew: the engine does not use it yet." r={<span className="segs">{['daily', 'weekly'].map(k => <button key={k} className="seg" {...on('cfgset', `refresh|${k}`)} aria-pressed={CFG.refresh === k}>{k === 'daily' ? 'Daily' : 'Weekly'}</button>)}</span>} />
      </div>
      <div className="card p-[6px_4px] self-start" data-area="attempts"><h3 className="p-[10px_14px_0]"><Icon n="flag" s={16} />Attempts</h3>
        <Rule icon="flag" t="Max attempts per contact" d="Every call counts except Wrong Number. At the max the contact goes on hold; a follow-up set on the last attempt is kept." r={<><Num k="maxAtt" v={CFG.maxAtt} /><span className="sm muted">calls</span></>} />
      </div>
    </div>

    <div className="grid2 mt-[18px]" data-rules-part="fixed">
      <div>
        <div className="card" data-area="priority"><h3><Icon n="list" s={16} />Priorities</h3>
          <table className="ptbl"><tbody><tr><th>Priority</th><th>Criteria</th><th>Assignment</th></tr>{(Object.entries(PRI) as [Pri, (typeof PRI)[Pri]][]).map(([k, x]) => <tr key={k}><td><PrTag pr={k} sm /></td><td>{x.d}</td><td>{x.who === 'Original rep' ? <Pill t="Original rep" cls="violet" /> : <Pill t="Any rep" />}</td></tr>)}</tbody></table>
          <p className="sm muted mt-[8px]">Strict order, P1 to P5, also when the daily allocation runs out, across all active campaigns.</p>
        </div>
        <div className="card p-[6px_4px]" data-area="global"><h3 className="p-[10px_14px_0]"><Icon n="gear" s={16} />For every rep and campaign</h3>
          <Rule icon="clock" t="Oldest waiting first" d="Inside a priority, the property that waited longest since its last call goes first (never called counts as oldest)." r="" />
          <Rule icon="home" t="A property’s contacts stay together" d="The list keeps every contact of a property in a row, ordered by the best priority among them." r="" />
          <Rule icon="users" t="No duplicates" d="A contact is in one list only, even when it is in two campaigns, and a property and all its contacts stay with one rep for the day." r={<Pill t={`Same house, two reps today: ${dup}`} cls={dup ? 'red' : 'green'} />} />
          <Rule icon="shuffle" t="Even split" d="Each new property goes to the rep with the lowest load who can take it. A rep’s own follow-ups and undecided contacts go back to them." r="" />
          <Rule icon="logout" t="Not called at the end of the day" d="When the rep ends the workday, what was not called goes back to the pool with its priority." r="" />
          <Rule icon="clock" t="Calling hours" d={CFG.hours + '. Shown to the team; the app does not block calls outside these hours yet.'} r="" />
        </div>
      </div>
      <div className="card p-[6px_4px] self-start" data-area="elig"><h3 className="p-[10px_14px_0]"><Icon n="shield" s={16} />Eligibility, checked in this order</h3>
        {eligRows.map(([i, t, d, tg], ix) => <Rule key={ix} icon={i} t={t} d={d} r="" tag={tg} />)}
        <Rule icon="refresh" t="Reactivating an on-hold contact" d="Its rep or the Outreach Manager puts it back in the pool. It keeps its attempts and starts a new round." r="" />
      </div>
    </div>
  </>;
}

/* reports is the dashboard (live, the old The day by rep, lands there too); rules: Global Assignment
 * Rules (the old Assignment rules route); outc: the old Call outcomes link. */
export const MgrPages: Record<'reports' | 'live' | 'pool' | 'leads' | 'camp' | 'rules' | 'users' | 'outc', () => React.ReactNode> = {
  reports: ReportsPage, live: ReportsPage, pool: MgrPool, leads: MgrLeads, camp: MgrCamps, rules: MgrRules, users: UsersPage, outc: MgrRules,
};
