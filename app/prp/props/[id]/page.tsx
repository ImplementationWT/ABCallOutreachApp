import { AppScreen } from '@/components/shell/AppScreen';

/* Property record (prpRecord), with its tabs. The records live in MongoDB, so the page is a
 * shell rendered for any id; the first seeded id is listed because Cache Components needs one. */
export function generateStaticParams() {
  return [{ id: 'P-1001' }];
}

export default async function Page({ params }: PageProps<'/prp/props/[id]'>) {
  const { id } = await params;
  return <AppScreen view="prp" page="props" det={id} />;
}
