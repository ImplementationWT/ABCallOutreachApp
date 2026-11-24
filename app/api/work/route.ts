import { getDb } from '@/lib/db/mongodb';
import { endWorkday, reassign, reopenWorkday, saveResult } from '@/lib/db/work';
import { HttpError, LOCAL_TIME } from '@/lib/db/server-state';
import { forbidden, requirePerm } from '@/lib/auth/session';
import { REP_PEOPLE, mayActFor } from '@/lib/auth/roles';
import type { RepKey } from '@/lib/domain';

/* POST /api/work { action, rep, now: 'YYYY-MM-DDTHH:MM' (the browser's local time), ... }
 *   save      { ct, out, note, fu }   result of a call on a contact of the rep's list today
 *   endday / reopenday                the rep's workday
 *   reassign  { to, n }               Outreach Manager: change (contacts of `rep` move to `to`)
 * Every write of a rep goes through here or /api/allocate; POST /api/state does not take them. */
export async function POST(req: Request) {
  const a = await requirePerm('rep.workspace');
  if ('res' in a) return a.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const now = String(b.now ?? ''), rep = String(b.rep ?? '') as RepKey;
  if (!LOCAL_TIME.test(now)) return Response.json({ error: 'Invalid time' }, { status: 400 });
  const me = { perms: a.user.perms, person: a.user.person ?? null };
  if (!mayActFor(me, rep)) return forbidden();
  try {
    const db = await getDb();
    switch (b.action) {
      case 'save': return Response.json(await saveResult(db, now, rep, { ct: String(b.ct ?? ''), out: String(b.out ?? ''), note: typeof b.note === 'string' ? b.note : '', fu: typeof b.fu === 'string' ? b.fu : null }));
      case 'endday': return Response.json(await endWorkday(db, now, rep));
      case 'reopenday': return Response.json(await reopenWorkday(db, now, rep));
      case 'reassign': {
        if (!a.user.perms.includes('mgr.manage')) return forbidden();
        const to = String(b.to ?? '') as RepKey;
        if (!(REP_PEOPLE as readonly string[]).includes(to)) return Response.json({ error: 'Unknown rep' }, { status: 400 });
        return Response.json(await reassign(db, now, rep, to, Math.max(0, Number(b.n) || 0)));
      }
      default: return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error('POST /api/work failed', e);
    return Response.json({ error: 'Could not save' }, { status: 500 });
  }
}
