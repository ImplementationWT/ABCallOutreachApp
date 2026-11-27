'use client';
/* The dialer: how the app places a call. The views only use this interface (components/rep/CallLink),
 * so a phone provider (RingCentral, later) replaces the manual dialer here without touching them.
 *
 * Manual dialer (today): the call link is a tel: link with the normalized number, so the rep's own
 * phone or softphone dials it, and the app marks the contact as "calling" so the rep records the
 * result in the same view when they hang up. */
import { telHref } from '@/lib/domain';

export type DialTarget = { ct: string; idx: number; number: string };
export interface Dialer {
  /** Shown to the rep: who places the call. */
  readonly via: string;
  /** href of the call link, or null when the dialer places the call itself (start). */
  href(number: string): string | null;
  /** The rep clicked call: a provider would start the call here; the manual dialer has nothing to do. */
  start(t: DialTarget): void | Promise<void>;
}

export const manualDialer: Dialer = {
  via: 'your phone',
  href: n => telHref(n),
  start: () => {},
};

/** The dialer the app uses. */
export const dialer: Dialer = manualDialer;
