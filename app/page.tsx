import { AppScreen } from '@/components/shell/AppScreen';
import { HashRedirect } from '@/components/shell/HashRedirect';

/* Sign in (loginPage). */
export default function Page() {
  return <><HashRedirect /><AppScreen view="in" /></>;
}
