'use client';
/* Choose your own password (after a temporary one), in the login's style. */
import { useState } from 'react';
import { MIN_PASSWORD } from '@/lib/db/auth-rules';
import { homeOf, type Me } from '@/lib/auth/roles';
import { safeNext } from './LoginForm';

export function SetPasswordForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get('next') !== f.get('confirm')) { setError('The new password and its confirmation do not match'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current: f.get('current'), next: f.get('next') }) });
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload to the login
      if (res.status === 401) { location.href = '/login'; return; }
      if (res.ok) {
        const me = (await (await fetch('/api/auth/me')).json()) as Me;
        location.href = safeNext(new URLSearchParams(location.search).get('next'), homeOf(me));
        return;
      }
      setError((await res.json().catch(() => ({}))).error || 'Could not change the password');
    } catch { setError('Could not reach the server'); }
    setBusy(false);
  };
  return <div className="main h-full">
    <div className="login max-w-[440px]">
      <h1>Choose your password</h1>
      <p>You signed in with a temporary password. Choose your own to continue; at least {MIN_PASSWORD} characters.</p>
      <form className="card p-[18px_20px]" onSubmit={submit}>
        <label className="lbl mt-0" htmlFor="pw-current">Temporary password</label>
        <input className="fld" id="pw-current" name="current" type="password" autoComplete="current-password" required autoFocus />
        <label className="lbl" htmlFor="pw-next">New password</label>
        <input className="fld" id="pw-next" name="next" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
        <label className="lbl" htmlFor="pw-confirm">Repeat the new password</label>
        <input className="fld" id="pw-confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
        {error ? <div className="note mt-[12px] text-r500" role="alert">{error}</div> : null}
        <button className="btn pri mt-[16px] w-full justify-center h-[42px]" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'}</button>
      </form>
    </div>
  </div>;
}
