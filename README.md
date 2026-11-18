# Arzuman Brothers Call Center

Port a Next.js (App Router, TypeScript) + Tailwind CSS 4 de la demo v1 del Call Center de Arzuman Brothers.
La fuente de verdad es [`artifact/app.html`](artifact/app.html) (versión en [`artifact/VERSION`](artifact/VERSION)).
Mismo aspecto, mismos textos, mismos datos y mismo comportamiento. Todo corre en el cliente; no hay backend,
login real ni sincronización con monday todavía.

## Cómo correrlo

Si el repo está en una carpeta sincronizada con iCloud (`~/Documents`), iCloud puede borrar archivos de `node_modules`
y `.next` y crear copias como `package 2.json`. Márcalas para que iCloud las ignore (macOS 13 o posterior):
`xattr -w 'com.apple.fileprovider.ignore#P' 1 node_modules .next`. Lo más seguro es tener el repo fuera de iCloud.

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
npm run db:users                # crea andrew, maya, daniel y priya si faltan (muestra sus contraseñas temporales)
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
| `users` | un usuario: nombre, rol, permisos, a quién representa, contraseña cifrada, estado | `username` (único) |
| `sessions` | una sesión abierta (hash del token) | `expiresAt` (TTL), `user` |

Cada colección tiene un validador JSON Schema estricto (`lib/db/schema.ts`): MongoDB rechaza documentos con
campos obligatorios faltantes, tipos incorrectos o valores fuera de catálogo (resultado, rep, audiencia...).
La conversión entre el estado de la app y los documentos está en `lib/domain/snapshot.ts`.

Si dos personas editan a la vez, gana la última escritura de cada documento.

## Login, usuarios y permisos

La app pide usuario y contraseña (`/login`). Cada persona tiene su usuario:

| Usuario | Rol | Entra a |
| --- | --- | --- |
| `andrew` | Manager | The day by rep y todo lo demás, incluida **Outreach Manager > Users**; abre la lista de un rep con "Open as" |
| `maya`, `daniel`, `priya` | Sales rep | su propia lista en Rep Workspace (no ven la de otros ni Outreach Manager) |
| `admin` | Administrator | todo; contraseña inicial `adminmaster123` |

`npm run db:users` crea los usuarios del equipo que falten, con una contraseña temporal que se muestra solo
en ese momento; en el primer login cada uno elige la suya (`/password`).

**Roles y permisos** (`lib/auth/roles.ts`). El rol precarga los permisos y se pueden ajustar uno por uno:
Rep Workspace, Outreach Manager (ver / cambiar), Properties (ver / cambiar), Calling and AI, Data y Users.
Un usuario vinculado a Maya, Daniel o Priya sin Outreach Manager trabaja solo en la lista de ese rep.
La app oculta lo que el usuario no puede abrir y el servidor rechaza lo que no puede hacer (403).

**Outreach Manager > Users** (permiso Users): crear usuarios con rol, permisos y a quién representan; editar,
desactivar (cierra sus sesiones al instante) y resetear contraseñas (temporal, se muestra una vez). Nadie puede
quitarse a sí mismo el acceso a Users, y siempre queda al menos un usuario activo con ese permiso.

Seguridad: contraseñas con scrypt en `users`; sesiones en `sessions` (solo el hash del token, 7 días, TTL);
cookie `httpOnly`; cinco contraseñas incorrectas bloquean el usuario 5 minutos. Cada uno cambia la suya en
Account (la llave de la barra superior). `npm run db:seed -- --reset-admin` repone la contraseña de `admin`.

## Fechas

La app usa la fecha y la hora reales. Los datos de la demo se generan relativos al día en que se corre el seed
(`npm run db:seed -- --reset`). La primera vez que se abre la app en un día nuevo corre la asignación de la mañana
con las campañas de ese día y la guarda; si ese día no hay campañas, los reps aparecen "not scheduled" hasta que
Andrew cree una. Los días pasados sin totales sembrados se calculan desde `call_log`.

## Producción y CI/CD

La app corre en la VPS de AB (EC2, Docker) en **https://outreach.arzumanbrothers.com**, detrás del nginx
compartido con n8n y las demás apps (`~/n8n-production`).

**CI/CD** (`.github/workflows/ci-cd.yml`):

- En cada push y pull request: lint, typecheck, tests unitarios y build.
- En cada push a `main` (o con *Run workflow*): construye la imagen Docker (`Dockerfile`, salida `standalone` de Next),
  la sube a `ghcr.io/implementationwt/abcalloutreachapp` y la despliega en la VPS por SSH: copia
  `deploy/docker-compose.yml` a `~/outreach`, hace `docker-compose pull && up -d` con la imagen de ese commit y
  comprueba que la app y la base respondan (`/api/health/db`).
- Secretos del repositorio: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (clave solo para deploy, comentario
  `github-actions-outreach-deploy` en `~/.ssh/authorized_keys` del servidor) y `DEPLOY_KNOWN_HOSTS`.

**En la VPS:**

- `~/outreach/docker-compose.yml`: el contenedor `outreach-app`, en la red `n8n-production_n8n_network`, con 512 MB.
- `~/outreach/.env`: `MONGODB_URI` y `MONGODB_DB` (fuera de git; permisos 600). Para cambiarlos: editar y
  `docker-compose up -d` en esa carpeta.
- nginx: el bloque de `deploy/nginx-outreach.conf` va en `~/n8n-production/nginx/https.conf`; el certificado de
  Let's Encrypt se renueva con el cron que ya existe para los otros subdominios.
- Volver a una versión anterior: en GitHub, *Actions > CI/CD > Run workflow* sobre el commit deseado, o en la VPS
  `cd ~/outreach && TAG=<sha> docker-compose up -d`.

## Rutas

| Ruta | Vista del artifact |
| --- | --- |
| `/login` · `/password` | Login, y elegir contraseña tras una temporal (no están en el artifact) |
| `/mgr/users` | Usuarios, roles y permisos (solo con el permiso Users) |
| `/` | Lleva a cada usuario a su inicio: un rep a su lista, un manager a The day by rep |
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
components/shell/    TopBar, Sidebar con el selector de apps (AppSwitcher), AppScreen, Layer (modal y popovers), Toast, Tour, HelpPage, Shell
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
