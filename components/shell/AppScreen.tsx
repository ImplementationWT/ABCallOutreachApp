'use client';
/* renderApp(k) and the view sections of render() in artifact/app.html.
 * Each route renders <AppScreen> with its params; the content itself comes from S, the same as in
 * the artifact, so an action that navigates shows its result before the URL push lands. */
import type React from 'react';
import { useId, useLayoutEffect } from 'react';
import { applyRoute, type Route } from '@/lib/state/navigation';
import { loadState, useData } from '@/lib/state/persist';
import { useMe } from '@/lib/state/auth';
import { VIEW_PERM, homeOf } from '@/lib/auth/roles';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { APP_FASE, S, bump, useApp, type AppKey } from '@/lib/state/store';
import { PhaseBanner } from '@/components/ui';
import { HelpPage } from './HelpPage';
import { SignIn } from '@/components/signin/SignIn';
import { RepSide, RepPages } from '@/components/rep';
import { MgrSide, MgrPages } from '@/components/mgr';
import { PrpSide, PrpPages, PrpRecord } from '@/components/prp';
import { P2Side, P2Pages } from '@/components/p2';
import { DataPage } from '@/components/data/DataPage';

type View = { side: () => React.ReactNode; pages: Record<string, () => React.ReactNode>; det?: (k: string) => React.ReactNode };
export const VIEWS: Record<AppKey, View> = {
  rep: { side: RepSide, pages: RepPages },
  mgr: { side: MgrSide, pages: MgrPages },
  prp: { side: PrpSide, pages: PrpPages, det: k => <PrpRecord k={k} /> },
  p2: { side: P2Side, pages: P2Pages },
};

function renderApp(k: AppKey) {
  const vw = VIEWS[k];
  let body: React.ReactNode;
  const det = S.det[k];
  if (S.page[k] === 'help') body = <HelpPage k={k} />;
  else if (det && vw.det) body = vw.det(det);
  else { const Pg = vw.pages[S.page[k]] || Object.values(vw.pages)[0]; body = <Pg key={S.page[k]} />; }
  return <div className="oapp"><aside className="sb">{vw.side()}</aside><div className="op">{APP_FASE[k] === 'luego' ? <PhaseBanner /> : null}{body}</div></div>;
}

/* With cacheComponents, Next keeps up to 3 previous routes mounted and hidden (<Activity>). Their
 * layout effects are cleaned up while hidden: a hidden route renders nothing and leaves S alone,
 * otherwise its copy of the view (built from the shared S) would sit in the DOM twice. */
const hidden = new Set<string>();
const setHidden = (id: string, h: boolean) => { if (h) hidden.add(id); else hidden.delete(id); bump(); };

export function AppScreen(route: Route) {
  const id = useId();
  useLayoutEffect(() => {
    if (hidden.has(id)) setHidden(id, false);
    return () => setHidden(id, true);
  }, [id]);
  useApp();
  const data = useData();
  const me = useMe(s => s.me);
  const router = useRouter();
  const isHidden = hidden.has(id);
  if (!isHidden) applyRoute(route);
  const blocked = !isHidden && !!me && !me.perms.includes(VIEW_PERM[S.view]);
  const home = me ? homeOf(me) : '/';
  // A section the user may not open: back to their home (a rep to their own list)
  useEffect(() => { if (blocked) router.replace(home); }, [blocked, home, router]);
  if (isHidden) return null;
  if (blocked) return <section className="view" key="denied"><div className="op"><div className="empty">You do not have access to this section.</div></div></section>;
  if (data.status !== 'ready' || !me) return <section className="view" key="data"><div className="op"><div className="empty">
    {data.status === 'loading' ? 'Loading data from the database…' : <>Could not load the data: {data.error}. <button className="btn ghost sm" onClick={() => void loadState()}>Try again</button></>}
  </div></div></section>;
  const v = S.view;
  if (v === 'in') return <section className="view" key="in"><div id="inview"><SignIn /></div></section>;
  if (v === 'db') return <section className="view" key="db"><div id="dbview"><DataPage /></div></section>;
  return <section className="view" key={v} id={'v-' + v}>{renderApp(v)}</section>;
}
