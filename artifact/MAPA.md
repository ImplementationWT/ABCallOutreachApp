# Mapa artifact → repo

Versión del artifact: ver [`VERSION`](VERSION). Fuente: [`app.html`](app.html), que no se modifica.

Para aplicar una versión nueva del artifact: busca la sección cambiada por su comentario
`/* ===== NOMBRE ===== */` (o por el nombre de la función) en la tabla y aplica el cambio en el archivo indicado,
respetando las adaptaciones del final.

## CSS

Cada sección del `<style>` es un archivo en `styles/artifact/`, con el contenido literal dentro de
`@layer components`. Se importan en orden desde `app/globals.css`.

| Sección del artifact | Archivo |
| --- | --- |
| `<style>` de la línea 1 (esqueleto del host) | `styles/artifact/skeleton.css` |
| Tokens `:root`, modo oscuro, base, tonos `.tg/.ta/.tb/.tv/.tr` (inicio del `<style>`) | `styles/artifact/00-tokens-base.css` |
| `Top bar` | `styles/artifact/01-top-bar.css` |
| `App layout` | `styles/artifact/02-app-layout.css` |
| `Stats as filters` | `styles/artifact/03-stats.css` |
| `Buttons and pills` | `styles/artifact/04-buttons-pills.css` |
| `Lists` | `styles/artifact/05-lists.css` |
| `Cards` | `styles/artifact/06-cards.css` |
| `Record page (ficha)` | `styles/artifact/07-record-page.css` |
| `Issue and traceback` | `styles/artifact/08-issue-traceback.css` |
| `Timeline` | `styles/artifact/09-timeline.css` |
| `Messages` | `styles/artifact/10-messages.css` |
| `Picker, calendar, modal` | `styles/artifact/11-picker-calendar-modal.css` |
| `Email preview` | `styles/artifact/12-email-preview.css` |
| `Phone` | `styles/artifact/13-phone.css` |
| `Week` | `styles/artifact/14-week.css` |
| `KPIs` | `styles/artifact/15-kpis.css` |
| `Help and data` | `styles/artifact/16-help-data.css` |
| `Tour` | `styles/artifact/17-tour.css` |
| `/* calendar month, legend, trade parents */` y `/* operator tips */` | `styles/artifact/18-month-legend-tips.css` |
| `Call Center: sign in` | `styles/artifact/19-sign-in.css` |
| `Rep: start workday` | `styles/artifact/20-rep-start.css` |
| `Rep: work view` | `styles/artifact/21-rep-work.css` |
| `Manager` | `styles/artifact/22-manager.css` |
| `<link>` de Google Fonts (Figtree) | `next/font` en `app/layout.tsx` (variable `--font-figtree`) |
| `<title>` y favicon | `metadata` en `app/layout.tsx`; el título dinámico, en `components/shell/Shell.tsx` |

Los tokens también están expuestos a Tailwind en `app/globals.css` (`@theme inline`): `bg-n50`, `text-g600`,
`border-v100`, `shadow-sh-2`, etc.

## JavaScript

