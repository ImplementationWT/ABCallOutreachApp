import { connection } from 'next/server';
import { pingDb } from '@/lib/db/mongodb';

/* GET /api/health/db: checks the MongoDB connection at request time (never during the build). */
export async function GET() {
  await connection();
  try {
    return Response.json({ ok: true, ...(await pingDb()) });
  } catch (e) {
    console.error('MongoDB health check failed', e);
    return Response.json({ ok: false, error: e instanceof Error ? e.name : 'Error' }, { status: 503 });
  }
}
