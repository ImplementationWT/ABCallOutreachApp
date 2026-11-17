# Arzuman Brothers Call Center

Port a Next.js (App Router, TypeScript) + Tailwind CSS 4 de la demo v1 del Call Center de Arzuman Brothers.
La fuente de verdad es [`artifact/app.html`](artifact/app.html) (versión en [`artifact/VERSION`](artifact/VERSION)).
Mismo aspecto, mismos textos, mismos datos y mismo comportamiento. Todo corre en el cliente; no hay backend,
login real ni sincronización con monday todavía.

## Cómo correrlo

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # build de producción (94 páginas estáticas)
npm run lint
npm test             # determinismo: el mundo sembrado es idéntico al del artifact
npx playwright install chromium   # una vez
npm run test:e2e     # compara la app con artifact/app.html (necesita npm run build antes)
```

`npm run test:e2e` levanta `next start` en el puerto 3217 y corre:

- `tests/e2e/compare.spec.ts`: captura del artifact y de la app en cada ruta, en claro, oscuro y ancho de móvil,
  con diff de píxeles. Las imágenes quedan en `test-results/compare/`.
- `tests/e2e/flow.spec.ts` y `more.spec.ts`: el mismo recorrido con clics en el artifact y en la app
  (Maya, Andrew, fichas, Data, Walkthrough completo); los textos y toasts de ambos deben coincidir.

## Rutas

| Ruta | Vista del artifact |
| --- | --- |
| `/` | Sign in (`loginPage`): Maya, Daniel, Priya y Andrew |
| `/rep/today` · `/rep/fu` · `/rep/calls` · `/rep/help` | Rep Workspace: My Outbound Dashboard, My follow-ups, My calls today, How it works |
| `/mgr/live` · `pool` · `leads` · `camp` · `rules` · `perf` · `mail` · `sync` · `help` | Outreach Manager |
| `/prp/props` · `/prp/cts` · `/prp/imp` · `/prp/help` | Properties |
| `/prp/props/[id]` | Ficha de propiedad (`prpRecord`, con pestañas), p. ej. `/prp/props/P-1003` |
| `/p2/call` · `enrich` · `aud` · `prov` · `help` | Calling and AI (fase 2, con el banner de fase) |
| `/data` | Data (`dbPage`): modos A to Z, Tables, Access by app, Where it runs |

Los enlaces antiguos del artifact (`/#vista=mgr&pagina=rules`) redirigen a su ruta.

## Estructura

```
app/                 rutas (cada página renderiza <AppScreen> con sus params)
components/shell/    TopBar, Sidebar, AppScreen, Layer (modal y popovers), Toast, Tour, HelpPage, Shell
components/ui/       Icon (mapa IC), Pill y variantes, Avatar, PageHeader, Kv, Bar, StatFilter, Picker, DateField
components/rep|mgr|prp|p2|data|signin/   una pieza por cada función de página del artifact
lib/domain/          dominio puro y tipado, sin DOM: fechas, semilla, catálogos, reglas, datos, motor, métricas,
                     help, datamodel, tour; world.ts construye el mundo sembrado en el orden del artifact
lib/state/           estado S, acciones A/IN con los mismos nombres, navegación (S <-> URL)
styles/artifact/     el CSS del artifact, un archivo por sección
artifact/            app.html (no se modifica), VERSION y MAPA.md
tests/               determinismo (vitest) y comparación con el artifact (Playwright)
```

Cómo encaja cada sección del artifact en el repo, y las adaptaciones hechas, está en [`artifact/MAPA.md`](artifact/MAPA.md).
