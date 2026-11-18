'use client';
/* ===== STATE ===== (artifact/app.html)
 * S is the artifact's UI state, kept as one mutable object so every action reads like the artifact.
 * Domain records (lib/domain) are mutated in place too. After each action the zustand store bumps
 * `rev`, and every component that called useApp() re-renders, which replaces the artifact's render().
 */
import { create } from 'zustand';
import type { RepKey } from '@/lib/domain';

export type AppKey = 'rep' | 'mgr' | 'prp' | 'p2';
export type ViewKey = 'in' | AppKey | 'db';
export type Draft = { out: string | null; note: string; fu: string | null };
export type Pop =
  | { t: 'pick'; key: string; x: number; y: number; q: string; kb: number; cur?: string }
  | { t: 'cal'; key: string; x: number; y: number; m: Date; sel?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Modal = { k: string; [x: string]: any };

export type State = {
  view: ViewKey;
  page: Record<AppKey, string>;
  det: Partial<Record<AppKey, string | null>>;
  tab: Partial<Record<AppKey, string>>;
  f: Record<string, string | boolean>;
  user: RepKey;
  sel: Partial<Record<RepKey, string | null>>;
  draft: Record<string, Draft>;
  srch: Record<string, string>;
  modal: Modal | null;
  pop: Pop | null;
  hl: string | null;
  top: boolean;
  tour: { on: boolean; i: number; col: boolean; list: boolean; x: number | null; y: number | null };
  /** Pagination of each table: page index and rows per page (components/ui Pager). */
  pg: Record<string, { i: number; n: number }>;
};

/** Rows per page a table can show; the first is the default. */
export const PAGE_SIZES = [20, 30, 50];

export const S: State = {
  view: 'in', page: { rep: 'today', mgr: 'live', prp: 'props', p2: 'call' }, det: {}, tab: {},
  f: { pool: 'pool', prst: 'all', praud: 'all', perf: 'last', perfp: 'day', perfd: '', mail: 'rep', mailrep: 'may', dbm: 'az', script: false, campv: 'today' },
  user: 'may', sel: {}, draft: {}, srch: {}, modal: null, pop: null, hl: null, top: false,
  tour: { on: false, i: 0, col: false, list: false, x: null, y: null },
  pg: {},
};

/* ===== STORE ===== localStorage with the artifact's prefix */
export const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem('abc-demo-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem('abc-demo-' + k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};

export const EMP0 = 'Arzuman Brothers';
/** Company name shown in the brand; double click to rename (persisted as abc-demo-emp). */
export const brand = { emp: EMP0 };

export const APPS: [AppKey, string, string, string][] = [['rep', 'Rep Workspace', 'headset', 'tg'], ['mgr', 'Outreach Manager', 'target', 'tb'], ['prp', 'Properties', 'home', 'ta'], ['p2', 'Calling and AI', 'spark', 'tv']];
export const APPN = Object.fromEntries(APPS.map(a => [a[0], a[1]])) as Record<AppKey, string>;
export const APP_FASE: Record<AppKey, 'ahora' | 'luego'> = { rep: 'ahora', mgr: 'ahora', prp: 'ahora', p2: 'luego' };

type Rev = { rev: number; bump: () => void };
export const useRev = create<Rev>(set => ({ rev: 0, bump: () => set(s => ({ rev: s.rev + 1 })) }));
export const bump = () => useRev.getState().bump();
/** Subscribes the component to every state change and returns S. */
export function useApp() { useRev(s => s.rev); return S; }

/* Toast: its own tiny store so it can fade without re-rendering the app */
type ToastState = { msg: string; on: boolean; n: number };
export const useToast = create<ToastState>(() => ({ msg: '', on: false, n: 0 }));
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export const toast = (msg: string) => {
  useToast.setState(s => ({ msg, on: true, n: s.n + 1 }));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => useToast.setState({ on: false }), 3200);
};
