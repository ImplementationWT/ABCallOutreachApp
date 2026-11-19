'use client';
/* The login screen (AuthLayout: brand panel + form). */
import { useState } from 'react';
import { homeOf, type Me } from '@/lib/auth/roles';
import { AuthError, AuthField, AuthLayout, AuthSubmit } from './AuthLayout';

/** A local path to go back to after signing in, or `home`. */
export const safeNext = (n: string | null, home = '/') => (n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/login') && !n.startsWith('/password') ? n : home);

export function LoginForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: f.get('username'), password: f.get('password') }) });
      if (res.ok) {
        const { me } = (await res.json()) as { me: Me };
        const next = new URLSearchParams(location.search).get('next');
        // First sign-in or after a reset: choose a password first
        location.href = me.mustChange ? '/password' + (next ? '?next=' + encodeURIComponent(next) : '') : safeNext(next, homeOf(me));
        return;
      }
      setError((await res.json().catch(() => ({}))).error || 'Could not sign in');
    } catch { setError('Could not reach the server'); }
    setBusy(false);
  };
  return <AuthLayout title="Welcome back" sub="Sign in with the user and password your manager gave you.">
    <form className="auth-form" onSubmit={submit}>
      <AuthField id="username" label="User" icon="user" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Your user name" autoFocus required />
      <AuthField id="password" label="Password" icon="lock" type="password" autoComplete="current-password" placeholder="Your password" required />
      <AuthError t={error} />
      <AuthSubmit busy={busy} label="Sign in" busyLabel="Signing in…" />
    </form>
    <p className="auth-help">Forgot your password? Ask your manager to reset it: you get a temporary one and choose your own when you sign in.</p>
  </AuthLayout>;
}
