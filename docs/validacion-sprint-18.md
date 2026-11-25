# Validación del Sprint 18 "Call Outreach"

Ramas:
- `validation/sprint-18`: la validación (pruebas y documentos, sin cambios de producción).
- `fix/sprint-18`: los 10 arreglos aprobados y la corrección de B2, un commit por arreglo.

Terminología: "household" se traduce como **propiedad**, es decir, la propiedad con su permiso, a la que pueden pertenecer varios contactos.

## Resumen

- Después de los arreglos, de 19 criterios (A1 a C4 más el acceso por API) cumplen 16 y 3 quedan en espera por decisión (B1, B3 y B7).
- Lo más grave de la validación, el acceso por API, quedó resuelto: un rep solo lee sus datos y todas sus escrituras pasan por endpoints validados en el servidor.
- El hallazgo de B2 (un P3 propio entraba antes que un P2 cuando el volumen no alcanzaba) se corrigió con la regla acordada: orden estricto P1 a P5 también en ese caso.

## Mapa del repo

- **Stack.** Next.js 16 (App Router), React 19 y MongoDB Atlas con el driver nativo, sin ORM. Los validadores JSON Schema están en `lib/db/schema.ts`.
- **Dominio puro** en `lib/domain/`:
  - el motor, en `engine.ts`;
  - el catálogo de resultados (datos), en `outcomes.ts`;
  - las reglas editables, en `rules.ts`;
  - las campañas por día, en `campaigns.ts`;
  - la conversión entre documentos y memoria, en `snapshot.ts`.
- **Lectura.** `GET /api/state` carga el estado. Un rep recibe solo sus datos (`lib/db/scope.ts`); un manager recibe todo.
- **Escrituras del rep, en el servidor.** Pasan por `POST /api/allocate` (mañana, inicio del día y pedir más) y `POST /api/work` (guardar resultado, cerrar y reabrir el día, Reassign y reactivar). Las dos corren el dominio sobre la base, una a la vez, y escriben en una transacción con los bloqueos de propiedad (`lib/db/server-state.ts`).
- **`POST /api/state`** solo acepta escrituras de managers, y nunca de `call_log`, `reservations` ni `outcomes`.
- **No hay scheduler.** El reparto de la mañana corre en la primera carga del día (B7, en espera).
- **Colecciones.** properties, contacts, phone_numbers, campaigns, reservations, workdays, call_log, hand_offs, reps, rules, daily_metrics, sync_log, app_meta y outcomes (nueva), además de users y sessions. `property_locks` (nueva) solo la usa el servidor.
- **Catálogo.** Outreach Manager → Call outcomes, solo para administrador, con `POST /api/outcomes`.
- **Reglas.** Outreach Manager → Assignment rules: lote diario, lote extra, intentos máximos, refresco de lista, cierre del día y la opción de reiniciar el contador al reactivar.
- **Pruebas.** vitest (`tests/*.test.ts` y `tests/sprint18/`) y Playwright contra `calloutreach_e2e` (`tests/e2e/`).
- **RingCentral.** Solo aparece como texto en `components/p2/index.tsx:70-71`; queda fuera de alcance. La integración con monday sigue simulada con `syncLog`.

## Tabla por subtarea

En las pruebas, `it.fails` y `test.fail()` marcan un criterio que todavía no se cumple: la prueba describe lo esperado y debe fallar. Las de los criterios arreglados se convirtieron en pruebas normales.

