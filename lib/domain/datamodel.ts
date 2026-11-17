/* ===== DATA ===== (artifact/app.html) tables behind the apps, access by app and the A to Z process. */
import { CALLS, CTS, LEADS, PROPS } from './data';
import { PASTDAYS } from './metrics';
import { REPS } from './people';
import { CAMPS } from './campaigns';

export const DGR: Record<string, [string, string]> = { base: ['The base', 'tg'], work: ['Daily work', 'tb'], cfg: ['Setup', 'ta'], mon: ['In AB’s monday', 'tv'] };
export type Table = { k: string; n: string; g: string; d: string; f: [string, string][]; c: () => number; ex?: boolean };
export const DBS: Table[] = [
  { k: 'props', n: 'Properties', g: 'base', d: '1 row = property', f: [['Address', 'Text'], ['Audience', 'Dropdown'], ['Outreach status', 'Status, from its contacts'], ['Permit status and date', 'Dropdown, date'], ['Construction started', 'Dropdown'], ['Informative columns', 'From the data load'], ['Contacts', '→ Contacts']], c: () => PROPS.length },
  { k: 'cts', n: 'Contacts', g: 'base', d: '1 row = contact of a property', f: [['Name', 'Text'], ['Property', '→ Properties'], ['Role', 'Dropdown'], ['Email', 'Email'], ['Last outcome and date', 'Dropdown, date'], ['Next eligible call', 'Date'], ['Attempts', 'Number'], ['Original rep', '→ Reps'], ['Removed because', 'Text']], c: () => CTS.length },
  { k: 'phones', n: 'Phone Numbers', g: 'base', d: '1 row = phone of a contact', f: [['Number', 'Phone'], ['Contact', '→ Contacts'], ['Status', 'Dropdown: worked, not tried, wrong']], c: () => CTS.reduce((a, c) => a + c.phones.length, 0) },
  { k: 'camps', n: 'Campaigns', g: 'work', d: '1 row = campaign of a day', f: [['Date', 'Date'], ['Audiences', 'Dropdown'], ['Reps', '→ Reps'], ['Goal', 'Number']], c: () => CAMPS.length },
  { k: 'res', n: 'Daily Reservations', g: 'work', d: '1 row = contact reserved for a rep on a day', f: [['Contact', '→ Contacts'], ['Rep', '→ Reps'], ['Date', 'Date'], ['Priority', 'Dropdown'], ['Batch', 'Morning or requested']], c: () => CTS.filter(c => c.res).length },
  { k: 'calls', n: 'Call Log', g: 'work', d: '1 row = call', f: [['Contact', '→ Contacts'], ['Rep', '→ Reps'], ['Phone', '→ Phone Numbers'], ['Outcome', 'Dropdown'], ['Notes', 'Long text'], ['Follow-up date', 'Date'], ['Provider data', 'Phase 2']], c: () => CALLS.length },
  { k: 'hand', n: 'Hand-offs', g: 'work', d: '1 row = Potential Lead passed to sales', f: [['Property', '→ Properties'], ['Contact', '→ Contacts'], ['Rep or office', '→ Reps'], ['Source', 'Dropdown'], ['monday item', 'Link']], c: () => LEADS.length },
  { k: 'reps', n: 'Reps', g: 'cfg', d: '1 row = user with a login', f: [['Name', 'Text'], ['Role', 'Dropdown'], ['Scheduled days', 'Dropdown']], c: () => REPS.length + 1 },
  { k: 'rules', n: 'Rules', g: 'cfg', d: 'Andrew’s settings', f: [['Allocation, request more', 'Numbers'], ['Waiting time by outcome', 'Numbers'], ['Max attempts', 'Number'], ['Refresh, end of day', 'Dropdown']], c: () => 1 },
  { k: 'mprops', n: 'Fire Rebuild Properties', g: 'mon', d: 'monday board, updated by the sync', f: [['Address', 'Name'], ['Outreach Status', 'Status'], ['Permit Status', 'Dropdown'], ['Construction Started', 'Dropdown'], ['Contacts', 'Connection']], c: () => PROPS.length },
  { k: 'mcts', n: 'Fire Rebuild Contacts', g: 'mon', d: 'monday board, updated by the sync', f: [['Name', 'Name'], ['Last Call Outcome', 'Dropdown'], ['Last Call Date, Next Eligible Call', 'Dates'], ['Call Attempts', 'Numbers'], ['Property', 'Connection']], c: () => CTS.length },
  { k: 'mleads', n: 'AB Leads', g: 'mon', ex: true, d: 'Existing AB board for the sales team', f: [['Lead', 'Name'], ['Source', 'Dropdown'], ['Property and contact', 'Connections'], ['Call history', 'Long text']], c: () => LEADS.length },
  { k: 'mmet', n: 'Outreach Daily Metrics', g: 'mon', d: 'monday board for the dashboards: 1 row = rep and day', f: [['Rep and day', 'Name'], ['Calls, connects, conversations, leads', 'Numbers'], ['Rates', 'Formula']], c: () => PASTDAYS.length * REPS.length },
];
export const ACC: Record<string, Record<string, 'r' | 'w'>> = {
  rep: { props: 'r', cts: 'w', phones: 'w', camps: 'r', res: 'r', calls: 'w', hand: 'w', rules: 'r' },
  mgr: { props: 'w', cts: 'w', camps: 'w', res: 'w', calls: 'r', hand: 'r', reps: 'w', rules: 'w', mprops: 'w', mcts: 'w', mleads: 'w', mmet: 'w' },
  prp: { props: 'w', cts: 'w', phones: 'w', calls: 'r', hand: 'r' },
  p2: { phones: 'w', calls: 'w', props: 'w', cts: 'w' },
};
export type AzRow = [app: string, page: string, title: string, desc: string, tables: string[]];
export const AZ: [string, AzRow[]][] = [
  ['Load the base', [['prp', 'imp', 'Load PropertyRadar', 'Properties and contacts, matched by address and phone.', ['props', 'cts', 'phones']], ['mgr', 'camp', 'Plan campaigns', 'Date, audiences and reps.', ['camps', 'reps']]]],
  ['Every morning', [['mgr', 'rules', 'Eligibility', 'Do Not Call, AB pipeline, removed, valid phone, attempts, due date, not reserved.', ['cts', 'rules', 'hand']], ['mgr', 'live', 'Allocation', 'Own follow-ups back to their rep, the rest to the lowest load, by priority.', ['res', 'cts']], ['mgr', 'mail', 'Campaign email to each rep', 'Goals, audience, script and queue.', ['camps', 'res']]]],
  ['During the day', [['rep', 'today', 'Start Workday and call', 'The rep’s list, the property and its other contacts.', ['res', 'cts', 'props']], ['rep', 'today', 'Record the result', 'Updates the contact, the property and its other contacts; sets the next call.', ['calls', 'cts', 'props']], ['rep', 'today', 'Request more', 'Only when the whole list has a result.', ['res']], ['mgr', 'live', 'Reassign', 'Andrew moves what was not called.', ['res']]]],
  ['Results', [['mgr', 'leads', 'Hand-off to sales', 'Potential Lead in the AB Leads board in monday.', ['hand', 'mleads']], ['mgr', 'perf', 'Performance and email', 'Rates by rep, every night.', ['calls', 'mmet']], ['mgr', 'sync', 'monday sync', 'Properties, contacts, leads and metrics.', ['mprops', 'mcts', 'mleads', 'mmet']]]],
  ['Phase 2', [['p2', 'call', 'Provider calls and AI', 'Verified calls, transcript, AI summary and suggested result.', ['calls']], ['p2', 'enrich', 'Enrich', 'New numbers for contacts on hold.', ['phones']], ['p2', 'aud', 'New audiences', 'Triggers such as sold lots or new permits.', ['props', 'cts']]]],
];
export const DBN = Object.fromEntries(DBS.map(b => [b.k, b.n]));
