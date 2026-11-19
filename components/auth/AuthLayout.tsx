'use client';
/* Shared frame of /login and /password: a brand panel on the left (hidden on narrow screens) and the form
 * on the right. The form column keeps the `.login` class the e2e specs look for. */
import { useState } from 'react';
import { brand } from '@/lib/state/store';

const SV = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const PATHS: Record<string, string> = {
  headset: 'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  key: 'M15.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM12 11v10M12 17h3M12 20h2',
  lock:'M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeoff: 'M17.94 17.94A10.1 10.1 0 0 1 12 19c-6.4 0-10-7-10-7a18.4 18.4 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24M2 2l20 20',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  check: 'M20 6 9 17l-5-5',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  repeat: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  hand: 'M16 11h4a2 2 0 0 1 0 4h-1M2 11h3l4-4a2 2 0 0 1 3 3l-1 1h5M2 19h7l5-4',
};
export const AIcon = ({ n, s = 18 }: { n: string; s?: number }) => <svg {...SV} width={s} height={s} aria-hidden="true"><path d={PATHS[n]} /></svg>;

const POINTS = [
  { i: 'sun', b: 'Your list is ready every morning', t: 'Contacts are allocated to each rep before the day starts.' },
  { i: 'repeat', b: 'Follow-ups come back on time', t: 'To the same rep, on the date that was set.' },
  { i: 'hand', b: 'Interested owners go to sales', t: 'One click hands the lead to the AB team.' },
];

export function AuthLayout({ title, sub, children }: { title: string; sub: React.ReactNode; children: React.ReactNode }) {
  return <div className="main h-full auth">
    <aside className="auth-side">
      <div className="auth-brand"><span className="auth-mark"><AIcon n="headset" s={20} /></span><div><b>{brand.emp}</b><small>Call Center</small></div></div>
      <div className="auth-pitch">
        <h2>Every owner called, on the right day.</h2>
        <ul>{POINTS.map(p => <li key={p.b}><span><AIcon n={p.i} s={17} /></span><div><b>{p.b}</b><small>{p.t}</small></div></li>)}</ul>
      </div>
      <small className="auth-foot">{brand.emp} · Outbound calls</small>
    </aside>
    <section className="auth-main">
      <div className="login">
        <div className="auth-brand auth-brand-sm"><span className="auth-mark"><AIcon n="headset" s={20} /></span><div><b>{brand.emp}</b><small>Call Center</small></div></div>
        <h1>{title}</h1>
        <p>{sub}</p>
        {children}
      </div>
    </section>
  </div>;
}

/** A labelled input with a leading icon. Password fields get show / hide and a Caps Lock warning. */
export function AuthField({ id, label, icon, type = 'text', ...rest }: { id: string; label: string; icon: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const pw = type === 'password';
  const keys = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.('CapsLock') ?? false);
  return <div className="af">
    <label className="lbl" htmlFor={id}>{label}</label>
    <div className="af-box">
      <span className="af-ic"><AIcon n={icon} s={17} /></span>
      <input className="fld" id={id} name={rest.name ?? id} type={pw && show ? 'text' : type} onKeyDown={pw ? keys : undefined} onKeyUp={pw ? keys : undefined} onBlur={() => setCaps(false)} {...rest} />
      {pw ? <button type="button" className="af-eye" onClick={() => setShow(v => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}><AIcon n={show ? 'eyeoff' : 'eye'} s={17} /></button> : null}
    </div>
    {pw && caps ? <small className="af-caps"><AIcon n="alert" s={13} />Caps Lock is on</small> : null}
  </div>;
}

export const AuthError = ({ t }: { t: string }) => t ? <div className="auth-err" role="alert"><AIcon n="alert" s={16} /><span>{t}</span></div> : null;

export const AuthSubmit = ({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) =>
  <button className="btn pri auth-btn" disabled={busy} aria-busy={busy}>{busy ? <><span className="auth-spin" aria-hidden="true" />{busyLabel}</> : label}</button>;
