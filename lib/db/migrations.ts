/* One-time data changes, run by `npm run db:migrate` (scripts/db-migrate.mts) after the validators
 * and indexes are up to date. Each step runs once: it is recorded in the `migrations` collection
 * (_id = step name), so running the script again does nothing, and a value an administrator changed
 * afterwards is never overwritten. No driver import beyond the types, so tests can call it. */
import type { Db } from 'mongodb';

type Step = { name: string; what: string; run: (db: Db) => Promise<string> };

export const STEPS: Step[] = [
  {
    name: '2026-11-wrong-number-not-an-attempt',
    what: 'Wrong Number no longer counts as an attempt (agreed with Andrew)',
    run: async db => {
      const r = await db.collection('outcomes').updateOne({ _id: 'Wrong Number' as never }, { $set: { countsAsAttempt: false } });
      return r.matchedCount ? 'Wrong Number: countsAsAttempt = false' : 'Wrong Number is not in the catalog: nothing to change';
    },
  },
];

/** Runs every step not run yet, in order. Returns what each one did. */
export async function runMigrations(db: Db, steps = STEPS) {
  const done = db.collection<{ _id: string; at: string; what: string; result: string }>('migrations');
  const out: { name: string; result: string; skipped: boolean }[] = [];
  for (const s of steps) {
    if (await done.findOne({ _id: s.name })) { out.push({ name: s.name, result: 'already done', skipped: true }); continue; }
    const result = await s.run(db);
    await done.insertOne({ _id: s.name, at: new Date().toISOString(), what: s.what, result });
    out.push({ name: s.name, result, skipped: false });
  }
  return out;
}
