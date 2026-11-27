import 'server-only';
/* The call outcome catalog in MongoDB (collection `outcomes`): seed, validation, create and edit.
 * Only an administrator edits it (POST /api/outcomes). Outcomes are never deleted: deactivating one
 * hides it from the rep's form and keeps the history that used it. The name is the id, so it
 * cannot change (the call log keeps it as text). */
import type { Db } from 'mongodb';
import { DEFAULT_OUTCOMES, type OutcomeDef, type OutcomeDoc } from '@/lib/domain';
import { HttpError } from './server-state';

/** Fills the catalog with the seed if it is empty (first run after the catalog existed). */
export async function ensureOutcomes(db: Db) {
  const col = db.collection<OutcomeDoc>('outcomes');
  if (await col.estimatedDocumentCount()) return false;
  await col.insertMany(DEFAULT_OUTCOMES.map(([k, d], pos) => ({ _id: k, ...d, pos })));
  return true;
}

const BOOLS = ['active', 'countsAsAttempt', 'calendarDays', 'needsFollowUp', 'lead', 'connect', 'final', 'sameRep', 'started', 'proposed'] as const;
const ENUMS = { propagates: ['none', 'property', 'person'], group: ['none', 'con', 'conv'], status: ['Not Contacted', 'Contacted', 'Not Interested', 'Potential Lead'], phone: ['bad', 'ok', 'keep'], tone: ['n', 'b', 'a', 'g', 'r'] } as const;

/** Checks and normalizes the editable fields. `partial`: only the fields given (edit). */
export function cleanOutcome(x: Record<string, unknown>, partial: boolean): Partial<OutcomeDef> {
  const out: Record<string, unknown> = {};
  for (const k of BOOLS) if (k in x) { if (typeof x[k] !== 'boolean') throw new HttpError(400, `${k} must be true or false`); out[k] = x[k]; }
  for (const [k, vals] of Object.entries(ENUMS)) if (k in x) { if (!(vals as readonly string[]).includes(String(x[k]))) throw new HttpError(400, `${k} must be one of ${vals.join(', ')}`); out[k] = x[k]; }
  if ('recallDays' in x) {
    const n = Number(x.recallDays);
    if (!Number.isInteger(n) || n < 1 || n > 3650) throw new HttpError(400, 'Recall days must be a whole number of at least 1');
    out.recallDays = n;
  }
  if ('pri' in x) { if (![null, 'P1', 'P3', 'P4'].includes(x.pri as string | null)) throw new HttpError(400, 'pri must be P1, P3, P4 or empty'); out.pri = x.pri; }
  if ('hint' in x) out.hint = String(x.hint ?? '').slice(0, 120);
  if (!partial && !('status' in out)) throw new HttpError(400, 'status is required');
  return out as Partial<OutcomeDef>;
}

export async function createOutcome(db: Db, name: string, x: Record<string, unknown>) {
  const n = name.trim();
  if (!n || n.length > 60) throw new HttpError(400, 'The name is required (60 characters at most)');
  const col = db.collection<OutcomeDoc>('outcomes');
  if (await col.findOne({ _id: { $regex: `^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })) throw new HttpError(409, 'An outcome with that name already exists');
  const pos = (await col.countDocuments()) as number;
  const base: OutcomeDef = { active: true, countsAsAttempt: true, recallDays: 1, calendarDays: false, propagates: 'none', needsFollowUp: false, lead: false, connect: true, final: false, sameRep: false, pri: null, group: 'conv', status: 'Contacted', phone: 'ok', started: false, proposed: false, tone: 'n', hint: '' };
  const doc: OutcomeDoc = { ...base, ...cleanOutcome(x, false), _id: n, pos };
  await col.insertOne(doc);
  return doc;
}

export async function updateOutcome(db: Db, name: string, x: Record<string, unknown>) {
  const col = db.collection<OutcomeDoc>('outcomes');
  const set = cleanOutcome(x, true);
  const r = await col.findOneAndUpdate({ _id: name }, { $set: set }, { returnDocument: 'after' });
  if (!r) throw new HttpError(404, 'Outcome not found');
  return r;
}
