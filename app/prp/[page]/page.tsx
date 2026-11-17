import { AppScreen } from '@/components/shell/AppScreen';
import { APP_PAGES } from '@/lib/state/pages';

/* Properties: one route per sidebar page. */
export function generateStaticParams() {
  return APP_PAGES.prp.filter(p => p !== 'props').map(page => ({ page }));
}

export default async function Page({ params }: PageProps<'/prp/[page]'>) {
  const { page } = await params;
  return <AppScreen view="prp" page={page} />;
}