| ID | Subtarea | Estado | Evidencia (código y pruebas) | Qué falla | Arreglo aplicado o propuesto | Horas est. | Horas reales |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Start the day y lista de hoy | **Cumple** | `emptyReason` `lib/domain/engine.ts`; `RepStart` `components/rep/index.tsx`. e2e: "A1 reloading does not regenerate or duplicate the list" y "A1 if a rep has no list, the start screen says why…". Unit: `tests/sprint18/a-workspace.test.ts` "A1 why a rep has no list" (4 pruebas). | — | Arreglo 8: sin "7:00 AM" fijo (el lote registra la hora real) y con el motivo: sin campaña del día, reparto de hoy todavía no hecho o pool vacío. | 3 | 0.3 |
| A2 | Lista del día (en la app, "My Outbound Dashboard") | **Cumple** | `queueSort` `lib/state/rep.ts`. e2e: "A2 the list is in priority order, and saving updates the counters without a reload". | — | Regla acordada: los contactos de una misma propiedad salen juntos. Sin cambios. | 0 | 0 |
| A3 | My follow-ups | **Cumple** | `RepFollowUps` `components/rep/index.tsx`; `myFollowUps` `lib/state/rep.ts`. e2e: "A3 My follow-ups: only the rep's own, split in Overdue, Today and Upcoming" y "A4 validations…" (fecha y hora sin desfase). Unit: B4. | — | Arreglo 5: el dueño es el rep asignado; se separan vencidos, de hoy y próximos, con la hora. | 2 | 0.1 |
| A4 | Formulario de resultado, notas y fecha de follow-up | **Cumple** | `saveResult` `lib/db/work.ts`; formulario en `RepDetail` `components/rep/index.tsx`. e2e: "A4 validations…", "A4 the server checks every save…", "A4 a double click on Save writes one call, not two" y la prueba de C1 en pantalla. | — | Arreglos 2 y 3: las opciones salen de `outcomes` (solo activos). El servidor valida resultado obligatorio y activo, fecha y hora de follow-up cuando el resultado lo exige, nada en el pasado y una sola llamada por entrega (`key` del borrador, índice único en `call_log.key`). | 6 | 0.2 |
| A5 | Ficha de contacto y propiedad, con lo que dijeron | **Cumple** | `historyOf` y `lastCallOf` `lib/domain/data.ts`; `HistList` y `SibRow` `components/rep/index.tsx`. e2e: "A5 the detail shows the property…" y "A5 \"Other contacts\" shows who made the last call…". Unit: "A5 contact detail" (2 pruebas). | — | Arreglo 9: historial por fecha y luego por id; autor de la última llamada. | 1 | 0.2 |
| A6 | Responsive | **Cumple** | e2e: "A6 rep views at 375px / 768px / 1440px…". | — | — | 0 | 0 |
| B1 | Pool filtrado por campaña activa, categoría y periodo de enfoque | **En espera** | `elig` y `freeGroups` `lib/domain/engine.ts`. Unit: "B1 callable pool…" (un caso por exclusión). | No existe "periodo de enfoque". | En espera de la definición. | 4 | — |
| B2 | Prioridad y reparto por porcentajes | **Cumple** | `morningAlloc` y `startAlloc` `lib/domain/engine.ts`; `priOf`. Unit: "agreed rule: no category shares…", "agreed rule: the rep's list is in strict P1 to P5 order…" y "agreed rule: when the daily volume is short, the allocation still picks strictly by priority…". | — | Regla acordada: orden estricto P1 a P5, también cuando el volumen no alcanza. Los follow-ups propios entran primero porque son P1; un indeciso propio (P3) espera detrás de todos los P2. No hay porcentajes. El seed del demo (`world.ts`, `artifactMorning`) conserva el reparto del artifact para que las e2e lo puedan comparar; el motor de la app usa el orden estricto. | 2 | 0.2 |
| B3 | Lista diaria por volumen del rep | **En espera** | `morningAlloc` `lib/domain/engine.ts`. Unit: "B3 daily list by volume…", con 2 `it.fails`. | Se entrega la propiedad completa aunque pase el volumen; el volumen es uno solo para todos. | En espera. | 4 | — |
| B4 | Follow-ups vencidos vuelven a su rep | **Cumple** | `saveOutcome` y `reassignOpen` `lib/domain/engine.ts`; `freeGroups`. Unit: "the follow-up belongs to the rep assigned…", "if its rep is not available, nobody else takes it…" y "Reassign moves… their pending follow-ups". e2e: "B4 Reassign (on the server)…". | — | Arreglo 5: dueño = rep asignado; si no está disponible, nadie más lo toma; Reassign pasa sus follow-ups al rep nuevo. | 2 | 0.1 |
| B5 | Una propiedad, un rep por día | **Cumple** | `commit` en `lib/db/server-state.ts` (transacción con `property_locks`, `_id` "fecha:propiedad"); `PLOCK` en `freeGroups`. e2e: "B5 the property lock is in MongoDB…", "B5 the browser never writes reservations", "B5 + B8 two reps ask for more at once…" y `alloc.spec.ts`. | — | Arreglo 4: bloqueo atómico en MongoDB, en transacción con las reservas. Reassign mueve el bloqueo y End workday lo libera. El navegador no escribe reservas. | 6 | 0.6 |
| B6 | Devolver lo no trabajado al pool al cierre | **Cumple** | `endDay` `lib/domain/engine.ts`. Unit: "B6 end of day" (2 pruebas). | — | Regla acordada: el día se cierra con End workday. Sin cambios. | 0 | 0 |
| B7 | Job de la mañana con salvaguardas | **En espera** | `allocateMorning` `lib/db/allocate.ts`. e2e: "B7 two morning runs at the same time…" y `test.fail` "[No implementado] B7 the morning run happens at a set hour…". | No hay scheduler a hora fija. El reparto ya se escribe en una sola transacción (efecto del arreglo 4), pero no hay reintento ni alerta. | En espera. | 10 | — |
| B8 | Pedir más contactos | **Cumple** | `requestMore` `lib/domain/engine.ts`. Unit: B8 (4 pruebas). e2e: "B8 the rep sees a clear message when the pool is empty". | — | — | 0 | 0 |
| C1 | Catálogo de resultados configurable | **Cumple** | `lib/domain/outcomes.ts` (campos y semilla); `lib/db/outcomes.ts`; `app/api/outcomes/route.ts`; `components/mgr/outcomes.tsx`. Unit: "C1 configurable outcome catalog" (4 pruebas). e2e: "only an administrator edits it…" y "an administrator creates and deactivates outcomes on the screen…". | — | Arreglo 2: colección `outcomes` con los 11 resultados. Pantalla y API solo para administrador. Desactivar no rompe el historial. No queda ninguna lista fija de resultados en el código. | 20 | 0.3 |
| C2 | Ventana de recall por resultado | **Cumple** | `nextFor` y `recallOf` `lib/domain/engine.ts`. Unit: "C2 recall window per outcome" (19 pruebas). e2e: "the next result uses the window an administrator set…". | — | Arreglo 6: todas las ventanas salen de `outcomes`, incluidas Follow Up y Wrong Number, con mínimo de 1 día. Un cambio no recalcula fechas ya puestas. `rules.rc` eliminado. | 2 | 0.1 |
| C3 | Propagación a la propiedad | **Cumple** | `saveOutcome` `lib/domain/engine.ts` (campo `propagates`). Unit: "C3 household propagation" (12 pruebas). | — | Ahora es configurable por resultado (C1). | 0 | 0 |
| C4 | Intentos máximos y on-hold | **Cumple** | `onHold`, `attemptsOf` y `reactivate` `lib/domain/engine.ts`; `reactivateContact` `lib/db/work.ts`. Unit: "C4 maximum attempts and on-hold" (8 pruebas). e2e: "the assigned rep or an administrator reactivates an on-hold contact…". | — | Arreglo 7: cada llamada cuenta 1 intento. El máximo es 6, el valor que ya usa la app en `rules/default.maxAtt`. Al máximo, on-hold. Excepción: un follow-up en el sexto intento se respeta. Reactivar lo hacen el rep asignado o un administrador, sin tocar el contador. El reinicio a 0 está detrás de `reactivateReset`, apagado y pendiente de Andrew. | 4 | 0.4 |
| API | Acceso por API (un rep contra otro rep) | **Cumple** | `lib/db/scope.ts`; `app/api/state/route.ts`; `app/api/work/route.ts`; `mayActFor` `lib/auth/roles.ts`. e2e: las 5 pruebas de "6. API: a rep cannot read or change another rep's data" y `db.spec.ts`. | — | Arreglo 1: GET filtrado por rol; escrituras del rep solo por `/api/work` y `/api/allocate`; Reassign en el servidor. | 12 | 0.2 |

