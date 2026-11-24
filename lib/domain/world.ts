/* Builds the seeded demo world in the artifact's exact order:
 *   PROPERTIES AND CONTACTS (live cases, random base, call history, propagation)
 *   METRICS (DAYM, drawn from the seed)
 *   MORNING STATE (morning allocation, Priya's and Daniel's first calls)
 * Any change to the order of seeded calls changes every name, address, phone and metric.
 * Used by `npm run db:seed` (initial content of MongoDB) and by the determinism test; the app
 * itself loads its data from MongoDB.
 */
import { AUDK, isLeadOut, isNoOut, setOutcomes, type AudKey } from './catalogs';
import { DEFAULT_OUTCOMES } from './outcomes';
import { CTS, LEADS, LN, FN, OTHER_ROLES, PROPS, SEQ, SYNC, ctsOf, mkCt, mkPhone, mkProp, P, resetData, syncLog, type Contact, type Phone } from './data';
import { D, T0, TODAY, WDL, addBiz, addDays, fmtS, fmtWD, iso, p2, setClock, setToday, subBiz } from './dates';
import { DAY, morningAlloc, openOf, pastAt, pastCall, recallOf, resetDays, saveOutcome } from './engine';
import { resetCampaigns } from './campaigns';
import { resetRules } from './rules';
import { buildDaym, resetDaym } from './metrics';
import { REPS, type RepKey } from './people';
import { pick, resetSeed, rint, rnd } from './seed';

