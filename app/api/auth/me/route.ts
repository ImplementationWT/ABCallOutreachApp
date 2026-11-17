import { meOf } from '@/lib/db/auth-core';
import { currentUserDoc, unauthorized } from '@/lib/auth/session';

/* GET /api/auth/me: the signed-in user, role and permissions. */
export async function GET() {
  const u = await currentUserDoc().catch(() => null);
  return u ? Response.json(meOf(u)) : unauthorized();
}
