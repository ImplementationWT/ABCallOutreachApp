import { AppScreen } from '@/components/shell/AppScreen';
import { APP_PAGES } from '@/lib/state/pages';

/* Outreach Manager: one route per sidebar page. */
export function generateStaticParams() {
  return APP_PAGES.mgr.map(page => ({ page }));
}

export default async function Page({ params }: PageProps<'/mgr/[page]'>) {
  const { page } = await params;
  return <AppScreen view="mgr" page={page} />;
}
