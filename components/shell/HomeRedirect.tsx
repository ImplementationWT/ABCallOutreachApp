'use client';
/* / : each user goes to their home (a rep to their list, a manager to The day by rep). Old artifact
 * links (#vista=mgr&pagina=rules) still land on their route. */
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { homeOf } from '@/lib/auth/roles';
import { useMe } from '@/lib/state/auth';
import { hashRoute } from '@/lib/state/navigation';

export function HomeRedirect() {
  const router = useRouter();
  const me = useMe(s => s.me);
  useEffect(() => { if (me) router.replace(hashRoute(location.hash) ?? homeOf(me)); }, [me, router]);
  // Nothing to show: it redirects at once (and Next keeps this page mounted, hidden, afterwards)
  return null;
}
