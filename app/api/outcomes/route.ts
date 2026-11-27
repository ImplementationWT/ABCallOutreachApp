import { getDb } from '@/lib/db/mongodb';
import { createOutcome, updateOutcome } from '@/lib/db/outcomes';
import { HttpError } from '@/lib/db/server-state';
import { currentUserDoc, forbidden, unauthorized } from '@/lib/auth/session';
import { isOutreachManager } from '@/lib/auth/roles';

/* POST /api/outcomes: the call outcome catalog, the Outreach Manager or an administrator (mgr.manage).
 *   { action: 'create', name, ...fields }   new outcome (name unique, recall days >= 1)
 *   { action: 'update', name, ...fields }   edit, or { active: false } to deactivate
 * The catalog is read with the rest of the state (GET /api/state). */
export async function POST(req: Request) {
  const user = await currentUserDoc();
  if (!user) return unauthorized();
  if (!isOutreachManager(user)) return forbidden();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { action, name, ...fields } = b;
  try {
    const db = await getDb();
    if (action === 'create') return Response.json({ ok: true, outcome: await createOutcome(db, String(name ?? ''), fields) }, { status: 201 });
    if (action === 'update') return Response.json({ ok: true, outcome: await updateOutcome(db, String(name ?? ''), fields) });
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error('POST /api/outcomes failed', e);
    return Response.json({ error: 'Could not save the outcome' }, { status: 500 });
  }
}
