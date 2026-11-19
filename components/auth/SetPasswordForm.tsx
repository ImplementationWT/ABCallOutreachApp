'use client';
/* Choose your own password (after a temporary one), in the login's frame. */
import { useState } from 'react';
import { MIN_PASSWORD } from '@/lib/db/auth-rules';
import { homeOf, type Me } from '@/lib/auth/roles';
import { safeNext } from './LoginForm';
import { AIcon, AuthError, AuthField, AuthLayout, AuthSubmit } from './AuthLayout';

export function SetPasswordForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ next: '', confirm: '' });
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
  const checks = [
    { ok: pw.next.length >= MIN_PASSWORD, t: `At least ${MIN_PASSWORD} characters` },
    { ok: !!pw.next && pw.next === pw.confirm, t: 'Both passwords match' },
  ];
  return <AuthLayout title="Choose your password" sub="You signed in with a temporary password. Choose your own to continue.">
    <form className="auth-form" onSubmit={submit}>
      <AuthField id="pw-current" name="current" label="Temporary password" icon="key" type="password" autoComplete="current-password" required autoFocus />
      <AuthField id="pw-next" name="next" label="New password" icon="lock" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
      <AuthField id="pw-confirm" name="confirm" label="Repeat the new password" icon="lock" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
      <ul className="auth-checks">{checks.map(c => <li key={c.t} className={c.ok ? 'ok' : ''}><AIcon n="check" s={14} />{c.t}</li>)}</ul>
      <AuthError t={error} />
      <AuthSubmit busy={busy} label="Save and continue" busyLabel="Saving…" />
    </form>
  </AuthLayout>;
}
