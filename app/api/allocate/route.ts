import { getDb } from '@/lib/db/mongodb';
import { allocateMore, allocateMorning, allocateStart } from '@/lib/db/allocate';
import { LOCAL_TIME } from '@/lib/db/server-state';
import { requirePerm, forbidden } from '@/lib/auth/session';
import { mayActFor } from '@/lib/auth/roles';
import type { RepKey } from '@/lib/domain';

/* POST /api/allocate { kind: 'morning' | 'start' | 'more', now: 'YYYY-MM-DDTHH:MM' (the browser's local time), rep? }
 * The allocation runs on the server, one at a time (lib/db/allocate.ts), so no contact is given to
 * two reps. A rep without Outreach Manager can only ask for their own list. */

export async function POST(req: Request) {
  const a = await requirePerm('rep.workspace');
  if ('res' in a) return a.res;
  const body = (await req.json().catch(() => ({}))) as { kind?: string; now?: string; rep?: string };
  if (!body.now || !LOCAL_TIME.test(body.now)) return Response.json({ error: 'Invalid time' }, { status: 400 });
  try {
    const db = await getDb();
    if (body.kind === 'morning') return Response.json(await allocateMorning(db, body.now));
    if (body.kind === 'more' || body.kind === 'start') {
      const rep = String(body.rep) as RepKey;
      if (!mayActFor({ perms: a.user.perms, person: a.user.person ?? null }, rep)) return forbidden();
      return Response.json(await (body.kind === 'start' ? allocateStart : allocateMore)(db, body.now, rep));
    }
    return Response.json({ error: 'Unknown kind' }, { status: 400 });
  } catch (e) {
    console.error('POST /api/allocate failed', e);
    return Response.json({ error: 'Could not allocate' }, { status: 500 });
  }
}
