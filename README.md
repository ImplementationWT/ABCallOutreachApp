# Arzuman Brothers Call Center

Port a Next.js (App Router, TypeScript) + Tailwind CSS 4 de la demo v1 del Call Center de Arzuman Brothers.
La fuente de verdad es [`artifact/app.html`](artifact/app.html) (versión en [`artifact/VERSION`](artifact/VERSION)).
Mismo aspecto, mismos textos, mismos datos y mismo comportamiento. Todo corre en el cliente; no hay backend,
login real ni sincronización con monday todavía.

## Cómo correrlo

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # build de producción (no necesita la base)
npm run lint
npm test             # determinismo: el mundo sembrado es idéntico al del artifact
npx playwright install chromium   # una vez
npm run test:e2e     # compara la app con artifact/app.html (necesita npm run build antes)
```

`npm run test:e2e` levanta `next start` en el puerto 3217 contra la base `calloutreach_e2e`, con una sesión de admin
y el reloj del navegador fijo en el día del artifact (2 de noviembre de 2026, 8:20 AM), y corre:

- `tests/e2e/compare.spec.ts`: captura del artifact y de la app en cada ruta, en claro, oscuro y ancho de móvil,
  con diff de píxeles. Las imágenes quedan en `test-results/compare/`.
- `tests/e2e/flow.spec.ts` y `more.spec.ts`: el mismo recorrido con clics en el artifact y en la app
  (Maya, Andrew, fichas, Data, Walkthrough completo); los textos y toasts de ambos deben coincidir.

## Base de datos (MongoDB)

Los datos viven en MongoDB Atlas (cluster `calloutreach`, base `calloutreach`). La app los carga al arrancar
(`GET /api/state`) y, tras cada acción, envía solo los documentos que cambiaron (`POST /api/state`).
El motor de asignación sigue corriendo en el navegador, igual que en el artifact.

```bash
cp .env.example .env.local      # y pon la contraseña del usuario de la base; .env.local no se sube
npm run db:seed                 # crea colecciones, índices y el usuario admin; si la base está vacía, carga la demo
npm run db:seed -- --reset      # borra los datos y vuelve a cargar la demo, fechada hoy (los usuarios se mantienen)
npm run db:seed -- --reset-admin  # contraseña de admin de vuelta a la inicial
```

Comprobar la conexión: `GET /api/health/db`. Los e2e usan su propia base, `calloutreach_e2e`, que se vuelve a sembrar sola.

| Colección | Un documento es | Índices |
| --- | --- | --- |
| `properties` | una propiedad (`_id` = `P-1001`...) | `aud`, `addr` |
| `contacts` | un contacto de una propiedad, con su último resultado y su próxima llamada | `prop`, `rep + nextAt` |
| `phone_numbers` | un teléfono de un contacto y si funcionó | `ct + idx` (único), `n` |
| `campaigns` | una campaña: fecha, audiencias, reps, meta | |
| `reservations` | un contacto reservado para un rep en un día, en orden, y si ya tiene resultado | `date + rep + order`, `ct` |
| `workdays` | la jornada de un rep: estado, inicio, fin, lotes recibidos | `date + rep` (único) |
| `call_log` | una llamada | `ct`, `rep + at`, `at` |
| `hand_offs` | un Potential Lead pasado a ventas (outbound o inbound) | `prop`, `at` |
| `reps` | una persona con login (reps, Andrew, oficina) | |
| `rules` | las reglas de Andrew (un documento) | |
| `daily_metrics` | los totales de un rep en un día pasado | `day + rep` (único) |
| `sync_log` | un envío a monday | `at` |
| `app_meta` | contadores de ids | |
| `users` | un usuario con su contraseña cifrada | `username` (único) |
| `sessions` | una sesión abierta (hash del token) | `expiresAt` (TTL), `user` |

Cada colección tiene un validador JSON Schema estricto (`lib/db/schema.ts`): MongoDB rechaza documentos con
campos obligatorios faltantes, tipos incorrectos o valores fuera de catálogo (resultado, rep, audiencia...).
La conversión entre el estado de la app y los documentos está en `lib/domain/snapshot.ts`.

Si dos personas editan a la vez, gana la última escritura de cada documento.

## Login

La app pide usuario y contraseña (`/login`). El usuario inicial es **admin** con la contraseña **adminmaster123**;
cámbiala desde el botón con la llave de la barra superior (Account → Change password). Al cambiarla se cierran las
demás sesiones de ese usuario.

- Las contraseñas se guardan cifradas con scrypt en la colección `users`; las sesiones, en `sessions`
  (solo el hash del token, con caducidad de 7 días). La cookie es `httpOnly`.
- Cinco contraseñas incorrectas seguidas bloquean el usuario 5 minutos.
- `proxy.ts` manda a `/login` a quien no tiene sesión; cada ruta de la API valida la sesión contra MongoDB.
- Si se olvida la contraseña: `npm run db:seed -- --reset-admin` la vuelve a `adminmaster123` y cierra todas las sesiones.

## Fechas

La app usa la fecha y la hora reales. Los datos de la demo se generan relativos al día en que se corre el seed
(`npm run db:seed -- --reset`). La primera vez que se abre la app en un día nuevo corre la asignación de la mañana
con las campañas de ese día y la guarda; si ese día no hay campañas, los reps aparecen "not scheduled" hasta que
Andrew cree una. Los días pasados sin totales sembrados se calculan desde `call_log`.

## Rutas

| Ruta | Vista del artifact |
| --- | --- |
| `/login` | Login con usuario y contraseña (no está en el artifact) |
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