/** t0: the day (and time) the data is seeded for; every seeded date is relative to it. */
export function buildWorld(t0: Date = new Date()) {
  setToday(t0);
  resetSeed(); resetData(); resetDays(); resetCampaigns(); resetRules(); resetDaym(); setClock(new Date(T0));
  setOutcomes(DEFAULT_OUTCOMES);
  const ago = (days: number) => iso(addDays(T0, -days));

  /* ----- Live cases (fictional people and addresses) ----- */
  // P1: Maya's follow-up due today, permit issued
  const pW = mkProp('pp', { addr: '1418 Marquette Ridge Rd', permit: 'Permit Issued', permitDate: ago(45) });
  const cW = mkCt(pW, { n: 'Laura Whitfield', phones: [{ n: '(310) 555-0142', st: 'ok' }, { n: '(424) 555-0187', st: 'untested' }] });
  mkCt(pW, { n: 'Greg Whitfield', role: 'Secondary owner', phones: [{ n: '(310) 555-0143', st: 'ok' }] });
  pastCall(cW, 'may', pastAt(14, 11, 20), 'Left VM');
  pastCall(cW, 'may', pastAt(7, 14, 5), 'Follow Up', `Meeting her architect this week. Asked to call back ${WDL[T0.getDay()]} ${fmtS(T0)} after 9 AM.`);
  cW.nextAt = TODAY;
  // Interested: P2, Left VM 27 days ago, eligible today
  const pM = mkProp('pp', { addr: '36 Corsica Hill Dr', permit: 'Permit Issued', permitDate: ago(73) });
  const cM = mkCt(pM, { n: 'Elena Marsh' });
  mkCt(pM, { n: 'David Marsh', role: 'Secondary owner' });
  pastCall(cM, 'dan', pastAt(27, 16, 40), 'Left VM');
  // Propagation: three contacts at one property
  const pB = mkProp('pp', { addr: '905 Arbolada Way', permit: 'Permit Issued', permitDate: ago(152) });
  mkCt(pB, { n: 'Michael Brandt' });
  mkCt(pB, { n: 'Karen Brandt', role: 'Secondary owner' });
  const cTB = mkCt(pB, { n: 'Tom Brandt', role: 'Other', other: 'Adult child' });
  pastCall(cTB, 'may', pastAt(3, 15, 10), 'Left VM');
  // Wrong number with one phone
  const pO = mkProp('sm', { addr: '17 Sea Meadow Ln', permit: 'Permit Issued', permitDate: ago(174) });
  mkCt(pO, { n: 'Henry Okafor' });
  // Wrong number with a second phone
  const pC = mkProp('sm', { addr: '2215 Tidecrest Dr', permit: 'Permit Issued', permitDate: ago(202) });
  mkCt(pC, { n: 'Jasmine Cole', phones: [{ n: '(310) 555-0261', st: 'ok' }, { n: '(310) 555-0262', st: 'untested' }] });
  // P3: Maya's undecided
  const pL = mkProp('pp', { addr: '4410 Avenida Lucero', permit: 'None' });
  const cL = mkCt(pL, { n: 'Sandra Liu' });
  pastCall(cL, 'may', pastAt(18, 10, 30), 'Left VM');
  pastCall(cL, 'may', pastAt(14, 12, 10), 'Undecided', 'Insurance payout still open. Open to a design-build conversation once it closes.');
  // Inbound: already in AB's sales pipeline
  const pH = mkProp('pp', { addr: '2840 Granada Crest Pl', permit: 'Plans Submitted', permitDate: ago(116), inPipe: `Inbound call ${fmtS(pastAt(5))}, taken by the AB office` });
  const cH = mkCt(pH, { n: 'Victor Haddad' });
  LEADS.push({ k: 'L-2019', prop: pH.k, ct: cH.k, rep: 'off', at: pastAt(5, 13, 25), out: 'Inbound call', note: 'Called the office after a yard sign on Granada Crest. Wants a design-build estimate.', src: 'Inbound' });
  // Max attempts
  const pX = mkProp('ad', { addr: '1730 Crestmoor Ave', permit: 'None' });
  const cX = mkCt(pX, { n: 'Raymond Varga' });
  [30, 26, 21, 15, 10, 6].forEach(d => pastCall(cX, 'pri', pastAt(d, 17, 5), 'Left VM'));
  // Do Not Call registry
  const pD = mkProp('mb', { addr: '6120 Coral Heights Ln', permit: 'None' });
  mkCt(pD, { n: 'Christine Albright', dnc: true });
  // Daniel's own follow-up due today
  const pK = mkProp('sm', { addr: '310 Cliffhaven Rd', permit: 'Plans Submitted', permitDate: ago(159) });
  const cK = mkCt(pK, { n: 'Robert Kessler' });
  pastCall(cK, 'dan', pastAt(5, 10, 45), 'Follow Up', 'Wife decides. Call back Monday morning.');
  cK.nextAt = TODAY;
  // Maya's follow-up later this week
  const pN = mkProp('pp', { addr: '1902 Halden Ave', permit: 'Permit Issued', permitDate: ago(31) });
  const cN = mkCt(pN, { n: 'Naomi Sato' });
  pastCall(cN, 'may', pastAt(4, 15, 30), 'Follow Up', 'Traveling. Call Thursday afternoon.');
  cN.nextAt = iso(addBiz(T0, 3));
  // Handed off last week by Maya
  const pE = mkProp('pp', { addr: '722 Bluffview Ter', permit: 'Permit Issued', permitDate: ago(95) });
  const cE = mkCt(pE, { n: 'Arman Petrosyan' });
  mkCt(pE, { n: 'Lena Petrosyan', role: 'Secondary owner' });
  pastCall(cE, 'may', pastAt(10, 11, 0), 'Interested', 'Has permits, wants a design-build proposal. Prefers email first.');

  /* ----- Random base (seeded) ----- */
  const PLAN: Record<AudKey, number> = { pp: 22, sm: 6, mb: 10, ad: 13 };
  for (const a of AUDK) for (let i = 0; i < PLAN[a]; i++) {
    const p = mkProp(a);
    const ln = pick(LN), nC = pick([1, 1, 1, 2, 2, 2, 2, 3, 3, 4]);
    for (let j = 0; j < nC; j++) {
      const role = j === 0 ? 'Primary owner' : j === 1 ? 'Secondary owner' : 'Other';
      const o: Partial<Contact> = { n: pick(FN) + ' ' + (j < 2 ? ln : pick(LN)), role };
      if (role === 'Other') o.other = pick(OTHER_ROLES);
      if (rnd() < 0.28) o.phones = [{ n: mkPhone(a), st: 'untested' } as Phone, { n: mkPhone(a), st: 'untested' } as Phone];
      if (rnd() < 0.02) o.supp = true;
      mkCt(p, o);
    }
  }
  /* Call history for the random base, 10 to 27 days before T0 */
  const repFor = (a: AudKey): RepKey => a === 'ad' || a === 'mb' ? pick<RepKey>(['pri', 'pri', 'dan']) : pick<RepKey>(['may', 'dan']);
  for (const c of CTS) {
    if (c.att || c.dnc) continue;
    const p = P(c.prop);
    if (PROPS.indexOf(p) < 12) continue;
    const r = rnd();
    let seq: string[];
    if (r < 0.38) seq = [];
    else if (r < 0.58) seq = ['Left VM'];
    else if (r < 0.64) seq = ['Left VM', 'Left VM'];
    else if (r < 0.70) seq = ['Not Contacted', 'Left VM'];
    else if (r < 0.79) seq = ['Left VM', 'Undecided'];
    else if (r < 0.84) seq = ['Follow Up'];
    else if (r < 0.87) seq = ['Wrong Number'];
    else if (r < 0.91) seq = ['Left VM', 'Not Interested'];
    else if (r < 0.94) seq = ['Already Building / Done'];
    else if (r < 0.96) seq = ['Do Not Contact'];
    else seq = ['Hung Up'];
    const rep = repFor(p.aud);
    let d = rint(10, 27);
    seq.forEach(o => {
      const note = o === 'Undecided' ? pick(['Still deciding between rebuilding and selling the lot.', 'Waiting on the insurance adjuster.', 'Interested in a second opinion on their plans.']) : o === 'Follow Up' ? pick(['Asked for a call next week.', 'Call back after the HOA meeting.']) : o === 'Already Building / Done' ? pick(['Signed with another builder in September.', 'Sold the lot.']) : o === 'Not Interested' ? 'Not planning to rebuild this year.' : '';
      pastCall(c, rep, pastAt(d, rint(9, 17), rint(0, 59)), o, note);
      d = Math.max(1, d - rint(3, 8));
    });
    if (c.out === 'Wrong Number') c.phones[0].st = 'bad';
    if (c.out === 'Follow Up') c.nextAt = iso(addBiz(c.lastAt!, rint(4, 9)));
  }
  cTB.nextAt = iso(addBiz(cTB.lastAt!, recallOf('Left VM').days));
  /* Propagation of the history: one no or one lead stops the rest of the property */
  for (const p of PROPS) {
    const cs = ctsOf(p.k);
    const lead = cs.find(c => isLeadOut(c.out));
    const no = cs.find(c => isNoOut(c.out));
    if (lead) {
      p.lead = p.lead || 'L-' + (SEQ.lead++);
      if (!LEADS.find(l => l.prop === p.k)) LEADS.push({ k: p.lead, prop: p.k, ct: lead.k, rep: lead.rep!, at: lead.lastAt!, out: lead.out!, note: lead.note, src: 'Outbound' });
      cs.filter(c => c !== lead).forEach(c => { c.stop = { why: 'Property handed to sales', by: lead.k }; });
    } else if (no) {
      cs.filter(c => c !== no && !isNoOut(c.out)).forEach(c => { c.stop = { why: `${no.n} said ${no.out}`, by: no.k }; });
    }
    if (cs.some(c => c.out === 'Already Building / Done')) p.started = 'Yes';
  }

  /* ===== METRICS ===== past days */
  buildDaym();

  /* ===== MORNING STATE ===== */
  morningAlloc();
  /* Priya and Daniel started before Maya and made a few calls */
  DAY.pri.st = 'started'; DAY.pri.startedAt = TODAY + 'T07:58';
  DAY.dan.st = 'started'; DAY.dan.startedAt = TODAY + 'T08:01';
  (() => {
    const seed = (rep: RepKey, outs: string[]) => {
      let t = rep === 'pri' ? [8, 0] : [8, 2];
      const l = openOf(rep).filter(c => c.k !== cK.k);
      outs.forEach((o, i) => {
        const c = l[i]; if (!c) return;
        t = [t[0], t[1] + 1];
        setClock(D(`${TODAY}T${p2(t[0])}:${p2(t[1])}`)!);
        saveOutcome(c.k, rep, o, o === 'Undecided' ? 'Wants to see AB’s rebuild portfolio first.' : '');
      });
    };
    seed('pri', ['Left VM', 'Not Contacted', 'Left VM']);
    seed('dan', ['Left VM', 'Undecided']);
    setClock(new Date(T0));
    SYNC.length = 0;
    syncLog('Fire Rebuild Contacts', 'Morning allocation', `${REPS.reduce((a, r) => a + DAY[r].list.length, 0)} contacts reserved for 3 reps, Reserved For and Campaign columns updated`);
    syncLog('Outreach Daily Metrics', fmtWD(subBiz(T0, 1)), 'Daily totals by rep pushed for the dashboard');
  })();
}
