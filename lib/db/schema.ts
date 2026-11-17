/* MongoDB collections of the Call Center: JSON Schema validators and indexes.
 * The model follows the app's own data model (Data > Tables) plus what the engine keeps between
 * requests (workdays, daily metrics, sync log, clock and counters). No driver here, so the seed
 * script and the tests can use it outside Next. */
import type { Db, IndexDescription } from 'mongodb';
import { AUDK, OUTK, type CollectionName } from '@/lib/domain';

type Schema = Record<string, unknown>;
const str = { bsonType: 'string' };
const strN = { bsonType: ['string', 'null'] };
const num = { bsonType: 'number' };
const numN = { bsonType: ['number', 'null'] };
const bool = { bsonType: 'bool' };
const date = { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const dateTime = { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$' };
const enumOf = (v: readonly string[], nullable = false) => ({ enum: nullable ? [...v, null] : [...v] });
const REPS = ['may', 'dan', 'pri'];
const PEOPLE = [...REPS, 'and', 'off'];
const obj = (required: string[], properties: Schema): Schema => ({ bsonType: 'object', required: ['_id', ...required], properties });

export const SCHEMAS: Record<CollectionName, Schema> = {
  properties: obj(['aud', 'addr', 'permit', 'started', 'lot', 'prior', 'built', 'since', 'src'], {
    _id: str, aud: enumOf(AUDK), addr: str, permit: enumOf(['None', 'Plans Submitted', 'Permit Issued']), permitDate: date,
    started: enumOf(['Yes', 'No']), lot: num, prior: num, built: num, since: num, src: str, inPipe: strN, lead: strN,
  }),
  contacts: obj(['prop', 'n', 'role', 'email', 'att', 'dnc', 'supp'], {
    _id: str, prop: str, n: str, role: str, other: str, email: str, out: enumOf(OUTK, true), lastAt: strN, nextAt: strN,
    att: num, rep: enumOf(PEOPLE, true), dnc: bool, supp: bool, stop: { bsonType: ['object', 'null'] }, note: str,
  }),
  phone_numbers: obj(['ct', 'idx', 'n', 'st'], { _id: str, ct: str, idx: num, n: str, st: enumOf(['untested', 'ok', 'bad']) }),
  campaigns: obj(['date', 'auds', 'reps', 'goal', 'pos'], { _id: str, date, auds: { bsonType: 'array', items: enumOf(AUDK) }, reps: { bsonType: 'array', items: enumOf(REPS) }, goal: num, past: bool, pos: num }),
  reservations: obj(['ct', 'rep', 'date', 'order'], { _id: str, ct: str, rep: enumOf(REPS), date, order: num, done: numN }),
  workdays: obj(['rep', 'date', 'st', 'batches'], { _id: str, rep: enumOf(REPS), date, st: enumOf(['reserved', 'started', 'ended', 'off']), startedAt: strN, endedAt: strN, batches: { bsonType: 'array' } }),
  call_log: obj(['ct', 'rep', 'at', 'out', 'ph'], { _id: num, ct: str, rep: enumOf(PEOPLE), at: dateTime, out: enumOf(OUTK), note: str, ph: str, live: bool, fx: { bsonType: 'array', items: str } }),
  hand_offs: obj(['prop', 'ct', 'rep', 'at', 'out', 'src', 'pos'], { _id: str, prop: str, ct: str, rep: enumOf(PEOPLE), at: dateTime, out: str, note: str, src: enumOf(['Outbound', 'Inbound']), fresh: bool, pos: num }),
  reps: obj(['n', 'i', 'r'], { _id: enumOf(PEOPLE), n: str, i: str, c: str, r: str }),
  rules: obj(['first', 'more', 'scale', 'maxAtt', 'refresh', 'endDay', 'rc', 'hours'], { _id: enumOf(['default']), first: num, more: num, scale: num, maxAtt: num, refresh: enumOf(['daily', 'weekly']), endDay: enumOf(['pool', 'keep']), rc: { bsonType: 'object' }, hours: str }),
  daily_metrics: obj(['day', 'rep', 'calls', 'con', 'conv', 'leads'], { _id: str, day: date, rep: enumOf(REPS), calls: num, con: num, conv: num, leads: num }),
  sync_log: obj(['at', 'board', 'item', 'what'], { _id: num, at: dateTime, board: str, item: str, what: str }),
  app_meta: obj(['clock', 'seq'], { _id: enumOf(['state']), clock: dateTime, seq: { bsonType: 'object' } }),
};

export const INDEXES: Partial<Record<CollectionName, IndexDescription[]>> = {
  properties: [{ key: { aud: 1 } }, { key: { addr: 1 } }],
  contacts: [{ key: { prop: 1 } }, { key: { rep: 1, nextAt: 1 } }],
  phone_numbers: [{ key: { ct: 1, idx: 1 }, unique: true }, { key: { n: 1 } }],
  reservations: [{ key: { date: 1, rep: 1, order: 1 } }, { key: { ct: 1 } }],
  workdays: [{ key: { date: 1, rep: 1 }, unique: true }],
  call_log: [{ key: { ct: 1 } }, { key: { rep: 1, at: -1 } }, { key: { at: -1 } }],
  hand_offs: [{ key: { prop: 1 } }, { key: { at: -1 } }],
  daily_metrics: [{ key: { day: 1, rep: 1 }, unique: true }],
  sync_log: [{ key: { at: -1 } }],
};

/** Creates every collection with its validator (or updates the validator) and its indexes. */
export async function ensureCollections(db: Db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  for (const [name, schema] of Object.entries(SCHEMAS) as [CollectionName, Schema][]) {
    const validator = { $jsonSchema: schema };
    if (existing.has(name)) await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
    else await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
    const idx = INDEXES[name];
    if (idx?.length) await db.collection(name).createIndexes(idx);
  }
}
