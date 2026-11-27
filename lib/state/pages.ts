/* Sidebar pages of each app (server-safe, used by generateStaticParams). */
export const APP_PAGES = {
  rep: ['today', 'fu', 'calls'],
  mgr: ['reports', 'live', 'pool', 'leads', 'camp', 'rules', 'users', 'outc'],
  prp: ['props', 'cts', 'imp'],
  p2: ['call', 'enrich', 'aud', 'prov'],
} as const;
