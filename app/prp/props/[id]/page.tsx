import { AppScreen } from '@/components/shell/AppScreen';
import { PROPS } from '@/lib/domain';

/* Property record (prpRecord), with its tabs. Every seeded property is prerendered. */
export function generateStaticParams() {
  return PROPS.map(p => ({ id: p.k }));
}

export default async function Page({ params }: PageProps<'/prp/props/[id]'>) {
  const { id } = await params;
  return <AppScreen view="prp" page="props" det={id} />;
}
