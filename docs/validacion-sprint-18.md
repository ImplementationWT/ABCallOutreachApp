# Validación del Sprint 18 "Call Outreach"

Rama: `validation/sprint-18`. En esta fase solo se agregaron pruebas y documentos; no se cambió lógica de producción.

## Resumen

- De 18 criterios A1 a C4 cumplen 6, 11 cumplen en parte y 1 no está implementado (C1, el catálogo configurable). Además, el control de acceso por API (regla 6) no cumple.
- Lo más grave es que un rep puede leer las listas de todos y modificar por API contactos, jornadas y reservas de otro rep (`app/api/state/route.ts`).
- Le siguen tres problemas: no existe un scheduler a hora fija, la pantalla no avisa cuando el reparto dejó a un rep sin lista y el catálogo de resultados está fijo en el código.

## Mapa del repo

- **Stack.** Next.js 16 (App Router), React 19 y MongoDB Atlas con el driver nativo, sin ORM. Los validadores JSON Schema están en `lib/db/schema.ts`.
- **Dominio puro**, sin DOM ni driver, en `lib/domain/`:
  - el motor, en `engine.ts`;
  - el catálogo de resultados y las prioridades, en `catalogs.ts`;
  - las reglas editables, en `rules.ts`;
  - las campañas por día, en `campaigns.ts`;
  - la conversión entre documentos y memoria, en `snapshot.ts`.
- **Estado.** Vive en el navegador. `GET /api/state` carga todas las colecciones y `POST /api/state` guarda las diferencias (`lib/state/persist.ts`).
- **Reparto.** Corre en el servidor, una solicitud a la vez dentro del proceso: `POST /api/allocate` con los tipos `morning`, `start` y `more` (`lib/db/allocate.ts`).
- **No hay scheduler.** El reparto de la mañana corre en la primera carga del día de cualquier usuario (`lib/state/persist.ts:32`).
- **Colecciones.** properties, contacts (un documento por dueño con `props` y `pst`), phone_numbers, campaigns, reservations (`_id = fecha:contacto`), workdays, call_log, hand_offs, reps, rules (`default`), daily_metrics, sync_log, app_meta, users y sessions.
- **Permisos.** `lib/auth/roles.ts` y `requirePerm` (`lib/auth/session.ts:27`). `POST /api/state` solo restringe `campaigns`, `rules` y `reps` (`app/api/state/route.ts:27`).
- **Pantallas del rep.** Están en `components/rep/index.tsx`:
  - inicio del día (`RepStart`, :38);
  - lista y ficha (`RepWork`, :67, y `RepDetail`, :93);
  - follow-ups (`RepFollowUps`, :158);
  - llamadas de hoy (`RepCalls`, :169).
- **Reglas editables.** Se cambian en Outreach Manager → Assignment rules (`components/mgr/index.tsx:145-180`): lote diario, lote extra, intentos máximos, días de recall de 5 resultados, refresco de lista y cierre del día.
- **Pruebas que ya existían.** vitest (`tests/*.test.ts`) y Playwright contra `calloutreach_e2e` (`tests/e2e/`). Los datos de prueba salen de `buildWorld()` (`lib/domain/world.ts`), sembrado el lunes 2 de noviembre de 2026.
- **CI/CD.** GitHub Actions (`.github/workflows/ci-cd.yml`) corre lint, tipos, vitest y build, y despliega con push a `main`.
- **RingCentral.** Solo aparece como texto en la lista de proveedores a evaluar (`components/p2/index.tsx:70-71`). No se revisó.
- **Fuera de alcance, solo anotado.** La integración con monday está simulada con `syncLog` (`lib/domain/data.ts`) y no tiene llamadas reales. No hay Missed Calls ni notificaciones. Los reportes son el correo diario simulado en `components/mgr/index.tsx`.

## Tabla por subtarea

Estados posibles: Cumple, Parcial, No cumple, No implementado y Regla no definida. En las pruebas, `it.fails` y `test.fail()` marcan un criterio que hoy no se cumple. Cada una describe lo esperado y debe fallar; cuando se arregle, pasará y habrá que convertirla en prueba normal.

