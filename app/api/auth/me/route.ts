import { currentUser, unauthorized } from '@/lib/auth/session';

/* GET /api/auth/me: the signed-in user. */
export async function GET() {
  const user = await currentUser().catch(() => null);
  return user ? Response.json({ user }) : unauthorized();
}
