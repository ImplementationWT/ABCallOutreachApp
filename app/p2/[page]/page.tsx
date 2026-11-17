import { AppScreen } from '@/components/shell/AppScreen';
import { APP_PAGES } from '@/lib/state/pages';

/* Calling and AI (phase 2): one route per sidebar page. */
export function generateStaticParams() {
  return APP_PAGES.p2.map(page => ({ page }));
}

export default async function Page({ params }: PageProps<'/p2/[page]'>) {
  const { page } = await params;
  return <AppScreen view="p2" page={page} />;
}
