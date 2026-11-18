import { Suspense } from 'react';
import { AppScreen } from '@/components/shell/AppScreen';

/* Property record (prpRecord), with its tabs. The records live in MongoDB, so the page is a
 * shell rendered for any id; the first seeded id is listed because Cache Components needs one. */
export function generateStaticParams() {
  return [{ id: 'P-1001' }];
}

// params are read inside Suspense, so the rest of the page (the frame) stays instant on navigation.
export default function Page({ params }: PageProps<'/prp/props/[id]'>) {
  return <Suspense fallback={null}><Route params={params} /></Suspense>;
}
async function Route({ params }: { params: PageProps<'/prp/props/[id]'>['params'] }) {
  const { id } = await params;
  return <AppScreen view="prp" page="props" det={id} />;
}
