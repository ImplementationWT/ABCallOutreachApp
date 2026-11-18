'use client';
/* Account modal: who is signed in and change the password (log out is in the user menu). */
import { useEffect, useState } from 'react';
import { MIN_PASSWORD } from '@/lib/db/auth-rules';

export function AccountPanel() {
  const [user, setUser] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setUser(d.username)).catch(() => {}); }, []);

  const change = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    const next = String(f.get('next') || ''), confirm = String(f.get('confirm') || '');
    if (next !== confirm) { setMsg({ ok: false, t: 'The new password and its confirmation do not match' }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current: f.get('current'), next }) });
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload on purpose (fresh session and state)
      if (res.status === 401) { location.href = '/login'; return; }
      const d = await res.json().catch(() => ({}));
      if (res.ok) { form.reset(); setMsg({ ok: true, t: 'Password changed. Other sessions of this user were closed.' }); }
      else setMsg({ ok: false, t: d.error || 'Could not change the password' });
    } catch { setMsg({ ok: false, t: 'Could not reach the server' }); }
    setBusy(false);
  };

  return <>
    <div className="nextstep grey"><span className="ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg></span>
      <div><b>Signed in as {user || '…'}</b><small>The session lasts 7 days on this browser.</small></div></div>
    <form onSubmit={change}>
      <h3 className="text-[15.5px]">Change password</h3>
      <label className="lbl" htmlFor="pw-current">Current password <em>*</em></label>
      <input className="fld" id="pw-current" name="current" type="password" autoComplete="current-password" required />
      <div className="frow">
        <div><label className="lbl" htmlFor="pw-next">New password <em>*</em></label><input className="fld" id="pw-next" name="next" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required /></div>
        <div><label className="lbl" htmlFor="pw-confirm">Repeat the new password <em>*</em></label><input className="fld" id="pw-confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required /></div>
      </div>
      <p className="sm muted mt-[6px]">At least {MIN_PASSWORD} characters.</p>
      {msg ? <div className={`note mt-[10px] ${msg.ok ? 'text-g600' : 'text-r500'}`} role="status">{msg.t}</div> : null}
      <div className="flex justify-end mt-[14px]"><button className="btn pri" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button></div>
    </form>
  </>;
}
