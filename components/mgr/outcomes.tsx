'use client';
/* Outreach Manager > Call outcomes (administrator only; not in the artifact).
 * The catalog the rep's form and the engine read: create, edit and deactivate outcomes without a
 * deploy. Outcomes are not deleted: an inactive one disappears from the form and stays in the
 * history. Saved by POST /api/outcomes, then the app reloads the state. */
import { useState } from 'react';
import { OUT, OUTK, type OutcomeDef } from '@/lib/domain';
import { getMe } from '@/lib/state/auth';
import { loadState } from '@/lib/state/persist';
import { bump, toast } from '@/lib/state/store';
import { Icon, PageHeader, Pill, paged } from '@/components/ui';

type Form = OutcomeDef & { name: string; edit: boolean };
const PROP_TXT: Record<OutcomeDef['propagates'], string> = { none: 'Only the contact', property: 'The whole property', person: 'Every property of the person' };
const STATUSES: OutcomeDef['status'][] = ['Not Contacted', 'Contacted', 'Not Interested', 'Potential Lead'];
const isAdmin = () => getMe()?.role === 'admin';

async function post(body: unknown) {
  const res = await fetch('/api/outcomes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
  return d;
}
const blank = (): Form => ({ name: '', edit: false, active: true, countsAsAttempt: true, recallDays: 1, calendarDays: false, propagates: 'none', needsFollowUp: false, lead: false, connect: true, final: false, sameRep: false, pri: null, group: 'conv', status: 'Contacted', phone: 'ok', started: false, proposed: false, tone: 'n', hint: '' });
const waitOf = (d: OutcomeDef) => d.needsFollowUp ? 'Date and time the rep sets' : d.lead ? 'Goes to AB sales' : d.final ? 'Never' : `${d.recallDays} ${d.calendarDays ? 'day' : 'business day'}${d.recallDays > 1 ? 's' : ''}`;

export function OutcomesPage() {
  const [form, setForm] = useState<Form | null>(null);
  if (!isAdmin()) return <div className="empty">Only an administrator can change the call outcomes.</div>;
  const toggle = async (k: string) => {
    try { await post({ action: 'update', name: k, active: !OUT[k].active }); await loadState(true); toast(`${k} ${OUT[k].active ? 'activated' : 'deactivated'}`); bump(); }
    catch (e) { toast((e as Error).message); }
  };
  const pg = paged('outc', OUTK);
  return <>
    <PageHeader t="Call outcomes" sub="The results a rep can save, and what each one does. Changes apply to the next results; dates already set are not recalculated."
      acts={<button className="btn pri" onClick={() => setForm(blank())}><Icon n="plus" s={15} />New outcome</button>} />
    <table className="ptbl" data-outcomes>
      <thead><tr><th>Outcome</th><th>Counts as attempt</th><th>Counts as connect</th><th>Creates a lead</th><th>Called again</th><th>Also stops</th><th>Needs follow-up</th><th>Status</th><th></th></tr></thead>
      <tbody>{pg.rows.map(k => { const d = OUT[k]; return <tr key={k} data-outcome={k}>
        <td><b>{k}</b>{d.lead ? <> <Pill t="Lead" cls="green" /></> : null}<br /><span className="sm muted">{d.hint}</span></td>
        <td>{d.countsAsAttempt ? 'Yes' : 'No'}</td>
        <td data-connect={d.connect ? 'yes' : 'no'}>{d.connect ? 'Yes' : 'No'}</td>
        <td data-lead={d.lead ? 'yes' : 'no'}>{d.lead ? 'Yes' : 'No'}</td>
        <td className="sm">{waitOf(d)}</td>
        <td className="sm">{PROP_TXT[d.propagates]}</td>
        <td>{d.needsFollowUp ? 'Yes' : 'No'}</td>
        <td>{d.active ? <Pill t="Active" cls="green dot" /> : <Pill t="Inactive" cls="red" />}</td>
        <td className="text-right whitespace-nowrap">
          <button className="btn sec sm" onClick={() => setForm({ ...d, name: k, edit: true })}><Icon n="edit" s={14} />Edit</button>{' '}
          <button className="btn sec sm" onClick={() => toggle(k)} data-toggle={k}>{d.active ? 'Deactivate' : 'Activate'}</button>
        </td>
      </tr>; })}</tbody>
    </table>
    {pg.pager}
    <p className="sm muted mt-[8px]" data-connect-note>Counts as connect and Creates a lead feed Reports (Connects, New Leads). Leads: Working on Plans and Interested, agreed with Andrew. Connects: every outcome where someone answered, a proposal pending with Andrew.</p>
    {form ? <OutcomeModal form={form} onClose={() => setForm(null)} /> : null}
  </>;
}

function OutcomeModal({ form: f0, onClose }: { form: Form; onClose: () => void }) {
  const [f, setF] = useState<Form>(f0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (p: Partial<Form>) => setF(x => ({ ...x, ...p }));
  const yn = (k: keyof OutcomeDef, label: string) => <><label className="lbl">{label}</label><div className="segs"><button type="button" className="seg" aria-pressed={!!f[k]} onClick={() => set({ [k]: true } as Partial<Form>)} data-yes={k}>Yes</button><button type="button" className="seg" aria-pressed={!f[k]} onClick={() => set({ [k]: false } as Partial<Form>)} data-no={k}>No</button></div></>;
  const save = async () => {
    setBusy(true); setError('');
    const { name, edit, ...fields } = f;
    try {
      await post({ action: edit ? 'update' : 'create', name, ...fields });
      await loadState(true); toast(`${name} saved`); bump(); onClose();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };
  return <div className="scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal wide" role="dialog" aria-label={f.edit ? 'Edit outcome' : 'New outcome'}>
    <div className="mh"><div><b>{f.edit ? `Edit ${f.name}` : 'New outcome'}</b><small>{f.edit ? 'The name stays: the call history keeps it.' : 'It appears in the rep’s form as soon as it is saved.'}</small></div><button className="x" onClick={onClose} aria-label="Close"><Icon n="x" s={16} /></button></div>
    <div className="mb">
      <div className="frow">
        <div><label className="lbl" htmlFor="o-name">Name <em>*</em></label><input className="fld" id="o-name" value={f.name} disabled={f.edit} maxLength={60} onChange={e => set({ name: e.target.value })} /></div>
        <div><label className="lbl" htmlFor="o-hint">Short help for the rep</label><input className="fld" id="o-hint" value={f.hint} maxLength={120} onChange={e => set({ hint: e.target.value })} /></div>
      </div>
      <div className="frow">
        <div><label className="lbl" htmlFor="o-days">Called again after (days, at least 1)</label><input className="fld" id="o-days" type="number" min={1} value={f.recallDays} onChange={e => set({ recallDays: Number(e.target.value) })} /></div>
        <div><label className="lbl">Kind of days</label><div className="segs"><button type="button" className="seg" aria-pressed={!f.calendarDays} onClick={() => set({ calendarDays: false })}>Business days</button><button type="button" className="seg" aria-pressed={f.calendarDays} onClick={() => set({ calendarDays: true })}>Calendar days</button></div></div>
      </div>
      {yn('countsAsAttempt', 'Counts as an attempt')}
      {yn('needsFollowUp', 'The rep must set a follow-up date and time')}
      <label className="lbl">Also stops</label>
      <div className="segs">{(Object.keys(PROP_TXT) as OutcomeDef['propagates'][]).map(p => <button key={p} type="button" className="seg" aria-pressed={f.propagates === p} onClick={() => set({ propagates: p })} data-prop={p}>{PROP_TXT[p]}</button>)}</div>
      {yn('connect', 'Counts as a connect: someone answered (Reports)')}
      {yn('lead', 'Creates a lead: hands the property to AB sales as a Potential Lead (Reports: New Leads)')}
      {yn('final', 'Never called again')}
      {yn('sameRep', 'Comes back to the same rep')}
      <label className="lbl">Property status it gives</label>
      <div className="segs">{STATUSES.map(s => <button key={s} type="button" className="seg" aria-pressed={f.status === s} onClick={() => set({ status: s })}>{s}</button>)}</div>
      <label className="lbl">Kind of call</label>
      <div className="segs">{([['none', 'Nobody answered'], ['con', 'Answered, no conversation'], ['conv', 'Conversation']] as const).map(([g, l]) => <button key={g} type="button" className="seg" aria-pressed={f.group === g} onClick={() => set({ group: g })}>{l}</button>)}</div>
      {error ? <div className="note mt-[12px] text-r500" role="alert">{error}</div> : null}
    </div>
    <div className="mf"><button className="btn sec" onClick={onClose}>Cancel</button><button className="btn pri" onClick={save} disabled={busy || !f.name.trim()}>{f.edit ? 'Save' : 'Create outcome'}</button></div>
  </div></div>;
}
