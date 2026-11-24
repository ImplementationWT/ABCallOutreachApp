'use client';
/* ===== REP WORKSPACE ===== (artifact/app.html): VIEWS.rep, repToday, repStart, repEnded, repWork,
 * qItem, repDetail, sibRow, histList, scriptFor, repFollowUps, repCalls. */
import { Fragment } from 'react';
import type React from 'react';
import {
  AUDS, C, CALLS, CFG, DAY, LEADS, OUT, P, PEO, PRI, TODAY, activeOutcomes, isLeadOut, isNoOut,
  addDays, callsOn, campName, campOf, ctsOf, demoN, docOf, effectsOf, elig, first, fmtD, fmtDT, fmtS, fmtT, fmtUS, fmtWD,
  fullAddr, getClock, iso, isoT, listOf, mOf, openOf, ownerOf, phIdx, priOf, propStatus, relDay, T0,
  type Contact, type Property, type RepKey,
} from '@/lib/domain';
import { inp, on } from '@/lib/state/actions';
import { myFollowUps, queueSort } from '@/lib/state/rep';
import { S, bump } from '@/lib/state/store';
import { Sidebar } from '@/components/shell/Sidebar';
import { AudPill, Bar, DateField, Icon, Kv, OutPill, P2Tag, PageHeader, Pill, PrTag, StPill, paged } from '@/components/ui';

const repCamp = () => campOf(S.user);
/* Render-time writes to S, as in the artifact (default selection and the draft of a contact). */
const setSel = (u: RepKey, k: string | undefined) => { S.sel[u] = k; };
const setFu = (k: string, v: string) => { S.draft[k].fu = v; };
const setFuT = (k: string, v: string) => { S.draft[k].fuT = v; bump(); };
const newKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
const draftOf = (k: string) => S.draft[k] || (S.draft[k] = { out: null, note: '', fu: null, key: newKey() });
/** The follow-up the rep picked, 'YYYY-MM-DDTHH:MM', or null while the date or the time is missing. */
export const fuOf = (dr: { fu: string | null; fuT?: string }) => dr.fu && dr.fuT ? `${dr.fu}T${dr.fuT}` : null;
const roleOf = (c: Contact) => c.role === 'Other' ? c.other || 'Other' : c.role;

export function RepSide() {
  const u = S.user, d = DAY[u], cp = repCamp();
  const fu = myFollowUps(u).filter(c => c.nextAt! > TODAY).length;
  return <Sidebar k="rep" items={[['My day'], ['today', 'My Outbound Dashboard', 'headset', d.st === 'started' ? openOf(u).length : 0], ['fu', 'My follow-ups', 'cal', fu, true], ['calls', 'My calls today', 'list', callsOn(u, TODAY).length, true]]}
    foot={<><b>{PEO[u].n}</b>{cp ? <>Campaign {fmtUS(cp.date)}{cp.auds.map(a => <Fragment key={a}><br />{AUDS[a].n}</Fragment>)}</> : 'Not scheduled today'}</>} />;
}

