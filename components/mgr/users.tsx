'use client';
/* Outreach Manager > Users (not in the artifact; needs the Users permission).
 * Create users with a role and permissions, change them, deactivate, and reset passwords. Temporary
 * passwords are shown once; the user picks their own at the next sign-in. */
import { useCallback, useEffect, useState } from 'react';
import { PERMS, PEOPLE, ROLES, ROLE_KEYS, type Perm, type Role } from '@/lib/auth/roles';
import { PEO, fmtDT, isoT, type PersonKey } from '@/lib/domain';
import { getMe } from '@/lib/state/auth';
import { toast } from '@/lib/state/store';
import { Icon, PageHeader, Pill } from '@/components/ui';

type User = { _id: string; username: string; name: string; role: Role; perms: Perm[]; person: string | null; active: boolean; mustChange: boolean; locked: boolean; createdAt: string; lastLoginAt: string | null };
type Form = { id?: string; username: string; name: string; role: Role; perms: Perm[]; person: string | null; active: boolean };
const ROLE_TONE: Record<Role, string> = { admin: 'ink', manager: 'blue', rep: 'green', viewer: '' };
const personName = (p: string | null) => p ? PEO[p as PersonKey]?.n || p : 'Nobody';

async function api(url: string, method = 'GET', body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
const status = (u: User) => !u.active ? <Pill t="Deactivated" cls="red" /> : u.locked ? <Pill t="Locked for a few minutes" cls="amber" /> : u.mustChange ? <Pill t="Must set a password" cls="amber dot" /> : <Pill t="Active" cls="green dot" />;

export function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [secret, setSecret] = useState<{ user: string; password: string; created: boolean } | null>(null);
  const reload = useCallback(() => api('/api/users').then(d => { setUsers(d.users); setError(''); }).catch(e => setError(e.message)), []);
  useEffect(() => { void reload(); }, [reload]);
  const me = getMe();

  const reset = async (u: User) => {
    if (!confirm(`Reset the password of ${u.name}? Their sessions close and they must set a new password.`)) return;
    try { const d = await api(`/api/users/${u._id}/password`, 'POST'); setSecret({ user: u.username, password: d.password, created: false }); void reload(); }
    catch (e) { toast((e as Error).message); }
  };

  return <>
    <PageHeader t="Users" sub="Who can sign in, with which role and permissions. A temporary password is shown only once; the person sets their own at the next sign-in."
      acts={<button className="btn pri" onClick={() => setForm({ username: '', name: '', role: 'rep', perms: [...ROLES.rep.perms], person: null, active: true })}><Icon n="plus" s={15} />New user</button>} />
    {error ? <div className="note text-r500 mb-[12px]">{error}</div> : null}
    {!users ? <div className="empty">Loading users…</div> :
      <table className="ptbl">
        <thead><tr><th>User</th><th>Role</th><th>Works as</th><th>Permissions</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead>
        <tbody>{users.map(u => <tr key={u._id} data-user={u.username}>
          <td><b>{u.name}</b><br /><span className="sm muted">{u.username}{u._id === me?.id ? ' (you)' : ''}</span></td>
          <td><Pill t={ROLES[u.role].n} cls={ROLE_TONE[u.role]} /></td>
          <td className="sm">{personName(u.person)}</td>
          <td className="sm">{u.perms.length === PERMS.length ? 'All' : u.perms.map(p => PERMS.find(x => x[0] === p)![1]).join(', ') || 'None'}</td>
          <td>{status(u)}</td>
          <td className="sm muted">{u.lastLoginAt ? fmtDT(isoT(new Date(u.lastLoginAt))) : 'Never'}</td>
          <td className="text-right whitespace-nowrap">
            <button className="btn sec sm" onClick={() => setForm({ id: u._id, username: u.username, name: u.name, role: u.role, perms: u.perms, person: u.person, active: u.active })}><Icon n="edit" s={14} />Edit</button>{' '}
            {u._id !== me?.id ? <button className="btn sec sm" onClick={() => reset(u)}><Icon n="key" s={14} />Reset password</button> : null}
          </td>
        </tr>)}</tbody>
      </table>}
    <div className="grid2 mt-[14px]">
      <div className="card"><h3><Icon n="shield" s={16} />Roles</h3>{ROLE_KEYS.map(r => <div key={r} className="mrow"><Pill t={ROLES[r].n} cls={ROLE_TONE[r]} /><span className="sm muted">{ROLES[r].perms.length === PERMS.length ? 'Everything' : ROLES[r].perms.map(p => PERMS.find(x => x[0] === p)![1]).join(', ')}</span></div>)}
        <p className="sm muted mt-[8px]">The role presets the permissions; each user’s permissions can be adjusted one by one.</p></div>
      <div className="card"><h3><Icon n="info" s={16} />Good to know</h3><ul className="sm m-0 pl-[18px]">
        <li>A user linked to Maya, Daniel or Priya without Outreach Manager works only in that rep’s own list.</li>
        <li>Deactivating a user closes their sessions at once.</li>
        <li>New sales reps for the allocation engine are added with the team setup; here you link a user to an existing rep.</li>
      </ul></div>
    </div>
    {form ? <UserModal form={form} onClose={() => setForm(null)} onSaved={(pw, username) => { setForm(null); if (pw) setSecret({ user: username, password: pw, created: true }); void reload(); }} /> : null}
    {secret ? <div className="scrim" onClick={e => { if (e.target === e.currentTarget) setSecret(null); }}><div className="modal" role="dialog" aria-label="Temporary password">
      <div className="mh"><div><b>{secret.created ? 'User created' : 'Password reset'}</b><small>Give this temporary password to {secret.user}. It is not shown again.</small></div><button className="x" onClick={() => setSecret(null)} aria-label="Close"><Icon n="x" s={16} /></button></div>
      <div className="mb"><div className="kv"><small>User</small><b>{secret.user}</b></div><div className="kv mt-[8px]"><small>Temporary password</small><b className="text-[20px] tracking-[.06em]" data-temp-password>{secret.password}</b></div>
        <p className="sm muted mt-[10px]">At the next sign-in they will be asked to choose their own password.</p></div>
      <div className="mf"><button className="btn sec" onClick={() => { void navigator.clipboard?.writeText(secret.password); toast('Password copied'); }}>Copy</button><button className="btn pri" onClick={() => setSecret(null)}>Done</button></div>
    </div></div> : null}
  </>;
}

