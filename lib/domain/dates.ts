/* ===== DATES ===== (artifact/app.html)
 * The artifact ran on a fixed demo day (Mon, Nov 2, 2026, 8:20 AM). Here "today" is the real day:
 * T0 and TODAY are the moment the app loaded (live bindings, updated by setToday()), and the clock
 * is the real time. buildWorld() (the seed) sets T0 to the day it seeds and simulates the clock
 * while it writes the seeded calls, as the artifact's CLOCK did. */

export let T0 = new Date();
export let TODAY = '';
export function setToday(d: Date) { T0 = new Date(d); TODAY = iso(T0); }

/** null: real time. A date: the seed's simulated clock, moved forward by nowT(). */
let sim: Date | null = null;
export const getClock = () => sim ? new Date(sim) : new Date();
export const setClock = (d: Date | null) => { sim = d ? new Date(d) : null; };
export const nowT = (m = 1) => { if (!sim) return new Date(); sim = new Date(sim.getTime() + m * 60000); return new Date(sim); };

export const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const p2 = (n: number) => String(n).padStart(2, '0');

export type DateLike = string | Date | null | undefined;

/** Parses 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' as local time. */
export function D(s: Date): Date;
export function D(s: DateLike): Date | null;
export function D(s: DateLike): Date | null {
  if (s instanceof Date) return new Date(s);
  if (!s) return null;
  const [d, t] = String(s).split('T');
  const [y, m, dd] = d.split('-').map(Number);
  const [h, mi] = (t || '0:0').split(':').map(Number);
  return new Date(y, m - 1, dd, h || 0, mi || 0);
}
/** Same as D() for values known to be set. */
export const Dx = (s: string | Date) => D(s as Date);
export const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const isoT = (d: Date) => `${iso(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
export const fmtD = (x: DateLike) => { const d = D(x); return d ? `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : 'Not set'; };
export const fmtS = (x: DateLike) => { const d = D(x); return d ? `${MON[d.getMonth()]} ${d.getDate()}` : ''; };
export const fmtT = (x: string | Date) => { const d = Dx(x); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${p2(d.getMinutes())} ${ap}`; };
export const fmtDT = (x: string | null | undefined) => x ? `${fmtS(x)}, ${fmtT(x)}` : 'Not yet';
export const fmtWD = (x: string | Date) => { const d = Dx(x); return `${WD[d.getDay()]}, ${fmtS(d)}`; };
export const fmtUS = (x: string | Date) => { const d = Dx(x); return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`; };
export const addDays = (d: string | Date, n: number) => { const x = Dx(d); x.setDate(x.getDate() + n); return x; };
export const isBiz = (d: string | Date) => { const w = Dx(d).getDay(); return w !== 0 && w !== 6; };
export const addBiz = (d: string | Date, n: number) => { let x = Dx(d); let k = 0; while (k < n) { x = addDays(x, 1); if (isBiz(x)) k++; } return x; };
export const nextBiz = (d: string | Date) => addBiz(d, 1);
/** n business days before d. */
export const subBiz = (d: string | Date, n: number) => { let x = Dx(d); let k = 0; while (k < n) { x = addDays(x, -1); if (isBiz(x)) k++; } return x; };
export const daysBetween = (a: string | Date, b: string | Date) => Math.round((Dx(iso(Dx(b))).getTime() - Dx(iso(Dx(a))).getTime()) / 864e5);
export const relDay = (x: string | Date) => { const n = daysBetween(TODAY, x); if (n === 0) return 'today'; if (n === 1) return 'tomorrow'; if (n === -1) return 'yesterday'; return n > 0 ? `in ${n} days` : `${-n} days ago`; };
export const pct = (a: number, b: number) => b ? Math.round(a * 100 / b) + '%' : '0%';
setToday(T0);
