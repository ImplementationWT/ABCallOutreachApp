'use client';
/* MODALS of the Outreach Manager (artifact/app.html): replist, reassign, newcamp. */
import type React from 'react';
import { AUDK, AUDS, CALLS, DAY, P, PEO, PRANK, PRI, REPS, first, listOf, openOf, ownerOf, priOf, type Contact, type RepKey } from '@/lib/domain';
import { inp, on } from '@/lib/state/actions';
import { S, type Modal } from '@/lib/state/store';
import { DateField, OutPill, Pill, PrTag } from '@/components/ui';
import { AccountPanel } from '@/components/auth/AccountPanel';

export type ModalDef = { t: string; s?: string; wide?: boolean; body: React.ReactNode; foot?: React.ReactNode };

export const MODALS: Record<string, (m: Modal) => ModalDef> = {
  /* Not in the artifact: the signed-in user's account (change password, log out). */
  account: () => ({ t: 'Account', s: 'Your user for the Call Center', body: <AccountPanel /> }),
  replist: m => {
    const r = m.r as RepKey, l = listOf(r);
    return {
      t: `${PEO[r].n}: today’s list`, s: `${l.length} contacts reserved, in the order the engine gave them`, wide: true,
      body: <div className="rows">{l.map((c: Contact) => {
        const p = P(c.prop), dn = DAY[r].done[c.k], cl = dn && CALLS.find(x => x.id === dn);
        return <div key={c.k} className="row grid-cols-[40px_minmax(0,1.3fr)_minmax(0,1fr)_170px]">
          <span><PrTag pr={priOf(c)} sm /></span>
          <div className="t"><b>{c.n}</b><small>{p.addr}, {AUDS[p.aud].s}</small></div>
          <div className="cell">{PRI[priOf(c)].n}<small>{ownerOf(c) === r ? 'Own, goes back to ' + first(r) : 'Any rep'}</small></div>
          <div className="cell">{cl ? <OutPill o={cl.out} /> : c.stop ? <Pill t="Removed" cls="red" /> : <Pill t="To call" />}</div>
        </div>;
      })}</div>,
      foot: <button className="btn sec" {...on('mclose')}>Close</button>,
    };
  },
  reassign: m => {
    const r = m.r as RepKey;
    const open = openOf(r).sort((a, b) => PRANK[priOf(b)] - PRANK[priOf(a)]);
    const movable = open.filter(c => ownerOf(c) !== r);
    m.n = Math.min(m.n, movable.length);
    return {
      t: `Reassign from ${PEO[r].n}`, s: 'Contacts not called yet move to another rep, with the whole property. Own follow-ups stay with their rep.',
      body: <>
        <label className="lbl">Move to</label>
        <div className="segs">{REPS.filter(x => x !== r).map(x => <button key={x} className="seg" {...on('rato', x)} aria-pressed={m.to === x}>{PEO[x].n}</button>)}</div>
        <label className="lbl">How many contacts</label>
        <div className="flex gap-[8px] items-center"><input className="numin" type="number" min={0} max={movable.length} defaultValue={m.n} {...inp('ran')} id="ran" /><span className="sm muted">of {movable.length} that can move (lowest priority first)</span></div>
      </>,
      foot: <><button className="btn sec" {...on('mclose')}>Cancel</button><button className="btn pri" {...on('radone')} disabled={!m.n}>Move {m.n} contacts</button></>,
    };
  },
  newcamp: m => ({
    t: 'New campaign', s: 'Date, audiences and reps. It allocates automatically that morning.',
    body: <>
      <label className="lbl">Date <em>*</em></label><div className="max-w-[300px]"><DateField k="campd" value={m.date} onSet={v => { S.modal!.date = v; }} /></div>
      <label className="lbl">Audiences <em>*</em></label><div className="tchips">{AUDK.map(a => <button key={a} className="tchip" {...on('ncaud', a)} aria-pressed={m.auds.includes(a)}>{AUDS[a].n}</button>)}</div>
      <label className="lbl">Reps <em>*</em></label><div className="tchips">{REPS.map(r => <button key={r} className="tchip" {...on('ncrep', r)} aria-pressed={m.reps.includes(r)}>{PEO[r].n}</button>)}</div>
      <label className="lbl">Goal per rep</label><div className="flex gap-[8px] items-center"><input className="numin" type="number" min={0} defaultValue={m.goal} {...inp('ncgoal')} id="ncgoal" /><span className="sm muted">potential leads, shown in the rep’s daily email</span></div>
    </>,
    foot: <><button className="btn sec" {...on('mclose')}>Cancel</button><button className="btn pri" {...on('ncsave')} disabled={!(m.date && m.auds.length && m.reps.length)}>Create campaign</button></>,
  }),
};
