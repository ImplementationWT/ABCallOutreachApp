import { getDb } from '@/lib/db/mongodb';
import { resetPassword } from '@/lib/db/auth-core';
import { requirePerm } from '@/lib/auth/session';

/* POST /api/users/:id/password: a new temporary password for that user (returned once); they must
 * choose their own at the next sign-in. Needs the Users permission; your own password is changed in Account. */
export async function POST(_req: Request, ctx: RouteContext<'/api/users/[id]/password'>) {
  const a = await requirePerm('users.manage');
  if ('res' in a) return a.res;
  const { id } = await ctx.params;
  if (id === a.user._id) return Response.json({ error: 'Change your own password in Account' }, { status: 400 });
  const r = await resetPassword(await getDb(), id);
  return r.ok ? Response.json(r) : Response.json({ error: r.error }, { status: 404 });
}
