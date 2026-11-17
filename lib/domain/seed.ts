/* ===== SEEDED GENERATOR ===== (artifact/app.html)
 * mulberry32. Every call site must run in the same order as in the artifact so names,
 * addresses, phones and metrics come out identical. Only lib/domain/world.ts drives it.
 */
let SEED = 20261102;

export const rnd = () => {
  SEED |= 0; SEED = SEED + 0x6D2B79F5 | 0;
  let t = Math.imul(SEED ^ SEED >>> 15, 1 | SEED);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
export const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
export const rint = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