**Horas reales:** es el tiempo que me tomó a mí cada arreglo, medido en el reloj entre commits: 11:31 a 13:57, unas 2.4 horas en total, más unas 0.2 horas de la corrección de B2. No incluye la revisión humana ni el despliegue. Las horas estimadas eran de desarrollo humano.

## Estado de D

| ID | Entregado | Pendiente |
| --- | --- | --- |
| D1 Inventario de reglas | Sección "D1. Inventario de reglas", actualizada con los cambios. | — |
| D2 Preguntas y plantilla | `docs/reglas-call-outreach-plantilla.md`, sin las preguntas ya resueltas y con las nuevas (campaña por día o por varios días, reinicio del contador, orden de los propios cuando el volumen no alcanza). | La sesión con Andrew, que haces tú. RingCentral queda fuera de alcance. |
| D3 Reglas acordadas | `docs/reglas-call-outreach.md`: las reglas acordadas ya están en "Acordada"; las demás siguen pendientes o en espera. | Cerrar después de la sesión. |

## Estado sugerido de las tareas padre

| Tarea | Estado sugerido | Por qué |
| --- | --- | --- |
| Rep Workspace | **Completed** | A1 a A6 y el acceso por API cumplen. |
| Daily Assignment Engine | **In progress** | B2, B4, B5, B6 y B8 cumplen. B1, B3 y B7 están en espera. |
| Call Outcomes & Rules | **Completed** | C1 a C4 cumplen. Queda una regla pendiente con Andrew (reiniciar el contador al reactivar), ya implementada como opción. |
| Discovery & Rules Definition | **In progress** | Faltan la sesión con Andrew y el cierre de D3. RingCentral queda fuera hasta tener la cuenta. |

