import { getDb } from '@/lib/db/mongodb';
import { updateUser } from '@/lib/db/auth-core';
import { requirePerm } from '@/lib/auth/session';

/* PATCH /api/users/:id { name, role, perms, person, active }: needs the Users permission. */
export async function PATCH(req: Request, ctx: RouteContext<'/api/users/[id]'>) {
  const a = await requirePerm('users.manage');
  if ('res' in a) return a.res;
  const { id } = await ctx.params;
  const r = await updateUser(await getDb(), id, await req.json().catch(() => ({})), a.user._id);
  return r.ok ? Response.json(r) : Response.json({ error: r.error }, { status: r.error === 'User not found' ? 404 : 400 });
}
