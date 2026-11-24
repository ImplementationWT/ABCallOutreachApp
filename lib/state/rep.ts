'use client';
/* Rep helpers from REPWORKSPACE in artifact/app.html that depend on the signed-in rep (S.user). */
import { C, CTS, DAY, OUT, P, PRANK, openOf, priOf, type Contact, type RepKey } from '@/lib/domain';
import { S } from './store';

/* A property's contacts stay together, ordered by the best priority among them */
const grpBest = (c: Contact) => Math.min(...openOf(S.user).filter(x => x.prop === c.prop).map(x => PRANK[priOf(x)]));
const grpFirst = (c: Contact) => Math.min(...DAY[S.user].list.map((k, i) => C(k).prop === c.prop ? i : 1e9));
export const queueSort = (a: Contact, b: Contact) => grpBest(a) - grpBest(b) || grpFirst(a) - grpFirst(b) || PRANK[priOf(a)] - PRANK[priOf(b)] || DAY[S.user].list.indexOf(a.k) - DAY[S.user].list.indexOf(b.k);
export const myFollowUps = (u: RepKey) => CTS.filter(c => c.rep === u && !!c.out && !!OUT[c.out]?.sameRep && !c.stop && !P(c.prop).lead && c.nextAt);