| ID | Subtarea | Estado | Evidencia | Qué falla | Arreglo propuesto | Horas |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Start the day y lista de hoy | Parcial | `RepStart` `components/rep/index.tsx:38`; `startAlloc` `lib/domain/engine.ts:161`. e2e: "A1 reloading does not regenerate or duplicate the list" (cumple) y "[No cumple] A1 if the morning run gave a rep nothing…" (`test.fail`). Unit: "Start Workday with an empty list gives the first batch". | Si el reparto de la mañana no le dio nada a un rep (por ejemplo, sin campaña), la pantalla muestra "0 contacts waiting" y "The morning allocation ran at 7:00 AM", como si fuera normal. Ese texto de las 7:00 AM está fijo en el código (`components/rep/index.tsx:45`). | Mostrar un aviso cuando el rep no tiene campaña hoy o su lote de la mañana fue 0, con el motivo y qué hacer. Quitar el "7:00 AM" fijo o leerlo del reparto real. | 3 |
| A2 | Lista del día (en la app es "My Outbound Dashboard"; "My calls today" es el registro de llamadas) | Cumple | `RepWork` `components/rep/index.tsx:67`; orden `queueSort` `lib/state/rep.ts:9`. e2e: "A2 the list is in priority order, and saving updates the counters without a reload". Unit: "B6 end of day…". | El orden es por hogar: el hogar con la mejor prioridad va primero y sus contactos van juntos, así que un P2 puede aparecer junto a un P1 del mismo hogar. La restricción por API está en la fila 6. | Ninguno. Confirmar con Andrew el orden por hogar (D2). | 0 |
| A3 | My follow-ups | Parcial | `RepFollowUps` `components/rep/index.tsx:158`; filtro `myFollowUps` `lib/state/rep.ts:10`. e2e: "A4 validations…" (al final revisa la fecha en My follow-ups, sin desfase). Unit: "[No cumple] the follow-up goes back to the rep who set it". | Muestra los follow-ups del primer rep que llamó al contacto (`c.rep`), no del rep que lo creó (`lib/domain/engine.ts:226`). Junta "vencidos" y "hoy" en un solo grupo ("Due today or earlier") y separa "This week" y "Later". La fecha se guarda y se ve sin desfase. | Guardar como dueño del follow-up al rep que lo crea (requiere confirmar la regla, D2) y separar vencidos de hoy. | 2 |
| A4 | Formulario de resultado, notas y fecha de follow-up | Parcial | Validación de la pantalla: `components/rep/index.tsx:125` (guardar desactivado sin resultado o sin fecha) y `components/shell/Layer.tsx:18` (días pasados desactivados). Doble clic: `lib/state/actions.ts:142`. Efectos: `saveOutcome` `lib/domain/engine.ts:215`. e2e: "A4 validations…" y "A4 a double click on Save writes one call, not two". Unit: C2 a C4. | Las opciones salen de `OUT`, fijo en el código, no de un catálogo configurable (depende de C1). El servidor no valida nada: `POST /api/state` acepta un resultado inventado o una fecha pasada si el esquema lo permite. Lo cubren las e2e de la fila 6 y la prueba que manda un documento inválido en `db.spec`. Notas completas, efectos y doble clic: cumplen. | Guardar el resultado con un endpoint del servidor que valide el resultado contra el catálogo, la fecha de follow-up (obligatoria, no pasada) y que el contacto esté en la lista del rep. | 6 (incluido en la fila 6) |
| A5 | Ficha de contacto y hogar con lo que dijeron | Cumple | `RepDetail` `components/rep/index.tsx:93`; `HistList` :142; `SibRow` :135. e2e: "A5 the detail shows the household, its people and the history with author and date…". | Detalles menores: el historial se ordena por minuto y, si hay dos llamadas en el mismo minuto, sale primero la más vieja. En "Other contacts", el autor que se muestra es `c.rep` (el primer rep) con "may" por defecto (`SibRow`, :138), no quien hizo la última llamada; esto último sale de leer el código y no tiene prueba. | Ordenar por id de llamada y usar el rep de la última llamada en `SibRow`. | 1 |
| A6 | Responsive | Cumple | e2e: "A6 rep views at 375px / 768px / 1440px: no horizontal scroll, Save reachable". | Nada. | Ninguno. | 0 |
| B1 | Pool filtrado por campaña activa, categoría y periodo de enfoque | Parcial | `elig` `lib/domain/engine.ts:63`; `freeGroups` :92; `campOf` `lib/domain/campaigns.ts:22`. Unit: "B1 callable pool…" (un caso por exclusión: recall, sin teléfono, hogar bloqueado, ya asignado, DNC, lead, pipeline, máximo, detenido, audiencia fuera de campaña). | Campaña y audiencia (la "categoría" que existe hoy) cumplen, igual que las exclusiones. No existe un "periodo de enfoque" (Regla no definida). Una "campaña activa" es la que tiene la fecha de hoy, y se crea día por día. | Cuando se defina, agregar el periodo de enfoque al filtro. | 4 (después de D) |
| B2 | Prioridad y reparto por porcentajes | Parcial | `priOf` `lib/domain/engine.ts:53`; `PRANK` `lib/domain/catalogs.ts:46`. Unit: "P1 before P2 before P3, P4, P5", "[No implementado] category shares…" y "documents the batch size rounding". | P1 a P5 en orden: cumple. No hay porcentajes por categoría (No implementado, Regla no definida). Hoy, cuando una audiencia se agota, el motor sigue con las demás de la campaña. El redondeo es `max(1, round(n × 0.07))`. | Agregar porcentajes por categoría cuando Andrew los defina. | 10 (después de D) |
| B3 | Lista diaria por volumen del rep | Parcial | `morningAlloc` `lib/domain/engine.ts:120`. Unit: "the morning run gives every rep…", "[Parcial] a rep never gets more than the volume…", "fewer than the volume when the pool runs out…", "a rep who is not in today's campaign gets no list" y "[No implementado] each rep has their own daily volume". | Un contacto nunca queda en dos listas, recibir menos queda registrado en `batches` y un rep sin campaña no recibe nada: cumplen. Como el hogar se entrega completo, un rep puede pasar su volumen (con hogares de 3 personas, 14 se vuelven 15 o más). El volumen es uno solo para todos. No hay forma de marcar a un rep inactivo salvo dejarlo fuera de la campaña: el estado `off` existe en el esquema pero ninguna pantalla lo usa. | Decidir con Andrew si se permite pasar el volumen (D2). Después, volumen por rep y estado "no trabaja hoy". | 4 |
| B4 | Follow-ups vencidos vuelven a su rep | Parcial | `ownerOf` `lib/domain/engine.ts:90`; `freeGroups` :101 y :111; `morningAlloc` :123. Unit: "a follow-up due today is in its rep's list even if its audience is not in the campaign, and counts in the volume", "if its rep has no campaign today, nobody gets it that day" y "[No cumple] the follow-up goes back to the rep who set it". | Vuelve aunque su audiencia no esté en la campaña, va primero y cuenta dentro del volumen: cumple. Vuelve al primer rep que llamó, no al que lo creó. Si ese rep no tiene campaña ese día, nadie lo recibe y espera al día siguiente; solo pasa a otro rep si su jornada está en `off`, que ninguna pantalla pone. | Dueño = rep que crea el follow-up; regla para cuando ese rep falta (D2). | 2 |
| B5 | Un hogar, un rep por día | Parcial | `freeGroups` `lib/domain/engine.ts:107-111`; `ownerBusy` :50; `locked` `lib/db/allocate.ts:12`. Unit: "the morning run never splits a household" y "\"Request more\" does not take a household already in another rep's list". e2e: "B5 + B8 two reps ask for more at once on shared households: no household split" y `alloc.spec.ts`. | Reparto de la mañana, "Request more" y solicitudes simultáneas: cumplen. El bloqueo no es atómico en MongoDB: es una cola dentro del proceso de Node, que sirve con un solo contenedor, y una verificación seguida de escritura sin transacción ni índice único por hogar y día. Además, `POST /api/state` deja que el navegador escriba reservas directamente (Reassign del manager, o un rep por API, ver fila 6). | Índice único `{date, prop}` en un documento de bloqueo por hogar, o una transacción en `allocate`. Pasar Reassign al servidor. | 6 |
| B6 | Devolver lo no trabajado al pool al cierre | Cumple | `endDay` `lib/domain/engine.ts:171`. Unit: "unworked contacts go back to the pool without an attempt or a recall window…" y "rules/default.endDay…". | Solo pasa cuando el rep pulsa End workday. Si no lo hace, sus reservas caducan al cambiar el día (solo cuentan las de hoy), con el mismo efecto. | Ninguno, salvo que Andrew quiera un cierre automático a una hora fija (D2). | 0 |
| B7 | Job de la mañana con salvaguardas | Parcial | `allocateMorning` `lib/db/allocate.ts:41`; llamada en `lib/state/persist.ts:32`. e2e: "B7 two morning runs at the same time: one runs, one does nothing, no list is duplicated" y "[No implementado] B7 the morning run happens at a set hour…". | Idempotente y protegido contra dos ejecuciones simultáneas: cumple, porque revisa si ya hay jornadas del día dentro del bloqueo. No hay job: corre cuando alguien abre la app, sin hora configurada ni manejo de horario de verano. Si falla a la mitad, escribe colección por colección sin transacción (`lib/db/allocate.ts:34`) y puede dejar reservas sin jornadas, sin reintento ni alerta. La tarea estaba marcada como completada. | Un cron a hora configurable en America/Los_Angeles que llame a `allocate morning`, con escritura en transacción, registro del resultado y alerta si falla. | 10 |
| B8 | Pedir más contactos | Cumple | `requestMore` `lib/domain/engine.ts:144`; `reqMore` en `lib/state/actions.ts`. Unit: "refused while the list has contacts without a result…", "gives a new batch following the pool and household rules…" y "empty pool: ok with 0…". e2e: "B8 the rep sees a clear message when the pool is empty (no error)". | Nada. Solo se puede pedir con la lista completa documentada; el lote es `max(1, round(100 × 0.07)) = 7` o el hogar completo. | Ninguno. | 0 |
| C1 | Catálogo de resultados configurable | No implementado | `OUT` `lib/domain/catalogs.ts:18`; `NO_OUT` y `LEAD_OUT` :33-34. Unit: "documents today: 11 outcomes fixed in code…", "[No implementado] the catalog is a database collection…" y "[No implementado] each outcome stores active, counts-as-attempt…". | Los 11 resultados, qué se propaga y qué es lead están en el código. Solo los días de recall de 5 resultados están en la base (`rules/default.rc`). No se puede crear, editar ni desactivar un resultado. El historial usa el nombre del resultado como texto y ya tolera nombres desconocidos (`HistList`). | Colección `outcomes` con nombre, activo, cuenta como intento, días de recall, tipo de días, propagación (contacto, hogar o persona), crea lead y exige fecha. Pantalla de administración. El motor y el formulario leen de ahí. | 20 |
| C2 | Ventana de recall por resultado | Parcial | `nextFor` `lib/domain/engine.ts:20`; reglas `lib/domain/rules.ts:14`; días hábiles `lib/domain/dates.ts:47`. Unit: las 16 pruebas de "C2 recall window per outcome". | El cálculo y el antes/después del pool cumplen. Casos borde: una ventana de 0 o vacía en un resultado por días hábiles se toma como 1 (`CFG.rc[out] \|\| 1`); en Undecided y Not Interested (días naturales), 0 lo hace llamable el mismo día. Cambiar una ventana no recalcula las fechas ya puestas. Follow Up sin fecha (2 días hábiles) y Wrong Number (1 día hábil) están fijos en el código. Los días hábiles son de lunes a viernes, pero el horario dice lunes a sábado. | Mover todas las ventanas al catálogo (C1) y definir qué significa 0 y si se recalcula (D2). | 2 (más C1) |
| C3 | Propagación al hogar | Cumple | `saveOutcome` `lib/domain/engine.ts:232-243`. Unit: "C3 household propagation" (12 pruebas). | Not Interested, Already Building y Do Not Contact detienen al resto del hogar con el motivo. Interested y Working on Plans pasan la propiedad a ventas. Do Not Contact detiene además las otras propiedades de la persona. Los demás resultados solo afectan al contacto. Qué se propaga está fijo en el código (ver C1). | Ninguno, salvo que se haga configurable con C1. | 0 |
| C4 | Intentos máximos y on-hold | Parcial | `elig` `lib/domain/engine.ts:73`; `saveOutcome` :225; `maxAtt` `lib/domain/rules.ts:13`. Unit: "every outcome adds one attempt", "at the maximum… leaves the pool as \"max\"", "\"on hold\" today means no working phone number…" y "[No cumple] a Follow Up saved on the last attempt still comes back…". | Todos los resultados suman un intento, incluidos leads y follow-ups. Al llegar a 6 el contacto sale como `max`. En la app, on-hold significa "sin teléfono que funcione", que es otra cosa. Un Follow Up guardado en el último intento se pierde, aunque el texto de la pantalla lo excluye del aviso (`effectsOf`, :209). No hay forma de reactivar un contacto en `max`: "Reopen property" (`lib/state/actions.ts:209`) no reinicia intentos. | Definir qué cuenta como intento y si un follow-up se respeta en el último intento (D2). Acción del manager para reactivar con registro. | 4 |
| 6 | Acceso por API (rep contra otro rep) | No cumple | `GET` y `POST /api/state` `app/api/state/route.ts:12` y :27-39. e2e: "a rep cannot allocate for another rep, nor manage users" (cumple) y tres `test.fail`: "[No cumple] GET /api/state gives a rep only their own lists", "…refuses a change to a contact in another rep's list" y "…refuses changes to another rep's workday and follow-ups". | `/api/allocate` y `/api/users` sí restringen. `GET /api/state` le entrega a un rep todas las colecciones: listas, jornadas y follow-ups de todos. `POST /api/state` deja que un rep reescriba cualquier contacto, jornada, reserva o registro de llamada. | Filtrar el GET por rol (el rep recibe su lista y los hogares que necesita su ficha). Reemplazar las escrituras del rep por endpoints del servidor (guardar resultado, iniciar y cerrar el día) que validen que el contacto está en su lista. Dejar `POST /api/state` solo para managers. | 12 |

