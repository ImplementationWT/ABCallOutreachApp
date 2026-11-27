'use client';
/* A call button for one number of a contact. It goes through the dialer (lib/dialer), so a phone
 * provider can replace the manual tel: link without changing the views. Never rendered for a number
 * marked wrong or one that cannot be dialed. */
import type React from 'react';
import { telHref, type Contact } from '@/lib/domain';
import { dialer } from '@/lib/dialer';
import { dispatch } from '@/lib/state/actions';

export function CallLink({ c, i, className, label, children, select }: { c: Contact; i: number; className: string; label: string; children: React.ReactNode; select?: boolean }) {
  const ph = c.phones[i];
  if (!ph || ph.st === 'bad' || !telHref(ph.n)) return null;
  const href = dialer.href(ph.n);
  const go = (e: React.MouseEvent) => {
    e.stopPropagation(); // in the list, the row behind would select it again
    if (!href) e.preventDefault();
    if (select) dispatch('qsel', c.k);
    void dialer.start({ ct: c.k, idx: i, number: ph.n });
    dispatch('dial', `${c.k}|${i}`);
  };
  return <a className={className} href={href ?? '#'} onClick={go} aria-label={label} title={label} data-call={`${c.k}|${i}`} data-tel={telHref(ph.n)!}>{children}</a>;
}