function RepToday() {
  const d = DAY[S.user];
  if (d.st === 'reserved') return <RepStart />;
  if (d.st === 'ended') return <RepEnded />;
  return <RepWork />;
}
function RepStart() {
  const u = S.user, cs = listOf(u), cp = repCamp();
  const own = cs.filter(c => ownerOf(c) === u).length;
  return <>
    <PageHeader t="My Outbound Dashboard" sub={fmtWD(TODAY)} acts={<Pill t="Not Started" cls="dot" />} />
    <div className="startw"><div className="sico"><Icon n="headset" s={30} /></div><h2>Ready to start calling?</h2><p>Start your workday to receive your first daily allocation of eligible contacts. They are reserved for you, so nobody else calls them today.</p><button className="btn pri" {...on('startday')} disabled={S.loadingMore} aria-busy={S.loadingMore}>{S.loadingMore ? <span className="ld-spin" aria-hidden="true" /> : <Icon n="play" s={16} />}{S.loadingMore ? 'Getting your contacts…' : 'Start Workday'}</button>
      <div className="pre"><Pill t={cs.length + ' contacts waiting'} cls="green" />{own ? <Pill t={own + ' are your follow-ups'} cls="red" /> : null}{cp ? <Pill t={campName(cp)} cls="blue" /> : null}</div></div>
    <p className="sm muted text-center">The morning allocation ran at 7:00 AM with Andrew’s rules. Daily allocation per rep: {CFG.first} contacts ({demoN(CFG.first)} in this demo, scaled to its data).</p>
  </>;
}
function RepEnded() {
  const m = mOf(callsOn(S.user, TODAY));
  return <>
    <PageHeader t="My Outbound Dashboard" sub={fmtWD(TODAY)} acts={<Pill t="Workday ended" cls="ink" />} />
    <div className="startw"><div className="sico"><Icon n="check" s={30} /></div><h2>Good work today</h2><p>{m.calls} calls, {m.con} connects, {m.conv} conversations and {m.leads} new lead{m.leads === 1 ? '' : 's'}. The performance email goes out to management tonight.</p><button className="btn sec" {...on('reopenday')}>Back to my list</button></div>
  </>;
}
function QItem({ c, u, cur }: { c: Contact; u: RepKey; cur: boolean }) {
  const p = P(c.prop), done = DAY[u].done[c.k], call = done ? CALLS.find(x => x.id === done) : undefined;
  const pr = priOf(c);
  const removed = c.stop || (p.lead && !(call && isLeadOut(call.out)));
  const left = removed ? <span className="pr ok bg-r50 text-r500"><Icon n="ban" s={14} /></span> : done ? <span className="pr ok"><Icon n="check" s={15} /></span> : <PrTag pr={pr} />;
  const sub = done ? `${call!.out} at ${fmtT(call!.at)}` : removed ? (c.stop ? c.stop.why : 'Property handed to sales') : `${c.out ? c.out + ' ' + fmtS(c.lastAt) : 'Never called'}, attempt ${c.att + 1}`;
  const tags = done || removed ? null : <div className="tags">{ownerOf(c) === u ? <Pill t={pr === 'P1' ? 'Your follow-up' : 'Your undecided'} cls={pr === 'P1' ? 'red' : 'violet'} /> : null}{p.permit === 'Permit Issued' ? <Pill t="Permit issued" cls="green" /> : p.permit === 'Plans Submitted' ? <Pill t="Plans submitted" cls="amber" /> : null}<Pill t={AUDS[p.aud].s} /></div>;
  return <button className={`qi ${done || removed ? 'done' : ''}`} {...on('qsel', c.k)} aria-current={cur} data-hl={c.k}>{left}<span className="min-w-0"><b>{c.n}</b><small>{p.addr || "No address"}</small><small>{sub}</small>{tags}</span><span /></button>;
}
/** Placeholders while "Request more" waits for the server. */
const QSkel = () => <div className="qi ld-qi" aria-hidden="true"><span className="ld-sk ld-av" /><span className="ld-lines"><span className="ld-sk w-[70%]" /><span className="ld-sk w-[55%]" /><span className="ld-sk w-[40%]" /></span></div>;
const DetailSkel = () => <div className="dcard ld-det" aria-hidden="true"><span className="ld-sk h-[22px] w-[45%]" /><span className="ld-sk w-[65%]" /><span className="ld-sk h-[44px] w-full mt-[14px]" /><span className="ld-sk h-[120px] w-full mt-[10px]" /></div>;
function RepWork() {
  const u = S.user, d = DAY[u];
  const all = listOf(u);
  const open = openOf(u).sort(queueSort);
  const done = docOf(u).sort((a, b) => d.done[a.k] - d.done[b.k]);
  const removed = all.filter(c => !d.done[c.k] && (c.stop || P(c.prop).lead));
  if (!S.sel[u] || !all.find(c => c.k === S.sel[u])) setSel(u, open[0] ? open[0].k : (done[0] || {}).k);
  const ndoc = done.length + removed.length;
  const m = mOf(callsOn(u, TODAY));
  const busy = S.loadingMore;
  return <>
    <PageHeader t="My Outbound Dashboard" sub={`${fmtWD(TODAY)}, ${m.calls} calls, ${m.con} connects, ${m.leads} lead${m.leads === 1 ? '' : 's'} so far`}
      acts={<><Pill t="Calling" cls="green dot blink" /><button className="btn sec sm" {...on('reqmore')} disabled={busy} aria-busy={busy}>{busy ? <span className="ld-spin" aria-hidden="true" /> : <Icon n="plus" s={14} />}{busy ? 'Requesting…' : 'Request more'}</button><button className="btn sec sm" {...on('endday')}><Icon n="logout" s={14} />End workday</button></>} />
    {busy ? <div className="morebox ld-box" role="status" aria-live="polite"><span className="ld-ring" aria-hidden="true" /><div><b>Finding your next contacts</b><small>The engine checks today’s campaign and reserves the contacts for you only, so nobody else gets them.</small></div></div> : open.length ? null : <div className="morebox"><Icon n="check" s={22} /><div><b>Your list is documented</b><small>Every contact has a result. Request more and the engine checks the list before giving you the next batch.</small></div><div className="acts"><button className="btn pri" {...on('reqmore')}><Icon n="plus" s={15} />Request more contacts</button></div></div>}
    <div className="work">
      <div className="qlist"><div className="qhead"><b>Today: {ndoc} of {all.length} documented</b><Bar n={ndoc} d={all.length} /><small>Called contacts go to the end of the queue, so nobody is skipped.</small></div><div className="qscroll">
        {busy ? <><div className="qsec">Reserving contacts…</div>{[0, 1, 2, 3, 4].map(i => <QSkel key={i} />)}</> : null}
        {open.length ? <><div className="qsec">To call ({open.length})</div>{open.map(c => <QItem key={c.k} c={c} u={u} cur={c.k === S.sel[u]} />)}</> : null}
        {done.length ? <><div className="qsec">Documented ({done.length})</div>{done.map(c => <QItem key={c.k} c={c} u={u} cur={c.k === S.sel[u]} />)}</> : null}
        {removed.length ? <><div className="qsec">Removed today ({removed.length})</div>{removed.map(c => <QItem key={c.k} c={c} u={u} cur={c.k === S.sel[u]} />)}</> : null}
      </div></div>
      <div className="wdet">{busy && !open.length ? <DetailSkel /> : S.sel[u] ? <RepDetail c={C(S.sel[u]!)} /> : <div className="empty">Pick a contact on the left.</div>}</div>
    </div>
  </>;
}
/** The result buttons, grouped, from the outcome catalog (active outcomes only). */
const groupsOf = (): [string, string[]][] => {
  const act = activeOutcomes();
  return [['Nobody answered', act.filter(o => OUT[o].group === 'none' && !isNoOut(o) && !isLeadOut(o))], ['Answered', act.filter(o => OUT[o].group !== 'none' && !isNoOut(o))], ['Said no', act.filter(o => isNoOut(o))]];
};
function RepDetail({ c }: { c: Contact }) {
  const u = S.user, p = P(c.prop), d = DAY[u];
  const doneId = d.done[c.k], call = doneId ? CALLS.find(x => x.id === doneId) : undefined;
  const removed = !call && (c.stop || p.lead);
  const pr = priOf(c);
  const dr = draftOf(c.k);
  const sibs = ctsOf(p.k).filter(x => x !== c);
  const ix = phIdx(c);
  const needsFu = !!dr.out && !!OUT[dr.out]?.needsFollowUp, fu = fuOf(dr), fuPast = !!fu && fu <= isoT(getClock()), fuOk = !needsFu || (!!fu && !fuPast);
  return <>
    <div className="dcard"><div className="dh"><div><h2>{c.n}</h2><p>{roleOf(c)}, {fullAddr(p)}</p><div className="pills">
      {call || removed ? null : <PrTag pr={pr} sm />}{call || removed ? null : <Pill t={`${pr}: ${PRI[pr].n}`} />}
      {ownerOf(c) === u && !call ? <Pill t={pr === 'P1' ? 'Your follow-up, due today' : 'Your undecided contact'} cls={pr === 'P1' ? 'red' : 'violet'} /> : null}
      <AudPill a={p.aud} /><Pill t={`Attempt ${call ? c.att : c.att + 1} of ${CFG.maxAtt}`} />
    </div></div><div className="acts"><button className="btn sec sm" {...on('openprop', p.k)}><Icon n="home" s={14} />Open property</button></div></div></div>
    {removed
      ? <div className="nextstep red"><span className="ic"><Icon n="ban" s={17} /></span><div><b>Do not call: removed from your list</b><small>{c.stop ? c.stop.why : 'The property is with AB sales'}. The rule removes every other contact of a property when one says no or becomes a lead.</small></div></div>
      : call
        ? <>
          <div className={`nextstep ${isLeadOut(call.out) ? '' : isNoOut(call.out) ? 'red' : 'grey'}`}><span className="ic"><Icon n="check" s={17} /></span><div><b>Documented: {call.out} at {fmtT(call.at)}</b><small>{call.note ? call.note : 'No notes'}</small></div></div>
          {call.fx ? <div className="effect m-[-4px_0_12px]"><b>What the rules did</b><ul>{call.fx.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null}
        </>
        : <>
          <div className="dcard"><h3><Icon n="call" s={16} />Phone{c.phones.length > 1 ? 's' : ''}<span className="r"><P2Tag t="Phase 2: Enrich finds more numbers" /></span></h3><div className="phones">
            {c.phones.map((x, i) => <div key={i} className={`ph-r ${x.st === 'bad' ? 'bad' : ''}`}><div><b>{x.n}</b><small>{x.st === 'bad' ? 'Wrong number' : x.st === 'ok' ? 'Worked before' : 'Not tried yet'}{i === ix ? ', next to call' : ''}</small></div><div className="r">{x.st === 'bad' ? <Pill t="Wrong" cls="red" /> : <button className={`btn ${i === ix ? 'pri' : 'sec'} sm`} {...on('dial', `${c.k}|${i}`)}><Icon n="call" s={14} />Call</button>}</div></div>)}
          </div>
            {c.calling ? <div className="oncall"><span className="dotc" /><div><b>Calling {c.phones[c.callPh!].n}</b> from your phone, dialed at {fmtT(c.calling)}. Record the result below when you hang up.</div></div> : null}</div>
          <div className="dcard"><h3><Icon n="edit" s={16} />Result of the call</h3>
            {groupsOf().filter(([, ks]) => ks.length).map(([t, ks]) => <Fragment key={t}><div className="lbl mt-[6px]">{t}</div><div className="outs">{ks.map(o => <button key={o} className={`ob ${OUT[o].tone}`} {...on('setout', `${c.k}|${o}`)} aria-pressed={dr.out === o}>{o}<small>{OUT[o].hint}{OUT[o].proposed ? ', proposed' : ''}</small></button>)}</div></Fragment>)}
            {needsFu ? <><label className="lbl">Call back on <em>*</em></label><div className="flex gap-[8px] items-center flex-wrap"><div className="max-w-[320px] flex-1 min-w-[200px]"><DateField k={'fu:' + c.k} value={dr.fu} onSet={v => setFu(c.k, v)} /></div><input className="fld w-[130px]" type="time" step={300} aria-label="Call back time" id={`fut-${c.k}`} value={dr.fuT || ''} onChange={e => setFuT(c.k, e.target.value)} /></div></> : null}
            <label className="lbl">Notes</label><textarea className="fld min-h-[70px]" id={`note-${c.k}`} key={c.k} {...inp('note.' + c.k)} placeholder="What did they say? Anything the next person should know" defaultValue={dr.note} />
            {dr.out ? <div className="effect"><b>When you save</b><ul>{effectsOf(c, dr.out, fu || dr.fu).map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null}
            <div className="savebar"><span className="sm muted">{dr.out ? '' : 'Pick a result to save.'}{needsFu && !fu ? 'Pick the call back date and time.' : ''}{needsFu && fuPast ? 'The call back must be later than now.' : ''}</span><span className="sp" /><button className="btn pri" {...on('saveout', c.k)} disabled={!(dr.out && fuOk)}><Icon n="check" s={15} />Save and next</button></div></div>
        </>}
    <div className="dcard"><h3><Icon n="home" s={16} />The property<span className="r"><StPill s={propStatus(p)} /></span></h3><div className="grid4"><Kv l="Permit" v={p.permit === 'None' ? 'No permit yet' : p.permit} sub={p.permitDate ? fmtD(p.permitDate) : ''} /><Kv l="Construction started" v={p.started} /><Kv l="Audience" v={AUDS[p.aud].s} /><Kv l="Owner since" v={p.since ?? "—"} /></div>
      <div className="lbl mt-[12px]">Other contacts at this property</div>{sibs.length ? <div className="octs">{sibs.map(x => <SibRow key={x.k} x={x} u={u} />)}</div> : <p className="sm muted">No other contacts.</p>}</div>
    <div className="dcard"><h3><Icon n="clock" s={16} />History at this property</h3><HistList pk={p.k} /></div>
    <div className="dcard"><h3><Icon n="file" s={16} />Script: {AUDS[p.aud].n}<span className="r"><button className="btn ghost sm" {...on('togscript')}>{S.f.script ? 'Hide' : 'Show'}</button></span></h3>{S.f.script ? <><div className="script">{scriptFor(c, p, u)}</div><p className="sm muted mt-[6px]">Draft script written for the demo. AB sets the real one per campaign.</p></> : <p className="sm muted">The campaign script, with the contact’s name and address filled in.</p>}</div>
    <div className="dcard border-dashed"><h3><Icon n="spark" s={16} />With the phone provider <P2Tag /></h3><p className="sm muted">The call is dialed and logged by the provider, so start, end and duration are verified. If the provider gives a transcript, the AI writes the summary, suggests the result and the next step, and schedules the follow-up. The rep only confirms.</p><div className="mt-[8px] flex gap-[8px] flex-wrap"><button className="btn p2 sm" {...on('view', 'p2')}><Icon n="spark" s={14} />See it in Calling and AI</button></div></div>
  </>;
}

export function SibRow({ x, u }: { x: Contact; u: RepKey }) {
  const e = elig(x, true);
  const today = x.res && x.res.date === TODAY ? (x.res.rep === u ? 'In your list today' : 'In ' + first(x.res.rep) + '’s list today') : '';
  const last = x.out ? `${x.out}, ${fmtS(x.lastAt)} by ${first(x.rep || 'may')}` : 'Never called';
  return <div className={`oct ${x.stop || isNoOut(x.out) ? 'stop' : ''}`}><span><Icon n="user" s={15} /></span><div><b>{x.n}</b> <span className="muted sm">{roleOf(x)}</span><br /><span className="sm muted">{last}{x.note && x.out ? ': ' + x.note : ''}</span></div><div className="r">{today ? <Pill t={today} cls="blue" /> : null}{!e.ok || e.k !== 'pool' ? <Pill t={e.ok ? 'Eligible' : e.why.length > 34 ? e.why.slice(0, 32) + '...' : e.why} cls={e.ok ? 'green' : e.tone} /> : <Pill t="Eligible" cls="green" />}</div></div>;
}
const TL_TONE: Record<string, string> = { g: 'tg', a: 'ta', r: 'tr', b: 'tb', n: '' };
export function HistList({ pk }: { pk: string }) {
  const ids = ctsOf(pk).map(c => c.k);
  const cl = CALLS.filter(x => ids.includes(x.ct)).sort((a, b) => b.at.localeCompare(a.at));
  const lead = LEADS.find(l => l.prop === pk);
  if (!cl.length && !lead) return <p className="sm muted">No calls yet at this property.</p>;
  return <ul className="tl">
    {lead ? <li className="tg"><span className="d"><Icon n="hand" s={15} /></span><div className="x"><b>{lead.src === 'Inbound' ? 'Inbound call taken by the office' : 'Handed to AB sales'}: {lead.k}</b><br /><span className="muted">{lead.note || ''}</span><time>{fmtDT(lead.at)}</time></div></li> : null}
    {cl.map(x => <li key={x.id} className={OUT[x.out] ? TL_TONE[OUT[x.out].tone] : ''}><span className="d"><Icon n={OUT[x.out]?.tone === 'b' ? 'vm' : OUT[x.out] && OUT[x.out].group === 'none' ? 'call' : 'msg'} s={15} /></span><div className="x"><b>{C(x.ct).n}: {x.out}</b> <span className="muted">by {PEO[x.rep].n}, {x.ph}</span>{x.note ? <><br />{x.note}</> : null}<time>{fmtDT(x.at)}</time></div></li>)}
  </ul>;
}
function scriptFor(c: Contact, p: Property, u: RepKey) {
  const fn = c.n.split(' ')[0];
  const bg = { pp: 'Pacific Palisades', sm: 'Sunset Mesa', mb: 'Malibu', ad: 'Altadena' }[p.aud];
  return `Hi ${fn}, this is ${first(u)} with Arzuman Brothers. We are a design-build firm rebuilding homes in ${bg} after the January 2025 fires, and we are building in your neighborhood right now.\n\nI am calling about ${p.addr || "your property"}. ${p.permit === 'Permit Issued' ? 'I saw your permit was issued, congratulations. Do you already have a builder for the construction?' : p.permit === 'Plans Submitted' ? 'I saw your plans are submitted. Where are you in the process?' : 'Have you started planning the rebuild?'}\n\nWe handle everything from plans and permits to construction. Would it help to have someone from our team walk you through how that works and what it could cost?\n\nIf yes: set the result to Interested and note the best time and email.\nIf not now: ask when it would make sense to call back and set a Follow Up.`;
}

function RepFollowUps() {
  const u = S.user;
  const l = myFollowUps(u).sort((a, b) => a.nextAt!.localeCompare(b.nextAt!));
  const row = (c: Contact) => { const p = P(c.prop), pr = priOf(c); return <div key={c.k} className="row grid-cols-[40px_minmax(0,1.4fr)_minmax(0,1fr)_150px_130px]" {...on('openprop', p.k)}><PrTag pr={pr} sm /><div className="t"><b>{c.n}</b><small>{p.addr || "No address"}, {AUDS[p.aud].s}</small></div><div className="cell">{c.note || ''}</div><div className="cell"><OutPill o={c.out} /><small>{fmtS(c.lastAt)}</small></div><div className="cell"><b>{fmtWD(c.nextAt!)}</b><small>{c.fuAt ? fmtT(c.fuAt) + ', ' : ''}{relDay(c.nextAt!)}</small></div></div>; };
  const g = (t: string, arr: Contact[]) => { if (!arr.length) return null; const pg = paged('fu:' + t, arr); return <div className="grp" key={t}><div className="grp-h"><i />{t}<span className="n">{arr.length}</span></div><div className="rows">{pg.rows.map(row)}</div>{pg.pager}</div>; };
  const wk = iso(addDays(T0, 6));
  return <>
    <PageHeader t="My follow-ups" sub="Follow Up (P1) and Undecided (P3) contacts always come back to you, on the date you set or after the waiting time in the rules." />
    {g('Due today or earlier', l.filter(c => c.nextAt! <= TODAY))}{g('This week', l.filter(c => c.nextAt! > TODAY && c.nextAt! <= wk))}{g('Later', l.filter(c => c.nextAt! > wk))}{l.length ? null : <div className="empty">No follow-ups yet.</div>}
  </>;
}
function RepCalls() {
  const u = S.user, cl = callsOn(u, TODAY).slice().reverse(), m = mOf(callsOn(u, TODAY)), pg = paged('calls', cl);
  return <>
    <PageHeader t="My calls today" sub={fmtWD(TODAY)} />
    <div className="grid4 mb-[14px]"><Kv l="Calls made" v={m.calls} /><Kv l="Connects" v={m.con} sub={m.d2c + ' of calls'} /><Kv l="Conversations" v={m.conv} sub={m.c2v + ' of connects'} /><Kv l="New leads" v={m.leads} sub={m.v2l + ' of conversations'} /></div>
    {cl.length ? <><div className="rows">{pg.rows.map(x => { const c = C(x.ct), p = P(c.prop); return <div key={x.id} className="row grid-cols-[90px_minmax(0,1fr)_190px_minmax(0,1fr)]" {...on('openprop', p.k)}><div className="cell"><b>{fmtT(x.at)}</b></div><div className="t"><b>{c.n}</b><small>{p.addr || "No address"}, {x.ph}</small></div><div className="cell"><OutPill o={x.out} /></div><div className="cell muted">{x.note || ''}</div></div>; })}</div>{pg.pager}</> : <div className="empty">No calls yet today. Start your workday on My Outbound Dashboard.</div>}
  </>;
}

export const RepPages: Record<'today' | 'fu' | 'calls', () => React.ReactNode> = { today: RepToday, fu: RepFollowUps, calls: RepCalls };