## Estado de D

| ID | Entregado | Pendiente |
| --- | --- | --- |
| D1 Inventario de reglas | La sección "D1. Inventario de reglas" de abajo, con 24 reglas: dónde viven, valor, si son configurables y a qué criterio afectan, más las inconsistencias. | Nada, salvo que aparezcan reglas nuevas en la sesión. |
| D2 Preguntas y plantilla | `docs/reglas-call-outreach-plantilla.md`: preguntas que bloquean primero, tabla del catálogo de resultados y agenda de 60 minutos. | La sesión con Andrew, que haces tú. La revisión de RingCentral queda fuera (regla 7). |
| D3 Reglas acordadas | `docs/reglas-call-outreach.md`: **borrador listo**, con los valores de hoy y cada regla "Pendiente de confirmar con Andrew". | Llenar los valores acordados después de la sesión y cambiar su estado a "Acordada". No se puede cerrar antes. |

## Estado sugerido de las tareas padre

| Tarea | Estado sugerido | Por qué |
| --- | --- | --- |
| Rep Workspace | **In progress** | A2, A5 y A6 cumplen. A1, A3 y A4 son parciales, y el acceso por API (fila 6) no cumple. |
| Daily Assignment Engine | **In progress** | B6 y B8 cumplen. B1 a B5 y B7 son parciales. B7 estaba marcada como completada y no tiene scheduler ni salvaguardas ante fallos. |
| Call Outcomes & Rules | **In progress** | C3 cumple. C2 y C4 son parciales y C1 no está implementado. |
| Discovery & Rules Definition | **In progress** | D1 y D2 están entregados y D3 es borrador. Faltan la sesión con Andrew y el cierre de D3. La revisión de RingCentral queda fuera de alcance hasta tener la cuenta. |