## Antes de desplegar `fix/sprint-18`

1. Correr `npm run db:migrate` contra la base de producción **antes** del despliegue. Aplica los validadores nuevos (`outcomes`, `property_locks`, `call_log.out` y `contacts.out` sin lista fija, y los campos `fuAt`, `react` y `key`) y siembra el catálogo. Se puede correr las veces que haga falta. Si se olvida, `GET /api/state` siembra el catálogo igual, pero un resultado nuevo creado en el catálogo chocaría con el validador viejo de `call_log`.
2. Las sesiones abiertas de los reps tienen que recargar la página: el navegador de un rep ya no escribe en `/api/state`.

## Cómo correr las pruebas

```bash
git checkout fix/sprint-18
npm ci

# Dominio (vitest): datos en memoria de tests/sprint18/fixture.ts, sin base de datos
npx vitest run tests/sprint18     # 59 pruebas del sprint
npm test                          # todas las de vitest (87)

# E2E (Playwright) contra calloutreach_e2e (MONGODB_URI en .env.local)
npm run build
npx playwright test tests/e2e/sprint18.spec.ts --project=write --no-deps   # 28 pruebas del sprint
npm run test:e2e                                                           # suite completa

npm run lint && npx tsc --noEmit
```

Resultado en `fix/sprint-18`: 66 pruebas e2e y 87 de dominio pasan, igual que lint y tipos. Las pruebas que comparan la app con `artifact/app.html` tienen anotadas como equivalencias los cambios de texto que vienen de las reglas acordadas (`sprint18` en `tests/e2e/targets.ts`, `CHANGED` en `compare.spec.ts` y `flow.spec.ts`):
- "My follow-ups" con grupos y subtítulo nuevos;
- el follow-up con hora;
- Reassign transfiere los follow-ups;
- "On hold, max attempts" en el pool;
- la ayuda del manager sin "7:00 AM".

Datos usados:

- **vitest.** `tests/sprint18/fixture.ts`: un mundo controlado para el lunes 2 de noviembre de 2026 a las 8:20 AM, con un caso por regla, cargado con `fromDocs()` como lo carga la app.
- **e2e.** `reseed()` de `tests/e2e/db.ts` siembra `buildWorld()` en `calloutreach_e2e` para ese mismo día. También borra `property_locks`, crea los usuarios del equipo y cada prueba ajusta lo que necesita. El reloj del navegador está fijo en ese día y la zona es America/Los_Angeles.

## D1. Inventario de reglas

"Configurable" significa que se cambia sin desplegar.

