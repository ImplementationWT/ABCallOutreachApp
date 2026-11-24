import 'server-only';
/* What GET /api/state gives each user. A manager or viewer gets everything. A rep (isLockedRep)
 * gets only their own data:
 *   - their reservations, workdays and daily numbers (no other rep's list);
 *   - the properties of their work: in their lists, of their follow-ups (contacts they own) and of
 *     the calls they made, with every contact of those properties and their history (the contact
 *     detail shows the whole property and what each person said);
 *   - the campaigns they are in, the reps' names, the rules and the outcome catalog.
 * Never another rep's list, workday, numbers or follow-ups outside the rep's own properties. */
import type { Doc, Snapshot } from '@/lib/domain';
import { isLockedRep } from '@/lib/auth/roles';
import type { UserDoc } from './auth-core';

const base = (k: string) => k.split('@')[0];
const slotProp = (k: string) => (k.includes('@') ? k.split('@')[1] : null);

export function scopeFor(s: Snapshot, user: Pick<UserDoc, 'perms' | 'person'>): Snapshot {
  if (!isLockedRep({ perms: user.perms, person: user.person ?? null })) return s;
  const rep = user.person!;
  const reservations = s.reservations.filter(r => r.rep === rep);
  const calls = s.call_log.filter(x => x.rep === rep);
  const byId = new Map(s.contacts.map(c => [String(c._id), c]));
  const props = new Set<string>();
  const addKey = (k: string) => { const p = slotProp(k) ?? (byId.get(base(k))?.prop as string | undefined); if (p) props.add(p); };
  for (const r of reservations) addKey(String(r.ct));
  for (const x of calls) addKey(String(x.ct));
  for (const c of s.contacts) {
    if (c.rep === rep) props.add(String(c.prop));
    for (const [p, st] of Object.entries((c.pst ?? {}) as Record<string, { rep?: string }>)) if (st?.rep === rep) props.add(p);
  }
  // Every contact of those properties (the whole property), and every property those people own,
  // so the app can open each of them
  const contacts = s.contacts.filter(c => props.has(String(c.prop)) || ((c.props ?? []) as string[]).some(p => props.has(p)));
  const ids = new Set(contacts.map(c => String(c._id)));
  const allProps = new Set<string>(props);
  for (const c of contacts) { allProps.add(String(c.prop)); for (const p of (c.props ?? []) as string[]) allProps.add(p); }
  const mine = (d: Doc) => d.rep === rep;
  return {
    ...s,
    properties: s.properties.filter(p => allProps.has(String(p._id))),
    contacts,
    phone_numbers: s.phone_numbers.filter(p => ids.has(String(p.ct))),
    campaigns: s.campaigns.filter(c => ((c.reps ?? []) as string[]).includes(rep)),
    reservations,
    workdays: s.workdays.filter(mine),
    call_log: s.call_log.filter(x => ids.has(base(String(x.ct)))),
    hand_offs: s.hand_offs.filter(h => allProps.has(String(h.prop)) && ids.has(base(String(h.ct)))),
    daily_metrics: s.daily_metrics.filter(mine),
    sync_log: [],
  };
}
