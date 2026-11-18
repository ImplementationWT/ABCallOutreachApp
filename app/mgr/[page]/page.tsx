import { Suspense } from 'react';
import { AppScreen } from '@/components/shell/AppScreen';
import { APP_PAGES } from '@/lib/state/pages';

/* Outreach Manager: one route per sidebar page. */
export function generateStaticParams() {
  return APP_PAGES.mgr.map(page => ({ page }));
}

// params are read inside Suspense, so the rest of the page (the frame) stays instant on navigation.
export default function Page({ params }: PageProps<'/mgr/[page]'>) {
  return <Suspense fallback={null}><Route params={params} /></Suspense>;
}
async function Route({ params }: { params: PageProps<'/mgr/[page]'>['params'] }) {
  const { page } = await params;
  return <AppScreen view="mgr" page={page} />;
}
