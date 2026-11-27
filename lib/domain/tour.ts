import { CALLS, ctByName, P } from './data';
import { D, MONL, WDL, addDays, fmtS } from './dates';

/* ===== WALKTHROUGH ===== (artifact/app.html) texts of each step.
 * The navigation each step performs (the artifact's `go`) is TOUR_GO in lib/state/actions.ts, same index. */
/* {lauraCall}, {lauraDay} and {elenaPermit} are filled from the data (tourText), since the seed is
 * relative to the day it ran. */
export type TourStep = { t: string; min: number; dolor: string; show: string[]; say: string };

export const TOUR: TourStep[] = [
  { t: 'Andrew owns the morning', min: 2,
    dolor: 'Andrew: today the dialer works, but he cannot get in, cannot set the assignment rules and cannot see transcripts. 6,000 to 8,000 properties with no construction started, and only 110 in the pipeline in the Palisades.',
    show: ['At 7:00 AM the engine built every list with his rules: three reps, an even share each, and follow-ups back with the rep who set them.', 'Same house, two reps: 0. A property and all its contacts stay with one rep for the day.', 'Each card shows how far the rep is, with calls, connects, conversations and leads.'],
    say: 'This is yours: the rules, the lists and the numbers, without depending on the dialer vendor.' },
  { t: 'The rep starts the day without thinking', min: 2,
    dolor: 'Andrew’s design: "Start your workday to request your first daily allocation of eligible leads."',
    show: ['Maya logs in with her own user, no monday seat.', 'Press Start Workday: her list is already reserved, with her follow-ups first.', 'On the left, each contact with its priority, last result, attempt and permit.'],
    say: 'She logs in and calls. Nobody builds lists by hand.' },
  { t: 'A follow-up comes back on time, to the same rep', min: 2,
    dolor: 'P1 in Andrew’s rules: Call Outcome Follow Up goes back to the original rep.',
    show: ['Laura Whitfield asked Maya on {lauraCall} to call back {lauraDay} after meeting her architect: she is first in Maya’s list today.', 'Her husband Greg is in the same list, so Maya calls the house once and with context.', 'History, notes and the campaign script are on the same screen.'],
    say: 'The promise to call back is kept by the system, not by the rep’s memory.' },
  { t: 'One call, one lead for sales', min: 2,
    dolor: 'The rep does not close: the job is to find interest and pass it to the internal team.',
    show: ['Elena Marsh: permit issued in {elenaPermit}. Call, then pick Interested: the box shows what will happen before saving.', 'Save: the property becomes a Potential Lead and lands in Hand-offs and in the AB Leads board in monday, with the call history.', 'David Marsh leaves the list: the house is with sales now.'],
    say: 'Interest found today is in the sales team’s board today.' },
  { t: 'One no clears the whole house', min: 2,
    dolor: 'Manuel’s rule, which Andrew marked as very important: if one owner says no, nobody calls the spouse or the son.',
    show: ['905 Arbolada Way has three contacts. Michael Brandt is in Maya’s list, and so is Karen; Tom left a voicemail last week.', 'Pick Not Interested on Michael and save: Karen moves to Removed today with the reason, and Tom leaves the pool.', 'Not Interested waits 180 days; Do Not Contact never comes back.'],
    say: 'No duplicate calls to a family that already said no.' },
  { t: 'Nothing falls through the cracks', min: 2,
    dolor: 'Andrew wants the whole base worked, not only the top of the list.',
    show: ['Henry Okafor: Wrong Number with a single phone puts him on hold for a new number instead of losing him.', 'A Left VM comes back in 3 business days to any rep; Not Contacted the next business day.', 'When the list has a result for every contact, Request more checks it and adds the next batch.'],
    say: 'Every contact has a next date or a reason, so the whole base gets worked.' },
  { t: 'The rules and the numbers are Andrew’s', min: 2,
    dolor: 'The Canva lists the eligibility rules, P1 to P5 and the two daily emails, with Dial to Connect, Connect to Convo and Convo to Lead.',
    show: ['Global Assignment Rules: allocation size and max attempts. Change one and the next allocation uses it.', 'Reports: Calls Made, Connects and New Leads by rep, against the same day last week.'],
    say: 'When the rules change, Andrew changes them.' },
  { t: 'What phase 2 adds', min: 1,
    dolor: 'Andrew wants to see transcripts and pay bonuses on verified calls.',
    show: ['With the provider AB picks, calls are logged by themselves: verified for bonuses.', 'With the transcript, the AI writes the summary and suggests the result and the follow-up.', 'Enrich finds numbers for contacts on hold; new audiences come in by trigger.'],
    say: 'Phase 1 runs without the provider; phase 2 plugs it in.' },
];

/** Fills the placeholders of a step text with the current data. */
export function tourText(s: string) {
  if (!s.includes('{')) return s;
  const laura = ctByName('Laura Whitfield'), elena = ctByName('Elena Marsh');
  const fu = laura && CALLS.filter(x => x.ct === laura.k && x.out === 'Follow Up').pop();
  const permit = elena && P(elena.prop)?.permitDate;
  return s
    .replace('{lauraCall}', fu ? fmtS(fu.at) : 'her last call')
    // The seed asks her to be called back a week after that call (world.ts)
    .replace('{lauraDay}', fu ? WDL[addDays(fu.at, 7).getDay()] : 'today')
    .replace('{elenaPermit}', permit ? MONL[D(permit)!.getMonth()] : 'the last months');
}