| Sección / función del artifact | Archivo |
| --- | --- |
| `IC`, `ico()` | `components/ui/icons.ts`, `Icon` en `components/ui/index.tsx` |
| `esc()` | no hace falta: JSX escapa el texto |
| `DATES` (`T0`, `CLOCK`, `nowT`, formatos, `addBiz`...) | `lib/domain/dates.ts` (fecha real; `T0`/`TODAY` vía `setToday()`, `CLOCK` → `getClock()`) |
| `STORE` (localStorage `abc-demo-*`) | `lib/state/store.ts` (`store`) |
| `SEEDED GENERATOR` | `lib/domain/seed.ts` |
| `PEOPLE` | `lib/domain/people.ts` |
| `CATALOGS` (`AUDS`, `OUT`, `PRI`, `ST_RANK`, `ST_TONE`...) | `lib/domain/catalogs.ts` (también `PRANK`) |
| `RULES` (`CFG`, `demoN`) | `lib/domain/rules.ts` |
| `CAMPAIGNS` | `lib/domain/campaigns.ts` |
| `PROPERTIES AND CONTACTS`: `FN`, `LN`, `mkPhone`, `mkProp`, `mkCt`, `P`, `C`, `ctsOf`, `ctByName`, `fullAddr` | `lib/domain/data.ts` (`PSEQ`... → `SEQ`) |
| `pastCall`, `nextFor`, `pastAt` | `lib/domain/engine.ts` |
| Live cases, Random base, Call history, Propagation | `lib/domain/world.ts` |
| `ASSIGNMENT ENGINE` (`DAY`, `elig`, `priOf`, `propStatus`, `ownerOf`, `freeGroups`, `reserve`, `morningAlloc`, `listOf`, `openOf`, `docOf`, `requestMore`, `startDay`, `endDay`, `effectsOf`, `phIdx`, `saveOutcome`) | `lib/domain/engine.ts` |
| `syncLog` | `lib/domain/data.ts` |
| `METRICS` (`mOf`, `callsOn`, `DAYM`, `mDay`, `PASTDAYS`, `LASTDAY`) | `lib/domain/metrics.ts` (el IIFE de `DAYM` → `buildDaym()`, llamado desde `world.ts`) |
| `MORNING STATE` | `lib/domain/world.ts` |
| Mundo sembrado completo (Live cases ... MORNING STATE) | `buildWorld()` en `lib/domain/world.ts`; solo lo usan `npm run db:seed` y los tests |
| `STATE` (`S`, `EMP`, `APPS`, `APPN`, `APP_FASE`) | `lib/state/store.ts` (`EMP` → `brand.emp`) |
| `VIEWS` | `components/shell/AppScreen.tsx` |
| `A`, `IN`, `PK`, `DK` | `lib/state/actions.ts` (mismos nombres) |
| `MODALS` (`replist`, `reassign`, `newcamp`) | `components/mgr/modals.tsx` |
| `COMMON PIECES`: `pill`, `av`, `head`, `statF`, `kv`, `prTag`, `outPill`, `stPill`, `audPill`, `permitPill`, `p2tag`, `bar`, `picker`, `datef`, `phaseBan` | `components/ui/index.tsx` (`Pill`, `Avatar`, `PageHeader`, `StatFilter`, `Kv`, `PrTag`, `OutPill`, `StPill`, `AudPill`, `PermitPill`, `P2Tag`, `Bar`, `Picker`, `DateField`, `PhaseBanner`) |
| `sbar` | `components/shell/Sidebar.tsx` |
| `toast` | `lib/state/store.ts` + `components/shell/Toast.tsx` |
| `NAVIGATION` (`go`, `openProp`) | `lib/state/navigation.ts` (más el mapeo S ↔ URL) |
| `RENDER`: `whoNow`, `renderTop` | `components/shell/TopBar.tsx` (sin las pestañas de apps) |
| `RENDER`: pestañas de apps de `renderTop` y `badges` | `components/shell/AppSwitcher.tsx` (desplegable arriba del sidebar) |
| `renderApp`, `render` | `components/shell/AppScreen.tsx`; scroll arriba, `S.hl`, `document.title` en `components/shell/Shell.tsx` |
| `renderLayer`, `popHtml` | `components/shell/Layer.tsx` |
| `GENERIC ACTIONS` | `lib/state/actions.ts` |
| `SIGN IN` (`loginPage`, `A.signin`) | Eliminado: con el login real, `/` lleva a cada usuario a su inicio (`components/shell/HomeRedirect.tsx`) |
| `REP WORKSPACE` (`repToday`, `repStart`, `repEnded`, `repWork`, `qItem`, `repDetail`, `sibRow`, `histList`, `scriptFor`, `repFollowUps`, `repCalls`) | `components/rep/index.tsx` |
| `grpBest`, `grpFirst`, `queueSort`, `myFollowUps` | `lib/state/rep.ts` |
| `OUTREACH MANAGER` (`mgrLive`, `mgrPool` + `POOLF`, `mgrLeads`, `mgrCamps`, `mgrRules`, `perfTable`, `mgrPerf`, `mgrMail`, `mgrSync`) | `components/mgr/index.tsx` |
| `dupCheck` | `lib/domain/engine.ts` |
| `PROPERTIES` (`prpList` + `STS`, `prpRecord`, `prpContacts`, `prpImport`) | `components/prp/index.tsx` |
| `CALLING AND AI (phase 2)` (`p2Call`, `p2Enrich`, `p2Aud`, `p2Prov`) | `components/p2/index.tsx` |
| `HOW IT WORKS` (`HELP`, `helpPage`) | `lib/domain/help.ts`, `components/shell/HelpPage.tsx` |
| `DATA` (`DGR`, `DBS`, `ACC`, `AZ`, `DBN`, `dbPage`) | `lib/domain/datamodel.ts`, `components/data/DataPage.tsx` |
| `SIDEBAR PAGES` (`pg_*`) | `lib/state/actions.ts` |
| `WALKTHROUGH`: textos de `TOUR` | `lib/domain/tour.ts` |
| `WALKTHROUGH`: `go` de cada paso, `TOUR_MAS`, `ensureMay`, `selMay`, `tourShow`, acciones `tour*` | `lib/state/actions.ts` (`TOUR_GO[i]` es el `go` del paso `i`) |
| `renderTour` y el arrastre del panel | `components/shell/Tour.tsx` |
| `EVENTS`: `dispatch`, click por `data-act`, input por `data-in` | `lib/state/actions.ts` (`dispatch`, `on()`, `inp()`) |
| `EVENTS`: clic fuera del popover, teclado (Escape, flechas del picker, Enter/Espacio), resize | `components/shell/Shell.tsx` |
| `EVENTS`: renombrar la marca (doble clic) | `components/shell/TopBar.tsx` |
| `EVENTS`: `change` de reglas (`cfg.*`) | `components/mgr/index.tsx` (onChange de los inputs de reglas) |
| `EVENTS`: `change` del archivo de carga | `components/prp/index.tsx` (`prpImport`) |
| `BOOT`: tema guardado | script en `app/layout.tsx` (antes de pintar) y `components/shell/Shell.tsx` |
| `BOOT`: `#vista=...&pagina=...` | `components/shell/HashRedirect.tsx` + `hashRoute()` en `lib/state/navigation.ts` |

