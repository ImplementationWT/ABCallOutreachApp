/* npm run db:import-properties -- [--dry-run] [--file property-data/properties.csv]
 *
 * Loads the New Property Database (property-data/README.md) into MongoDB (MONGODB_DB of .env.local).
 *   - One row = one property, _id "P-<csv id>", sourceId = csv id.
 *   - The owner is one contact per person: same owner_name and mailing address (normalized: upper
 *     case, single spaces) = same contact (ownerKey, unique). Their properties go in `props` and each
 *     property points back to it in `owner`. Phones and emails of every row of that owner are merged.
 *   - A row without owner_name is loaded without a contact. possible_duplicate rows are loaded with
 *     the flag (possibleDup). "Potential Lead" rows get inPipe = "Potential Lead (importado)", so they
 *     stay out of the call lists.
 *   - Contacts without a phone are loaded too: the engine keeps them on hold until a number is added.
 * Idempotent: running it again updates the data from the file and keeps what the app changed
 * (outreach state, inPipe, lead, construction started); new owners get new ids, known owners keep theirs.
 * All the writes go in one transaction, in batches of 1000. --dry-run only reads and prints the summary.
 * Then it moves app_meta.seq past the new ids, so the app never reuses them. */
import { readFile } from 'node:fs/promises';
import { MongoClient, type AnyBulkWriteOperation } from 'mongodb';
import { ensureCollections } from '@/lib/db/schema';
import type { AudKey } from '@/lib/domain';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'calloutreach';
if (!uri) { console.error('MONGODB_URI is not set (add it to .env.local)'); process.exit(1); }
const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const DRY = process.argv.includes('--dry-run');
const FILE = arg('--file') || 'property-data/properties.csv';
const SRC = 'New Property Database';
const BATCH = 1000;
const CT_FROM = 10001;

/* ----- CSV (RFC 4180: quoted fields with commas, quotes and line breaks) ----- */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.length > 1 || r[0] !== '');
}

/* ----- Values ----- */
const AUD: Record<string, AudKey> = { 'Pacific Palisades - Fire Rebuild': 'pp', 'Malibu - Fire Rebuild': 'mb', 'Sunset Mesa - Fire Rebuild': 'sm' };
const AUD_NAME: Record<string, string> = { pp: 'Pacific Palisades', sm: 'Sunset Mesa', mb: 'Malibu', ad: 'Altadena' };
const s = (v: string | undefined) => (v ?? '').replace(/\s+/g, ' ').trim();
const sN = (v: string | undefined) => s(v) || null;
const norm = (v: string | undefined) => s(v).toUpperCase();
const intN = (v: string | undefined) => { const t = s(v); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? Math.round(n) : NaN; };
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const bool = (v: string | undefined) => s(v).toLowerCase() === 'true';
const phone = (v: string | undefined) => {
  let d = s(v).replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : null;
};
const email = (v: string | undefined) => { const e = s(v).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null; };
const num = (id: string) => Number(id.replace(/\D/g, ''));

type Row = Record<string, string>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose documents of this script
type Document = { _id: string; [k: string]: any };
type Prop = Record<string, unknown> & { _id: string; aud: AudKey; owner: string | null };
type Owner = {
  key: string; id?: string; rows: number[]; props: string[]; n: string; firstName: string | null; lastName: string | null;
  phones: string[]; emails: string[]; mailAddr: string | null; mailCity: string | null; mailState: string | null; mailZip: string | null;
};

const text = await readFile(FILE, 'utf8').catch(() => { console.error(`Cannot read ${FILE}`); process.exit(1); });
const [head, ...body] = parseCsv(text.replace(/^﻿/, ''));
const NEED = ['id', 'address', 'zip', 'audience', 'outreach_status', 'owner_name', 'mail_address', 'primary_phone'];
const missing = NEED.filter(c => !head.includes(c));
if (missing.length) { console.error(`The file is missing columns: ${missing.join(', ')}`); process.exit(1); }
const rows: Row[] = body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));

