/* Roles and permissions (shared by the server and the browser). A user has a role, which presets
 * the permissions, and the permissions themselves can be adjusted one by one. */
export const PERMS = [
  ['rep.workspace', 'Rep Workspace', 'Their own call list (or any rep’s, with Outreach Manager)'],
  ['mgr.view', 'Outreach Manager: see', 'The day by rep, pool, hand-offs, performance, emails, sync; open a rep’s view'],
  ['mgr.manage', 'Outreach Manager: change', 'Campaigns, assignment rules, the call outcome catalog, reassigning and reactivating contacts, and Reports'],
  ['prp.view', 'Properties: see', 'Properties, contacts and their history'],
  ['prp.edit', 'Properties: change', 'Reopen a property, mark construction started, data loads'],
  ['p2.view', 'Calling and AI', 'The phase 2 screens (locked for everyone for now)'],
  ['data.view', 'Data', 'Tables, access and the process A to Z'],
  ['users.manage', 'Users', 'Create users, change roles and permissions, reset passwords'],
] as const;
export type Perm = (typeof PERMS)[number][0];
export const ALL_PERMS = PERMS.map(p => p[0]) as Perm[];

export const ROLES = {
  admin: { n: 'Administrator', perms: ALL_PERMS },
  manager: { n: 'Manager', perms: ALL_PERMS },
  rep: { n: 'Sales rep', perms: ['rep.workspace', 'prp.view', 'p2.view'] as Perm[] },
  viewer: { n: 'Viewer', perms: ['mgr.view', 'prp.view', 'p2.view', 'data.view'] as Perm[] },
} as const;
export type Role = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as Role[];

/** People of the engine a user can be linked to (a rep signs in to their own list). */
export const PEOPLE = ['may', 'dan', 'pri', 'and', 'off'] as const;
export const REP_PEOPLE = ['may', 'dan', 'pri'] as const;

/** What the browser and the API know about the signed-in user. */
export type Me = { id: string; username: string; name: string; role: Role; perms: Perm[]; person: string | null; mustChange: boolean };

/** Apps nobody can open for now, whatever their permissions (Calling and AI waits for the phone provider). */
export const LOCKED_VIEWS: readonly string[] = ['p2'];
export const isLocked = (view: string) => LOCKED_VIEWS.includes(view);
/** Whether a user may open a section: not locked, and with its permission. */
export const canOpen = (me: Pick<Me, 'perms'>, view: string) => !isLocked(view) && !!VIEW_PERM[view] && me.perms.includes(VIEW_PERM[view]);

/** The Outreach Manager (Andrew, role manager) or an administrator: Outreach Manager: change. Runs the
 * outreach: campaigns, rules, the call outcome catalog, Reassign, reactivating on-hold contacts and Reports. */
export const isOutreachManager = (me: Pick<Me, 'perms'>) => me.perms.includes('mgr.manage');
/** Section of the app → permission needed to open it. */
export const VIEW_PERM: Record<string, Perm> = { rep: 'rep.workspace', mgr: 'mgr.view', prp: 'prp.view', p2: 'p2.view', db: 'data.view' };
/** A rep without Outreach Manager works only in their own list. */
export const isLockedRep = (me: Pick<Me, 'perms' | 'person'>) => !!me.person && (REP_PEOPLE as readonly string[]).includes(me.person) && !me.perms.includes('mgr.view');
/** Whether a user may act on a rep's list: their own, or any rep's with Outreach Manager (not a locked rep). */
export const mayActFor = (me: Pick<Me, 'perms' | 'person'>, rep: string) =>
  (REP_PEOPLE as readonly string[]).includes(rep) && (me.person === rep || (!isLockedRep(me) && me.perms.includes('mgr.view')));
/** Where a user lands after signing in. */
export function homeOf(me: Pick<Me, 'perms' | 'person'>) {
  if (isLockedRep(me)) return '/rep/today';
  if (me.perms.includes('mgr.view')) return '/mgr/live';
  if (me.perms.includes('rep.workspace')) return '/rep/today';
  if (me.perms.includes('prp.view')) return '/prp/props';
  if (me.perms.includes('data.view')) return '/data';
  return '/login';
}
