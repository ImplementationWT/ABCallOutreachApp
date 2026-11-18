'use client';
/* ===== CALLING AND AI (phase 2) ===== (artifact/app.html): VIEWS.p2 side, p2Call, p2Enrich, p2Aud, p2Prov. */
import type React from 'react';
import { P, elig, owners } from '@/lib/domain';
import { on } from '@/lib/state/actions';
import { Icon, Kv, PageHeader, Pill, paged } from '@/components/ui';
import { Sidebar } from '@/components/shell/Sidebar';

export function P2Side() {
  return <Sidebar k="p2" items={[['Phase 2'], ['call', 'Calls from the provider', 'headset'], ['enrich', 'Enrich and wrong numbers', 'search'], ['aud', 'New audiences', 'zap'], ['prov', 'Provider checklist', 'approve']]}
    foot={<><b>Starts after AB picks the provider</b>Any provider with an API or webhooks works.</>} />;
}

function P2Call() {
  return <>
    <PageHeader t="Calls from the provider" sub="What changes in the rep’s screen when the phone provider is connected: the call is dialed from the browser, logged by itself, and the AI drafts the result." />
    <div className="grid2">
      <div className="card">
        <h3><Icon n="headset" s={16} />Call with Elena Marsh<span className="r"><Pill t="Verified by the provider" cls="green" /></span></h3>
        <div className="grid3"><Kv l="Dialed" v="10:14:02 AM" /><Kv l="Answered" v="10:14:11 AM" /><Kv l="Duration" v="4 min 12 s" /></div>
        <div className="mrow mt-[8px]"><Icon n="wave" s={16} /><span>Recording</span><span className="muted ml-auto">Kept according to AB’s rules</span></div>
        <div className="lbl">Transcript (sample)</div>
        <div className="script max-h-[220px] overflow-auto">{`Rep: Hi Elena, this is Maya with Arzuman Brothers. We are rebuilding in the Palisades and I saw your permit was issued.
Elena: Yes, finally, in August. We have plans but no builder yet.
Rep: We do design-build, from plans to construction. Would it help to walk through how we would build yours?
Elena: Sure. My husband handles the budget, so include him. Email works best, mornings.
Rep: Great, someone from our team will email you both this week.`}</div>
      </div>
      <div className="card border-v100">
        <h3><Icon n="spark" s={16} />AI summary and suggestion</h3>
        <div className="ai mt-0"><div className="h"><Icon n="spark" s={15} />Summary</div>Permit issued in August, has plans, no builder. Interested in a design-build walkthrough. Husband David decides on budget. Prefers email in the morning.<ul><li><b>Suggested result:</b> Interested</li><li><b>Next step:</b> hand-off to AB sales, email both owners</li><li><b>Follow-up:</b> not needed, the property goes to sales</li></ul></div>
        <div className="flex gap-[8px] mt-[10px] flex-wrap"><button className="btn p2 sm" {...on('nop')}>Accept suggestion</button><button className="btn p2 sm" {...on('nop')}>Edit</button></div>
        <p className="sm muted mt-[8px]">The rep confirms; the AI never saves a result on its own. Only possible if the provider gives the transcript.</p>
      </div>
    </div>
  </>;
}

function P2Enrich() {
  // One row per person (an owner of several properties waits for one number)
  const hold = owners().filter(c => elig(c).k === 'hold'), pg = paged('hold', hold);
  const steps = ['The rep marks Wrong Number. That number is flagged, never the contact.', 'If the contact has another number, it comes back tomorrow with that one.', 'If not, the enrichment service looks for a new number (for example the one Andrew uses today, or monday’s native enrichment).', 'A new number puts the contact back in the pool with its priority.'];
  return <>
    <PageHeader t="Enrich and wrong numbers" sub="Many PropertyRadar contacts have no phone, and some numbers are wrong. Phase 2 looks for numbers on its own." />
    <div className="grid2">
      <div className="card">
        <h3><Icon n="alert" s={16} />Waiting for a number<span className="r"><Pill t={hold.length + ' on hold'} cls="amber" /></span></h3>
        {hold.length ? pg.rows.map(c => <div key={c.k} className="mrow"><b>{c.n}</b><span className="muted">{P(c.prop).addr || "No address"}</span><span className="ml-auto"><button className="btn p2 sm" {...on('nop')}><Icon n="search" s={13} />Enrich</button></span></div>).concat(<div key="pager">{pg.pager}</div>)
          : <p className="sm muted">No contacts on hold right now. Mark a Wrong Number on a contact with one phone to see it here.</p>}
      </div>
      <div className="card">
        <h3><Icon n="refresh" s={16} />The Wrong Number flow</h3>
        <div className="flow m-0">{steps.map((t, i) => <div key={i}><i>{i + 1}</i><span>{t}</span></div>)}</div>
      </div>
    </div>
  </>;
}

function P2Aud() {
  const items: [string, string, string][] = [['home', 'Property sold', 'A sold lot is a new owner who may want to build. The contact data refreshes and the property comes back as Not Contacted.'], ['file', 'New permit issued', 'A permit moves the property to P2 and puts it in tomorrow’s lists.'], ['star', 'Priority contacts', 'Lists Andrew marks for a campaign, for example owners in streets where AB is already building.']];
  return <>
    <PageHeader t="New audiences" sub="After the fire rebuild list, new audiences come in by trigger instead of by hand." />
    <div className="grid3">{items.map(([i, t, d]) => <div key={t} className="card border-dashed"><h3><Icon n={i} s={16} />{t}</h3><p className="sm muted">{d}</p></div>)}</div>
  </>;
}

function P2Prov() {
  const q = ['API or webhooks for call events: start, end, duration, number', 'Transcript of each call, for the AI summary', 'Recording and how long it is kept', 'Dialing from the browser or a Chrome extension', 'Cost per seat, and the minimum number of seats', 'Can Andrew see and change the settings himself'];
  return <>
    <PageHeader t="Provider checklist" sub="AB chooses the phone provider (RingCentral and Aircall are being evaluated; JustCall was used in the account). We connect any of them if it exposes call data. These are the questions to confirm with the one AB picks." />
    <table className="ptbl"><tbody><tr><th>Question</th><th>RingCentral</th><th>Aircall</th><th>Other</th></tr>{q.map(x => <tr key={x}><td>{x}</td><td><Pill t="To confirm" cls="amber" /></td><td><Pill t="To confirm" cls="amber" /></td><td><Pill t="To confirm" cls="amber" /></td></tr>)}</tbody></table>
    <p className="sm muted mt-[8px]">Phase 1 does not depend on this choice: reps call with click to call and record the result.</p>
  </>;
}

export const P2Pages: Record<'call' | 'enrich' | 'aud' | 'prov', () => React.ReactNode> = { call: P2Call, enrich: P2Enrich, aud: P2Aud, prov: P2Prov };