/* ----- Rows to documents ----- */
const errors: { line: number; id: string; why: string }[] = [];
const warnings: { line: number; id: string; why: string }[] = [];
const props: Prop[] = [];
const owners = new Map<string, Owner>();
const seenIds = new Set<string>();
rows.forEach((r, i) => {
  const line = i + 2, id = s(r.id);
  if (body[i].length !== head.length) return errors.push({ line, id, why: `has ${body[i].length} columns, the header has ${head.length}` });
  if (!/^\d+$/.test(id)) return errors.push({ line, id, why: 'id is not a whole number' });
  if (seenIds.has(id)) return errors.push({ line, id, why: 'id repeated in the file' });
  const aud = AUD[s(r.audience)];
  if (!aud) return errors.push({ line, id, why: `unknown audience "${s(r.audience)}"` });
  seenIds.add(id);
  const ints: Record<string, number | null> = {};
  for (const c of ['sq_ft', 'lot_sq_ft', 'year_built', 'purchase_amount', 'first_mortgage_amount']) {
    const v = intN(r[c]);
    if (Number.isNaN(v)) { warnings.push({ line, id, why: `${c} "${s(r[c])}" is not a number, loaded empty` }); ints[c] = null; } else ints[c] = v;
  }
  const dateOr = (c: string) => { const v = s(r[c]); if (!v) return null; if (isDate(v)) return v; warnings.push({ line, id, why: `${c} "${v}" is not a date, loaded empty` }); return null; };
  const purchaseDate = dateOr('purchase_date'), permitDate = dateOr('permit_date');
  const permit = s(r.permit_status) === 'Permit Issued' ? 'Permit Issued' : s(r.permit_status) === 'Plans Submitted' ? 'Plans Submitted' : 'None';
  if (s(r.permit_status) && permit === 'None') warnings.push({ line, id, why: `permit_status "${s(r.permit_status)}" unknown, loaded as None` });
  const status = s(r.outreach_status) || 'Not Contacted';
  const pid = `P-${id}`;
  const p: Prop = {
    _id: pid, sourceId: Number(id), aud, addr: s(r.address), city: s(r.city), state: s(r.state), zip: s(r.zip),
    permit, ...(permitDate ? { permitDate } : {}), started: bool(r.construction_started) ? 'Yes' : 'No',
    lot: ints.lot_sq_ft, prior: ints.sq_ft, built: ints.year_built, since: purchaseDate ? Number(purchaseDate.slice(0, 4)) : null,
    src: SRC, inPipe: status === 'Potential Lead' ? 'Potential Lead (importado)' : null, lead: null, ext: null,
    outreachStatus: status, propType: s(r.property_type), purchaseDate, purchaseType: sN(r.purchase_type),
    purchaseAmount: ints.purchase_amount, mortgageAmount: ints.first_mortgage_amount, cashBuyer: bool(r.cash_buyer), possibleDup: bool(r.possible_duplicate),
    owner: null,
  };
  props.push(p);
  const name = s(r.owner_name);
  if (!name) return;
  const key = [r.owner_name, r.mail_address, r.mail_city, r.mail_state, r.mail_zip].map(norm).join('|');
  let o = owners.get(key);
  if (!o) owners.set(key, o = {
    key, rows: [], props: [], n: name, firstName: sN(r.owner_first_name), lastName: sN(r.owner_last_name), phones: [], emails: [],
    mailAddr: sN(r.mail_address), mailCity: sN(r.mail_city), mailState: sN(r.mail_state), mailZip: sN(r.mail_zip),
  });
  o.rows.push(line); o.props.push(pid);
  for (const c of ['primary_phone', 'primary_mobile', 'secondary_phone', 'secondary_mobile']) {
    const ph = phone(r[c]);
    if (s(r[c]) && !ph) warnings.push({ line, id, why: `${c} "${s(r[c])}" is not a 10 digit number, skipped` });
    if (ph && !o.phones.includes(ph)) o.phones.push(ph);
  }
  for (const c of ['primary_email', 'secondary_email']) {
    const e = email(r[c]);
    if (s(r[c]) && !e) warnings.push({ line, id, why: `${c} "${s(r[c])}" is not an email, skipped` });
    if (e && !o.emails.includes(e)) o.emails.push(e);
  }
});