## Cómo correr las pruebas

```bash
git checkout validation/sprint-18
npm ci

# Dominio (vitest): datos en memoria de tests/sprint18/fixture.ts, sin base de datos
npx vitest run tests/sprint18          # 57 pruebas del sprint
npm test                               # todas las de vitest (71)

# E2E (Playwright) contra la base calloutreach_e2e (MONGODB_URI en .env.local)
npm run build
npx playwright test tests/e2e/sprint18.spec.ts --project=write --no-deps   # 17 pruebas del sprint
npm run test:e2e                                                           # suite completa
```

Datos usados:

- **vitest.** `tests/sprint18/fixture.ts` arma con `buildWorld()` un mundo controlado para el lunes 2 de noviembre de 2026 a las 8:20 AM y reemplaza propiedades, contactos, campañas, reservas y jornadas con un caso por regla. Lo carga con `fromDocs()`, el mismo camino que usa la app.
- **e2e.** `reseed()` de `tests/e2e/db.ts` siembra `buildWorld()` en `calloutreach_e2e` para el mismo día. Luego crea los usuarios del equipo (`ensureTeamUsers`) y cada prueba ajusta lo que necesita (campaña compartida, listas vacías). Al final vuelve a sembrar y borra los usuarios del equipo. El reloj del navegador está fijo en ese día y la zona es America/Los_Angeles (`playwright.config.ts`).

