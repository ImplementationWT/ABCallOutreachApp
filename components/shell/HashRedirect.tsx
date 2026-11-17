'use client';
/* Old artifact links (#vista=mgr&pagina=rules) land on their route. */
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { hashRoute } from '@/lib/state/navigation';

export function HashRedirect() {
  const router = useRouter();
  useEffect(() => { const to = hashRoute(location.hash); if (to) router.replace(to); }, [router]);
  return null;
}