/* ----- What is in the database already ----- */
const client = new MongoClient(uri, { appName: 'calloutreach-import' });
try {
  await client.connect();
  const db = client.db(dbName);
  const P = db.collection<Document>('properties'), CT = db.collection<Document>('contacts'), PH = db.collection<Document>('phone_numbers'), META = db.collection<Document>('app_meta');
  const oldProps = new Map((await P.find({ _id: { $in: props.map(p => p._id) } }, { projection: { _id: 1 } }).toArray()).map(d => [d._id as string, d]));
  const oldCts = await CT.find({}, { projection: { _id: 1, ownerKey: 1, props: 1, prop: 1, email: 1, emails: 1 } }).toArray();
  const byKey = new Map(oldCts.filter(d => d.ownerKey).map(d => [d.ownerKey as string, d]));
  const oldPh = await PH.find({}, { projection: { ct: 1, idx: 1, n: 1 } }).toArray();
  const phOf = new Map<string, { n: string; idx: number }[]>();
  for (const d of oldPh) (phOf.get(d.ct) || phOf.set(d.ct, []).get(d.ct)!).push({ n: d.n, idx: d.idx });
  let nextCt = Math.max(CT_FROM, ...oldCts.map(d => num(d._id as string) + 1));

  // Contact ids: a known owner keeps its id, a new one gets the next free number (in file order)
  const ctOps: AnyBulkWriteOperation<Document>[] = [], phOps: AnyBulkWriteOperation<Document>[] = [];
  let ctNew = 0, ctUpd = 0, phNew = 0;
  const propById = new Map(props.map(p => [p._id, p]));
  for (const o of owners.values()) {
    const old = byKey.get(o.key);
    o.id = old ? (old._id as string) : `C-${nextCt++}`;
    for (const pk of o.props) propById.get(pk)!.owner = o.id;
    const allProps = [...new Set([...((old?.props as string[]) || (old?.prop ? [old.prop as string] : [])), ...o.props])];
    const oldEmails = old ? [old.email as string, ...((old.emails as string[]) || [])].filter(Boolean) : [];
    const mails = [...new Set([...oldEmails, ...o.emails])];
    const ident = {
      n: o.n, firstName: o.firstName, lastName: o.lastName, ownerKey: o.key, props: allProps, email: mails[0] || '', emails: mails.slice(1),
      mailAddr: o.mailAddr, mailCity: o.mailCity, mailState: o.mailState, mailZip: o.mailZip,
    };
    if (old) { ctUpd++; ctOps.push({ updateOne: { filter: { _id: o.id }, update: { $set: ident } } }); }
    else {
      ctNew++;
      ctOps.push({ insertOne: { document: { _id: o.id, prop: allProps[0], ...ident, role: 'Primary owner', out: null, lastAt: null, nextAt: null, att: 0, rep: null, dnc: false, supp: false, stop: null, note: '' } } });
    }
    const have = phOf.get(o.id) || [];
    let idx = have.length ? Math.max(...have.map(x => x.idx)) + 1 : 0;
    for (const n of o.phones) if (!have.some(x => x.n === n)) { phNew++; phOps.push({ insertOne: { document: { _id: `${o.id}#${idx}`, ct: o.id, idx, n, st: 'untested' } } }); idx++; }
  }
  // Properties: the file's data is set; what the app changes (outreach) is only set on insert
  const APP_OWNED = ['inPipe', 'lead', 'ext', 'started'];
  const propOps: AnyBulkWriteOperation<Document>[] = props.map(p => {
    const set: Record<string, unknown> = {}, onInsert: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(p)) if (k !== '_id') (APP_OWNED.includes(k) ? onInsert : set)[k] = v;
    return { updateOne: { filter: { _id: p._id }, update: { $set: set, $setOnInsert: onInsert }, upsert: true } };
  });

  /* ----- Summary ----- */
  const multi = [...owners.values()].filter(o => o.props.length > 1);
  const byAud: Record<string, { props: number; withPh: number; noPh: number; noOwner: number }> = {};
  const ownerOf = new Map([...owners.values()].flatMap(o => o.props.map(pk => [pk, o] as const)));
  for (const p of props) {
    const a = (byAud[AUD_NAME[p.aud]] ||= { props: 0, withPh: 0, noPh: 0, noOwner: 0 });
    a.props++;
    const o = ownerOf.get(p._id);
    if (!o) a.noOwner++; else if (o.phones.length || (phOf.get(o.id!) || []).length) a.withPh++; else a.noPh++;
  }
  const ctAud: Record<string, { withPh: number; noPh: number }> = {};
  for (const o of owners.values()) {
    const a = (ctAud[AUD_NAME[propById.get(o.props[0])!.aud]] ||= { withPh: 0, noPh: 0 });
    if (o.phones.length || (phOf.get(o.id!) || []).length) a.withPh++; else a.noPh++;
  }
  console.log(`${DRY ? 'DRY RUN (nothing is written)' : 'IMPORT'} of ${FILE} into "${dbName}"`);
  console.log(`  rows in the file           ${rows.length}`);
  console.log(`  rows with errors (skipped) ${errors.length}`);
  console.log(`  properties                 ${props.length} (${props.length - oldProps.size} new, ${oldProps.size} already there, updated)`);
  console.log(`    without a contact        ${props.filter(p => !p.owner).length} (no owner_name)`);
  console.log(`    possible duplicates      ${props.filter(p => p.possibleDup).length} (loaded with the flag)`);
  console.log(`    Potential Lead           ${props.filter(p => p.inPipe).length} (inPipe, out of call lists)`);
  console.log(`    lot / prior / built / since empty: ${['lot', 'prior', 'built', 'since'].map(k => props.filter(p => p[k] == null).length).join(' / ')}`);
  console.log(`  contacts (owners)          ${owners.size} (${ctNew} new, ${ctUpd} already there, updated)`);
  console.log(`    with more than one prop  ${multi.length} (max ${Math.max(0, ...multi.map(o => o.props.length))})`);
  console.log(`    with a phone / without   ${[...owners.values()].filter(o => o.phones.length).length} / ${[...owners.values()].filter(o => !o.phones.length).length}`);
  console.log(`  phone numbers to add       ${phNew}`);
  console.log('  by audience: properties (contact with phone / without phone / no contact); contacts with / without phone');
  for (const [a, v] of Object.entries(byAud)) console.log(`    ${a.padEnd(18)} ${String(v.props).padStart(5)} (${v.withPh} / ${v.noPh} / ${v.noOwner}); contacts ${ctAud[a]?.withPh ?? 0} / ${ctAud[a]?.noPh ?? 0}`);
  if (errors.length) { console.log('  errors:'); for (const e of errors) console.log(`    line ${e.line} (id ${e.id || '?'}): ${e.why}`); }
  if (warnings.length) { console.log(`  warnings (${warnings.length}, loaded anyway):`); for (const w of warnings.slice(0, 30)) console.log(`    line ${w.line} (id ${w.id}): ${w.why}`); }
  if (DRY) { console.log('Dry run: nothing was written.'); }
  else {

  /* ----- Write: one transaction, batches of BATCH ----- */
  await ensureCollections(db);
  const t0 = Date.now();
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      for (const [c, ops] of [[P, propOps], [CT, ctOps], [PH, phOps]] as const)
        for (let i = 0; i < ops.length; i += BATCH) await c.bulkWrite(ops.slice(i, i + BATCH), { ordered: true, session });
      const meta = await META.findOne({ _id: 'state' }, { session });
      const seq = { prop: 1001, ct: 5001, call: 90001, lead: 2020, ...(meta?.seq as object) } as Record<string, number>;
      seq.prop = Math.max(seq.prop, ...props.map(p => num(p._id) + 1));
      seq.ct = Math.max(seq.ct, nextCt);
      await META.updateOne({ _id: 'state' }, { $set: { seq } }, { upsert: true, session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } finally {
    await session.endSession();
  }
  console.log(`Written in ${((Date.now() - t0) / 1000).toFixed(1)} s. Now: ${await P.countDocuments()} properties, ${await CT.countDocuments()} contacts, ${await PH.countDocuments()} phone numbers.`);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  const info = (e as { errInfo?: unknown; writeErrors?: unknown }).errInfo || (e as { writeErrors?: unknown }).writeErrors;
  if (info) console.error(JSON.stringify(info).slice(0, 2000));
  process.exitCode = 1;
} finally {
  await client.close();
}