## D1. Inventario de reglas

"Configurable" significa que se cambia sin desplegar, desde la pantalla Assignment rules o desde Campaigns.

| # | Regla | Dónde vive | Valor actual | Configurable | Criterios |
| --- | --- | --- | --- | --- | --- |
| 1 | Audiencias (categorías de hoy) | `AUDS` `lib/domain/catalogs.ts:5`; enum en `lib/db/schema.ts` | Pacific Palisades, Sunset Mesa, Malibu y Altadena (todas "Fire Rebuild") | No (código) | B1, B2 |
| 2 | Campaña: fecha, audiencias y reps | Colección `campaigns`; `campOf` `lib/domain/campaigns.ts:22` | Una por día; la única que creé en producción es la del 23 de noviembre (`C-1123-A`), y sin campaña del día nadie recibe lista | Sí (Campaigns) | B1, B3, A1 |
| 3 | Periodo de enfoque | No existe | No existe | No | B1 |
| 4 | Prioridades P1 a P5 | `priOf` `lib/domain/engine.ts:53`; `PRI` `lib/domain/catalogs.ts:39` | P1 Follow Up, P2 Permit Issued, P3 Undecided, P4 Left VM, P5 no contactado | No | B2, A2 |
| 5 | Porcentajes por categoría | No existe | No existe | No | B2 |
| 6 | Lote diario por rep | `rules/default.first` y `scale` `lib/domain/rules.ts:12`; `demoN` :19 | 200 × 0.07 = 14, igual para todos | Sí el 200; la escala la define el cliente | B3 |
| 7 | Lote de "Request more" | `rules/default.more` | 100 × 0.07 = 7 | Sí | B8 |
| 8 | El hogar se entrega completo | `freeGroups` y `reserve` `lib/domain/engine.ts:92-117` | Se entrega completo aunque se pase del lote | No | B3, B5 |
| 9 | Un hogar y una persona por rep al día | `freeGroups` :107-111; `ownerBusy` :50 | Sí | No | B5 |
| 10 | Follow-up vuelve a su rep | `ownerOf` :90; `saveOutcome` :226 | Al primer rep que llamó; cuenta en el lote; si el rep no tiene campaña, espera | No | B4, A3 |
| 11 | Catálogo de resultados | `OUT` `lib/domain/catalogs.ts:18` | 11 resultados | No | C1, A4 |
| 12 | Ventanas de recall | `rules/default.rc`; `nextFor` `lib/domain/engine.ts:20` | Not Contacted 1, Left VM 3 y Hung Up 2 (días hábiles); Undecided 10 y Not Interested 180 (días naturales); Follow Up: fecha elegida o 2 hábiles; Wrong Number: 1 hábil si hay otro número, si no on-hold | 5 sí; Follow Up y Wrong Number no | C2 |
| 13 | Días hábiles | `isBiz` `lib/domain/dates.ts:47` | Lunes a viernes | No | C2 |
| 14 | Propagación al hogar | `NO_OUT`, `LEAD_OUT` `lib/domain/catalogs.ts:33-34`; `saveOutcome` :232-243 | No o lead: detiene al resto del hogar. DNC: también las otras propiedades de la persona. Not Interested: solo esa propiedad | No | C3 |
| 15 | Qué cuenta como intento | `saveOutcome` :225 | Todos los resultados | No | C4 |
| 16 | Intentos máximos | `rules/default.maxAtt` | 6 | Sí | C4 |
| 17 | On-hold | `callable` `lib/domain/engine.ts:47` | Sin teléfono que funcione; vuelve al agregar un número | No | C4, B1 |
| 18 | Reactivar | `A.reopen` `lib/state/actions.ts:209` | Reabrir una propiedad quita la detención y hace llamable hoy un Not Interested; no reinicia intentos | Acción manual del manager | C4 |
| 19 | Hora del reparto de la mañana | No hay scheduler; textos fijos "7:00 AM" (`components/rep/index.tsx:45`, `lib/domain/engine.ts:134`, `components/mgr/index.tsx:125`) | Primera carga del día | No | B7, A1 |
| 20 | Horario de llamadas | `rules/default.hours` | "9:00 AM to 7:00 PM Pacific, Monday to Saturday" (solo texto, nada lo aplica) | Texto | B7, C2 |
| 21 | Cierre del día | `rules/default.endDay`; `endDay` :171 | `pool`: lo no trabajado vuelve al pool al pulsar End workday | Sí (pool o mismo rep) | B6 |
| 22 | Refresco de lista | `rules/default.refresh` | `daily` | Sí en pantalla, pero el motor no lo lee | B3 |
| 23 | "Request more" solo con todo documentado | `requestMore` :144 | Sí | No | B8 |
| 24 | Meta por rep en la campaña | `campaigns.goal` | 1 lead (solo se muestra en el correo) | Sí | — |