## Rutas ↔ estado

| Estado del artifact | Ruta |
| --- | --- |
| `S.view = 'in'` | `/` |
| `S.view = app`, `S.page[app] = pg` | `/<app>/<pg>` (`rep`, `mgr`, `prp`, `p2`) |
| `S.view = 'prp'`, `S.det.prp = k` | `/prp/props/<k>` |
| `S.view = 'db'` | `/data` |

`S.tab`, `S.f`, `S.sel`, `S.draft`, `S.srch`, `S.modal`, `S.pop` y `S.tour` siguen solo en el estado, como en el artifact.

## Adaptaciones (respetarlas al portar cambios)

1. **Estado mutable + `rev`.** `S` y los registros del dominio se mutan en sitio como en el artifact. Tras cada
   acción, `dispatch` incrementa `rev` (zustand) y los componentes que llaman `useApp()` se vuelven a pintar; eso
   reemplaza a `render()`. Una acción nueva del artifact se agrega a `A` en `lib/state/actions.ts` con el mismo nombre.
2. **Clics.** `data-act` / `data-v` se generan con `on(act, v)`, que además hace `stopPropagation` (el artifact
   solo despachaba el `[data-act]` más cercano). `return false` en una acción ya no evita pintar.
3. **Inputs.** Son no controlados (`defaultValue`) con `inp('nombre.clave')`. Solo `srch`, `popq`, `ran` y
   `ncgoal` vuelven a pintar al escribir, como en el artifact.
4. **Navegación.** Las acciones cambian `S` y `Shell` empuja la URL equivalente (`urlOf()`). Cada ruta aplica sus
   params a `S` una sola vez (`applyRoute`). Con `cacheComponents`, Next deja hasta 3 rutas previas montadas y
   ocultas: `AppScreen` no pinta nada mientras su ruta está oculta, para no duplicar la vista.
5. **`picker()` / `datef()`** registran sus callbacks al pintar con `registerPick` / `registerDate`.
6. **Determinismo.** `lib/domain/world.ts` llama al generador con semilla exactamente en el orden del artifact.
   Si el artifact cambia datos sembrados, cambia `world.ts` en el mismo orden y corre `npm test`, que compara
   todo el mundo con el del artifact.
