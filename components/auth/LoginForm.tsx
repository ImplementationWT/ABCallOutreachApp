'use client';
/* The login screen, in the artifact's style (.login, .card, .fld, .btn). */
import { useState } from 'react';
import { brand } from '@/lib/state/store';

const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/login') ? n : '/');

export function LoginForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: f.get('username'), password: f.get('password') }) });
      if (res.ok) { location.href = safeNext(new URLSearchParams(location.search).get('next')); return; }
      setError((await res.json().catch(() => ({}))).error || 'Could not sign in');
    } catch { setError('Could not reach the server'); }
    setBusy(false);
  };
  return <div className="main h-full">
    <div className="login max-w-[440px]">
      <div className="brand mb-[22px]">
        <div className="mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" /></svg></div>
        <div><b>{brand.emp}</b><small>Call Center</small></div>
      </div>
      <h1>Sign in</h1>
      <p>Enter your user and password to open the Call Center.</p>
      <form className="card p-[18px_20px]" onSubmit={submit}>
        <label className="lbl mt-0" htmlFor="username">User</label>
        <input className="fld" id="username" name="username" autoComplete="username" autoFocus required />
        <label className="lbl" htmlFor="password">Password</label>
        <input className="fld" id="password" name="password" type="password" autoComplete="current-password" required />
        {error ? <div className="note mt-[12px] text-r500" role="alert">{error}</div> : null}
        <button className="btn pri mt-[16px] w-full justify-center h-[42px]" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  </div>;
}
