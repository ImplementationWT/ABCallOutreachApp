'use client';
/* ===== SIGN IN ===== loginPage() in artifact/app.html: the demo's user picker. */
import { CTS, DAY, PEO, PROPS, REPS, campName, campOf, docOf, fmtT, fmtWD, getClock, TODAY, type RepKey } from '@/lib/domain';
import { on } from '@/lib/state/actions';
import { Avatar, Icon } from '@/components/ui';

function RepCard({ r }: { r: RepKey }) {
  const d = DAY[r], cp = campOf(r);
  const st = d.st === 'started' ? `Calling since ${fmtT(d.startedAt!)}, ${docOf(r).length} of ${d.list.length} documented` : d.st === 'ended' ? 'Workday ended' : `${d.list.length} contacts reserved, not started`;
  return <button className="lcard" {...on('signin', r)}><Avatar k={r} /><div><b>{PEO[r].n}</b><small>Sales rep, {cp ? campName(cp) : 'not scheduled'}</small><small>{st}</small></div><span className="go2"><Icon n="chr" s={18} /></span></button>;
}

export function SignIn() {
  return <div className="login">
    <h1>Sign in to the Call Center</h1>
    <p>Each rep has a login of their own, with no monday seat. In the demo, pick who you are. The rep lands in their workspace; Andrew lands in the manager view.</p>
    <div className="lsec">Sales reps</div>
    <div className="lgrid">{REPS.map(r => <RepCard key={r} r={r} />)}</div>
    <div className="lsec">Management</div>
    <div className="lgrid"><button className="lcard" {...on('signin', 'and')}><Avatar k="and" /><div><b>Andrew Vaitkevicius</b><small>Outreach Manager: campaigns, rules, the day by rep, hand-offs and performance</small></div><span className="go2"><Icon n="chr" s={18} /></span></button></div>
    <p className="sm muted mt-[22px]">Demo data is fictional: about {PROPS.length} properties and {CTS.length} contacts across the four fire rebuild audiences. Today is {fmtWD(TODAY)}, {fmtT(getClock())}.</p>
  </div>;
}