### Inconsistencias

1. **Días hábiles contra horario.** Los días hábiles son de lunes a viernes (`dates.ts:47`), pero el horario dice "Monday to Saturday" (`rules.ts:15`).
2. **Hora del reparto.** "7:00 AM" aparece fijo en tres pantallas y en el registro de lotes, pero el reparto ocurre cuando alguien abre la app.
3. **Refresco semanal.** "Weekly" se puede elegir en la pantalla de reglas, pero el motor no lo usa (`CFG.refresh` no se lee).
4. **Follow Up en el último intento.** Según el texto de "When you save", no saca al contacto (`effectsOf`, `engine.ts:209`), pero `elig` sí lo saca (`engine.ts:73`).
5. **Tipo de días de las ventanas.** Undecided y Not Interested usan días naturales y el resto días hábiles; la pantalla lo dice, pero no es una regla configurable.
6. **Rep de la jornada "off".** Las reglas suponen un rep "off" (`freeGroups` :111, `actions.ts:157`), pero nada lo configura.
7. **Ventanas fuera de reglas.** Follow Up sin fecha (2 días hábiles) y Wrong Number (1 día hábil) están fijos en el código, fuera de `rules/default.rc`.
8. **Catálogo compartido.** El catálogo de resultados lo usan a la vez el formulario y el motor desde el código; no lo envía el backend.
9. **Dueño del follow-up.** `c.rep` es el primer rep que llamó, y de él dependen "My follow-ups", P1/P3 y el autor que se muestra en "Other contacts".
