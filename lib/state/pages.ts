/* Sidebar pages of each app (server-safe, used by generateStaticParams). */
export const APP_PAGES = {
  rep: ['today', 'fu', 'calls', 'help'],
  mgr: ['live', 'pool', 'leads', 'camp', 'rules', 'perf', 'mail', 'sync', 'help'],
  prp: ['props', 'cts', 'imp', 'help'],
  p2: ['call', 'enrich', 'aud', 'prov', 'help'],
} as const;
