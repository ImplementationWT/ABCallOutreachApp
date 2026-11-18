import { Suspense } from 'react';
import { AppScreen } from '@/components/shell/AppScreen';
import { APP_PAGES } from '@/lib/state/pages';

/* Properties: one route per sidebar page. */
export function generateStaticParams() {
  return APP_PAGES.prp.filter(p => p !== 'props').map(page => ({ page }));
}

// params are read inside Suspense, so the rest of the page (the frame) stays instant on navigation.
export default function Page({ params }: PageProps<'/prp/[page]'>) {
  return <Suspense fallback={null}><Route params={params} /></Suspense>;
}
async function Route({ params }: { params: PageProps<'/prp/[page]'>['params'] }) {
  const { page } = await params;
  return <AppScreen view="prp" page={page} />;
}