function UserModal({ form: f0, onClose, onSaved }: { form: Form; onClose: () => void; onSaved: (password: string | null, username: string) => void }) {
  const [f, setF] = useState<Form>(f0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const edit = !!f.id;
  const set = (p: Partial<Form>) => setF(x => ({ ...x, ...p }));
  const togglePerm = (p: Perm) => set({ perms: f.perms.includes(p) ? f.perms.filter(x => x !== p) : [...f.perms, p] });
  const save = async () => {
    setBusy(true); setError('');
    try {
      if (edit) { await api(`/api/users/${f.id}`, 'PATCH', { name: f.name, role: f.role, perms: f.perms, person: f.person, active: f.active }); toast(`${f.name} saved`); onSaved(null, f.username); }
      else { const d = await api('/api/users', 'POST', { username: f.username, name: f.name, role: f.role, perms: f.perms, person: f.person }); onSaved(d.password, d.user.username); }
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };
  return <div className="scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal wide" role="dialog" aria-label={edit ? 'Edit user' : 'New user'}>
    <div className="mh"><div><b>{edit ? `Edit ${f0.name}` : 'New user'}</b><small>{edit ? f.username : 'They get a temporary password to sign in the first time.'}</small></div><button className="x" onClick={onClose} aria-label="Close"><Icon n="x" s={16} /></button></div>
    <div className="mb">
      <div className="frow">
        <div><label className="lbl" htmlFor="u-name">Name <em>*</em></label><input className="fld" id="u-name" value={f.name} onChange={e => set({ name: e.target.value })} /></div>
        <div><label className="lbl" htmlFor="u-username">User name <em>*</em></label><input className="fld" id="u-username" value={f.username} disabled={edit} autoComplete="off" onChange={e => set({ username: e.target.value.toLowerCase() })} placeholder="e.g. jsmith" /></div>
      </div>
      <label className="lbl">Role <em>*</em></label>
      <div className="segs">{ROLE_KEYS.map(r => <button key={r} type="button" className="seg" aria-pressed={f.role === r} onClick={() => set({ role: r, perms: [...ROLES[r].perms] })}>{ROLES[r].n}</button>)}</div>
      <label className="lbl">Works as (for reps, their own call list)</label>
      <div className="segs"><button type="button" className="seg" aria-pressed={!f.person} onClick={() => set({ person: null })}>Nobody</button>{PEOPLE.filter(p => p !== 'off').map(p => <button key={p} type="button" className="seg" aria-pressed={f.person === p} onClick={() => set({ person: p })}>{PEO[p].n}</button>)}</div>
      <label className="lbl">Permissions</label>
      <div className="tchips">{PERMS.map(([p, n, d]) => <button key={p} type="button" className="tchip" title={d} aria-pressed={f.perms.includes(p)} onClick={() => togglePerm(p)} data-perm={p}>{n}</button>)}</div>
      {edit ? <><label className="lbl">Access</label><div className="segs"><button type="button" className="seg" aria-pressed={f.active} onClick={() => set({ active: true })}>Active</button><button type="button" className="seg" aria-pressed={!f.active} onClick={() => set({ active: false })}>Deactivated</button></div></> : null}
      {error ? <div className="note mt-[12px] text-r500" role="alert">{error}</div> : null}
    </div>
    <div className="mf"><span className="l">{f.perms.length} of {PERMS.length} permissions</span><button className="btn sec" onClick={onClose}>Cancel</button><button className="btn pri" onClick={save} disabled={busy || !f.name.trim() || !f.username.trim()}>{edit ? 'Save' : 'Create user'}</button></div>
  </div></div>;
}
