import { Suspense } from 'react';
import { AppScreen } from '@/components/shell/AppScreen';
import { APP_PAGES } from '@/lib/state/pages';

/* Calling and AI (phase 2): one route per sidebar page. */
export function generateStaticParams() {
  return APP_PAGES.p2.map(page => ({ page }));
}

// params are read inside Suspense, so the rest of the page (the frame) stays instant on navigation.
export default function Page({ params }: PageProps<'/p2/[page]'>) {
  return <Suspense fallback={null}><Route params={params} /></Suspense>;
}
async function Route({ params }: { params: PageProps<'/p2/[page]'>['params'] }) {
  const { page } = await params;
  return <AppScreen view="p2" page={page} />;
}
