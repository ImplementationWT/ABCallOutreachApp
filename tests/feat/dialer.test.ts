/* feat/campaign-filtering, point 3: manual dialing. One normalized number for the tel: link, never a
 * number marked wrong, and the views depend only on the dialer interface (lib/dialer), so a phone
 * provider can replace the manual dialer without touching them. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dialable, normalizePhone, telHref } from '../../lib/domain';

describe('normalized number', () => {
  it.each([
    ['(310) 555-0142', '+13105550142'],
    ['310.555.0142', '+13105550142'],
    ['1-424-555-0187', '+14245550187'],
    ['+1 (626) 555 0100', '+16265550100'],
    ['+44 20 7946 0958', '+442079460958'],
    ['(310) 555-0142 ext. 12', '+13105550142'],
  ])('%s -> %s', (raw, e164) => {
    expect(normalizePhone(raw)).toBe(e164);
    expect(telHref(raw)).toBe('tel:' + e164);
  });
  it.each(['', '555-0142', '(010) 555-0142', 'abc', '+12'])('%s cannot be dialed', raw => {
    expect(normalizePhone(raw)).toBeNull();
    expect(telHref(raw)).toBeNull();
  });
});

describe('numbers offered to call', () => {
  it('a number marked wrong is never offered; the index in phones is kept', () => {
    const c = { phones: [{ n: '(310) 555-0142', st: 'bad' as const }, { n: '555', st: 'untested' as const }, { n: '(424) 555-0187', st: 'ok' as const }] };
    expect(dialable(c)).toEqual([{ n: '(424) 555-0187', st: 'ok', i: 2 }]);
  });
});

describe('the views only use the dialer', () => {
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []);
  it('no component builds a tel: link itself', () => {
    const root = join(__dirname, '..', '..');
    const offenders = [...files(join(root, 'components')), ...files(join(root, 'app'))].filter(f => /['"`]tel:/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('the call link goes through lib/dialer', () => {
    const src = readFileSync(join(__dirname, '..', '..', 'components', 'rep', 'CallLink.tsx'), 'utf8');
    expect(src).toContain("from '@/lib/dialer'");
    expect(src).toContain('dialer.href(');
    expect(src).toContain('dialer.start(');
  });
});