7. **CSS.** Sin preflight de Tailwind (el artifact usaba los estilos por defecto del navegador). El CSS del
   artifact va en `@layer components`, así las utilidades de Tailwind ganan, como ganaban los `style=""`.
   `--f` usa `var(--font-figtree)`. Los `style=""` fijos pasaron a utilidades de Tailwind; los dinámicos
   (anchos de barras, alturas, posiciones) siguen como `style`.
8. **Toast.** Su contenido se vuelve a montar en cada llamada, como el `innerHTML` del artifact.
9. **Tablas.** Las filas van dentro de `<tbody>` (React lo exige; el navegador ya lo insertaba).
10. **Ficha inexistente.** `/prp/props/<id>` con un id que no existe muestra "Property not found." (el artifact no
    tenía URL para llegar ahí).
11. **Espacios.** El HTML del artifact tenía saltos de línea entre etiquetas; JSX no los genera. No se ven.
12. **Datos en MongoDB.** El artifact construía sus datos al cargar; aquí `buildWorld()` solo alimenta `npm run db:seed`
    y la app carga el estado desde MongoDB (`fromDocs`) y guarda los cambios (`toDocs` + diff, `lib/state/persist.ts`).
    Si una versión nueva del artifact agrega un campo o una colección, actualiza `lib/domain/snapshot.ts`,
    `lib/db/schema.ts` y vuelve a sembrar. Mientras carga, las vistas muestran "Loading data from the database…".
13. **Fecha real.** El artifact fijaba el lunes 2 de noviembre de 2026, 8:20 AM. Aquí `TODAY` y el reloj son los reales;
    el seed (`buildWorld(t0)`) genera todo relativo a `t0`, y lo que el artifact escribía como fecha fija (fechas de
    permisos, campañas pasadas, notas, el tour, las cargas de datos) se calcula desde ese día. Con `t0` = el día del
    artifact, el resultado es idéntico (test de determinismo). Un día nuevo corre `startNewDay()` al cargar.
14. **Login.** No está en el artifact: `/login`, el botón de cuenta (llave) en la barra superior y el modal `account`
    (`components/auth/`), con usuarios y sesiones en MongoDB (`lib/db/auth-core.ts`) y `proxy.ts`.
15. **Usuarios y permisos.** No están en el artifact. Un rep sin Outreach Manager queda fijo en su propia lista
    (`S.user` = su persona) y el avatar abre Account en vez del selector de usuario; las secciones sin permiso
    se ocultan en la barra y redirigen a su inicio; las acciones de `NEED` en `lib/state/actions.ts` piden permiso.
    La sección Users vive en `components/mgr/users.tsx` (`/mgr/users`).
16. **Sin selector de usuario.** La pantalla "Sign in to the Call Center" (`loginPage`) y `A.signin` no existen: el
    login real decide quién es cada uno. El avatar ("Switch user" en el artifact) abre Account. Un manager abre la lista
    de un rep con "Open as" en The day by rep. Si una versión nueva del artifact cambia `loginPage`, no hay nada que portar.
17. **Apps en el sidebar.** Las pestañas de apps del top bar (`.appsw`) pasaron a un desplegable arriba del sidebar
    (`AppSwitcher`), con los mismos conteos y solo las apps permitidas. Data también tiene sidebar, con el selector.
    El top bar queda con la marca, Walkthrough, la cuenta, el tema y el usuario. El CSS de `.appsw` del artifact sigue
    en `01-top-bar.css` sin uso. El indicador de desarrollo de Next está desactivado (`devIndicators: false`).
18. **Menú del usuario.** Los botones Walkthrough, cuenta (llave) y tema del top bar pasaron a un desplegable que se
    abre desde el avatar (`components/shell/UserMenu.tsx`): Walkthrough, Change password (el popup Account) y un
    interruptor de modo oscuro. El top bar queda con la marca y el avatar. El pie del sidebar de Outreach Manager
    ("Morning allocation ran at 7:00 AM…") se quitó.
