/* Phone numbers for dialing: one normalized form (E.164) for the tel: link and any phone provider.
 * Pure. The numbers in the database keep the format they were loaded with, e.g. "(310) 555-0142". */
import type { Contact } from './data';

/** E.164 ("+13105550142"), or null when it is not a number that can be dialed.
 * US numbers: 10 digits, or 11 starting with 1. Numbers written with "+" keep their country code. */
export function normalizePhone(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim().replace(/\s*(ext\.?|x|#)\s*\d+$/i, '');
  const d = s.replace(/\D/g, '');
  if (s.startsWith('+')) return d.length >= 8 && d.length <= 15 ? '+' + d : null;
  if (d.length === 10 && /^[2-9]/.test(d)) return '+1' + d;
  if (d.length === 11 && d[0] === '1' && /^[2-9]/.test(d.slice(1))) return '+' + d;
  return null;
}
/** The tel: link of a number, or null when it cannot be dialed. */
export const telHref = (raw: string) => { const n = normalizePhone(raw); return n ? 'tel:' + n : null; };
/** The numbers a rep can be offered to call: not marked wrong, and dialable. Keeps the index in `phones`. */
export const dialable = (c: Pick<Contact, 'phones'>) => c.phones.map((p, i) => ({ ...p, i })).filter(p => p.st !== 'bad' && !!normalizePhone(p.n));