| # | Regla | Dónde vive | Valor actual | Configurable | Criterios |
| --- | --- | --- | --- | --- | --- |
| 1 | Audiencias (categorías de hoy) | `AUDS` `lib/domain/catalogs.ts` | Pacific Palisades, Sunset Mesa, Malibu y Altadena | No (código) | B1 |
| 2 | Campaña: fecha, audiencias y reps | Colección `campaigns` | Una por día; sin campaña del día, nadie recibe lista (lo dice la pantalla de inicio) | Sí (Campaigns) | B1, A1 |
| 3 | Periodo de enfoque | No existe | — | — | B1 (en espera) |
| 4 | Prioridades P1 a P5 | `priOf` (campo `pri` del catálogo); permiso emitido = P2; `morningAlloc` y `startAlloc` | P1 follow-up, P2 permiso, P3 indeciso, P4 buzón y P5 el resto; orden estricto, también cuando el volumen no alcanza | El `pri` de cada resultado sí | B2, A2 |
| 5 | Porcentajes por categoría | No existen (regla acordada) | — | — | B2 |
| 6 | Lote diario por rep | `rules/default.first` y `scale` | 200 × 0.07 = 14, igual para todos | Sí | B3 (en espera) |
| 7 | Lote de "Request more" | `rules/default.more` | 100 × 0.07 = 7 | Sí | B8 |
| 8 | La propiedad se entrega completa | `freeGroups` y `reserve` | Completa | No | B3, B5 |
| 9 | Una propiedad, un rep por día | `property_locks`, transacción en `lib/db/server-state.ts` | Atómico en MongoDB | No | B5 |
| 10 | Dueño del follow-up | `saveOutcome` (campo `sameRep`), `reassignOpen` | El rep asignado; si falta, espera en su cola; Reassign lo transfiere | No | B4, A3 |
| 11 | Follow-up con fecha y hora | `fuAt`; `saveResult` | Fecha y hora obligatorias; puede ser hoy con hora futura; nunca en el pasado | No | A4 |
| 12 | Catálogo de resultados | Colección `outcomes` | 11 resultados | Sí (administrador) | C1, A4 |
| 13 | Ventanas de recall | `outcomes.recallDays` y `calendarDays`; `recallOf` | Not Contacted 1, Left VM 3, Wrong Number 1, Hung Up 2 y Follow Up 2 (hábiles); Undecided 10 y Not Interested 180 (naturales); mínimo 1 | Sí | C2 |
| 14 | Días hábiles | `isBiz` `lib/domain/dates.ts` | Lunes a viernes | No | C2 |
| 15 | Propagación | `outcomes.propagates` | No o lead: la propiedad. Do Not Contact: la persona | Sí | C3 |
| 16 | Qué cuenta como intento | `outcomes.countsAsAttempt` | Todo (regla acordada) | Sí | C4 |
| 17 | Intentos máximos | `rules/default.maxAtt` | 6 | Sí | C4 |
| 18 | On-hold | `onHold` y `callable` | Al máximo (salvo un follow-up agendado en el sexto intento) o sin teléfono que funcione | No | C4, B1 |
| 19 | Reactivar | `reactivate`; `rules/default.reactivateReset` | El rep asignado o un administrador; no reinicia el contador | Reinicio: sí (apagado) | C4 |
| 20 | Hora del reparto de la mañana | No hay scheduler | Primera carga del día; el lote registra la hora real | No | B7 (en espera) |
| 21 | Horario de llamadas | `rules/default.hours` | "9:00 AM to 7:00 PM Pacific, Monday to Saturday" (solo texto) | Texto | — |
| 22 | Cierre del día | `rules/default.endDay`; `endDay` | Vuelven al pool con End workday (regla acordada) | Sí | B6 |
| 23 | Refresco de lista | `rules/default.refresh` | `daily` (el motor no lee `weekly`) | Sí, sin efecto | — |
| 24 | "Request more" solo con todo documentado | `requestMore` | Sí | No | B8 |

### Inconsistencias que quedan

1. **Días hábiles contra horario.** Los días hábiles son de lunes a viernes, pero el horario dice "Monday to Saturday".
2. **Refresco semanal.** "Weekly" se puede elegir en Assignment rules, pero el motor no lo usa.
3. **Correos diarios.** El correo diario simulado (reportes, fuera de alcance) sigue diciendo "Sent: 7:00 AM".
