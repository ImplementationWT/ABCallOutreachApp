import { AppScreen } from '@/components/shell/AppScreen';
import { APP_PAGES } from '@/lib/state/pages';

/* Rep Workspace: one route per sidebar page. */
export function generateStaticParams() {
  return APP_PAGES.rep.map(page => ({ page }));
}

export default async function Page({ params }: PageProps<'/rep/[page]'>) {
  const { page } = await params;
  return <AppScreen view="rep" page={page} />;
}
