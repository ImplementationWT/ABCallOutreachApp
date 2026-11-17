'use client';
import { Fragment } from 'react';
import { useToast } from '@/lib/state/store';
import { Icon } from '@/components/ui';

/* The toast at the bottom (toast() in artifact/app.html). Its content is replaced on every call,
 * like the artifact's innerHTML, while the box keeps its fade. */
export function Toast() {
  const { msg, on, n } = useToast();
  return <div className={`toast ${on ? 'on' : ''}`} id="toast" role="status" aria-live="polite">{msg ? <Fragment key={n}><Icon n="check" s={16} />{msg}</Fragment> : null}</div>;
}
