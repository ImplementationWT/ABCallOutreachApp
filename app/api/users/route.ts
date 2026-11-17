import { getDb } from '@/lib/db/mongodb';
import { createUser, listUsers } from '@/lib/db/auth-core';
import { requirePerm } from '@/lib/auth/session';

/* GET /api/users: every user (never passwords). POST /api/users: new user with a temporary
 * password, returned once. Both need the Users permission. */
export async function GET() {
  const a = await requirePerm('users.manage');
  if ('res' in a) return a.res;
  return Response.json({ users: await listUsers(await getDb()) });
}
export async function POST(req: Request) {
  const a = await requirePerm('users.manage');
  if ('res' in a) return a.res;
  const r = await createUser(await getDb(), await req.json().catch(() => ({})));
  return r.ok ? Response.json(r, { status: 201 }) : Response.json({ error: r.error }, { status: 400 });
}
