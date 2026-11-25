# Reglas de Call Outreach

**Estado del documento:** borrador con reglas acordadas. Cada regla está en uno de tres estados:
- **Acordada:** implementada en `fix/sprint-18`.
- **Pendiente de confirmar con Andrew.**
- **En espera:** se decide después y no se construye todavía.

Usa la misma estructura que `docs/reglas-call-outreach-plantilla.md`. "Propiedad" es la propiedad con su permiso, a la que pueden pertenecer varios contactos. Para saber dónde vive cada regla en el código, ver la sección "D1. Inventario de reglas" de `docs/validacion-sprint-18.md`.

## 1. Audiencias, categorías y campañas

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 1.1 | Categoría de contactos | La zona (audiencia): Pacific Palisades, Sunset Mesa, Malibu o Altadena | Pendiente de confirmar con Andrew |
| 1.2 | Periodo de enfoque | No existe | En espera |
| 1.3 | Campañas | Una por día, con fecha, zonas, reps y meta. Sin campaña del día, nadie recibe lista y la pantalla lo dice | Pendiente de confirmar con Andrew |

## 2. Prioridades y orden

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 2.0 | Orden de prioridad | P1 Follow Up, P2 Permit Issued, P3 Undecided, P4 Left VM y P5 el resto, en orden estricto | Acordada |
| 2.0b | Porcentaje por categoría | No hay porcentajes | Acordada |
| 2.0c | Orden de la lista del día | Los contactos de una misma propiedad salen juntos | Acordada |
| 2.1 | Propios cuando no alcanza el número del día | Hoy el reparto toma primero los follow-ups y los indecisos propios, así que un P3 propio puede entrar antes que un P2 | Pendiente de confirmar con Andrew |

## 3. Volumen diario

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 3.0 | Contactos por rep al día | 200, igual para todos (14 con la escala de datos 0.07, que define el cliente) | En espera |
| 3.1 | Propiedad completa contra límite | Se entrega completa | En espera |
| 3.2 | Rep que no trabaja un día | Se deja fuera de la campaña del día | Pendiente de confirmar con Andrew |

## 4. Follow-ups

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 4.0 | A quién pertenece | Al rep asignado al contacto (el que lo agenda desde su lista) | Acordada |
| 4.0b | Si ese rep no está disponible | Se queda en su cola hasta que vuelva; nadie más lo toma | Acordada |
| 4.0c | Reassign | Los follow-ups pendientes de los contactos reasignados pasan al rep nuevo | Acordada |
| 4.0d | Fecha y hora | Se agenda con fecha y hora. Puede ser el mismo día si la hora es futura; nunca en el pasado | Acordada |
| 4.1 | Dentro o fuera del número diario | Dentro, y van primero | Pendiente de confirmar con Andrew |

## 5. Catálogo de resultados

El catálogo está en la colección `outcomes` y lo edita un administrador en Outreach Manager → Call outcomes, sin desplegar. Desactivar un resultado lo quita del formulario y conserva el historial.

| Resultado | Cuenta como intento | Vuelve en | Afecta además a | Pide fecha y hora | Estado de los valores |
| --- | --- | --- | --- | --- | --- |
| Not Contacted | Sí | 1 día hábil | Nadie | No | Pendiente de confirmar con Andrew |
| Left VM | Sí | 3 días hábiles | Nadie | No | Pendiente de confirmar con Andrew |
| Wrong Number | Sí | 1 día hábil al otro número; si no hay, on-hold | Nadie | No | Pendiente de confirmar con Andrew |
| Hung Up | Sí | 2 días hábiles | Nadie | No | Pendiente de confirmar con Andrew |
| Undecided | Sí | 10 días naturales, mismo rep | Nadie | No | Pendiente de confirmar con Andrew |
| Follow Up | Sí | La fecha y hora elegidas, mismo rep | Nadie | Sí | Pendiente de confirmar con Andrew |
| Working on Plans | Sí | No vuelve: pasa a ventas | La propiedad | No | Pendiente de confirmar con Andrew |
| Interested | Sí | No vuelve: pasa a ventas | La propiedad | No | Pendiente de confirmar con Andrew |
| Not Interested | Sí | 180 días naturales | La propiedad (solo esa) | No | Pendiente de confirmar con Andrew |
| Already Building / Done | Sí | Nunca | La propiedad, que queda con "Construction started" | No | Pendiente de confirmar con Andrew |
| Do Not Contact | Sí | Nunca | La persona: todas sus propiedades | No | Pendiente de confirmar con Andrew |

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 5.0 | Catálogo editable | Crear, editar y desactivar sin desplegar; solo administrador | Acordada |
| 5.1 | Ventana mínima | Al menos 1 día; el catálogo no acepta 0 | Acordada |
| 5.2 | Cambio de ventana | Solo afecta a los resultados nuevos; no se recalculan las fechas ya puestas | Acordada |

## 6. Intentos y on-hold

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 6.0 | Qué cuenta como intento | Cada llamada cuenta 1, sea cual sea el resultado | Acordada |
| 6.0b | Máximo | 6 (es el valor que usa hoy la app: `rules/default.maxAtt`). Al llegar, el contacto pasa a on-hold y sale del pool | Acordada |
| 6.0c | Excepción del sexto intento | Si en el sexto intento se agenda un follow-up, se respeta. El contacto pasa a on-hold solo si esa llamada tampoco se concreta | Acordada |
| 6.0d | Quién reactiva | El rep asignado o un administrador; el contacto vuelve al pool | Acordada |
| 6.1 | El contador al reactivar | Hoy mantiene los intentos (empieza una nueva ronda). Vuelve a 0 con la opción "Back to 0" de Assignment rules, apagada | Pendiente de confirmar con Andrew |

## 7. Horarios y cierre

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 7.0 | Cierre del día | Se cierra cuando el rep pulsa End workday; lo no llamado vuelve al pool | Acordada |
| 7.1 | Hora del reparto de la mañana | Sin hora fija: corre la primera vez que alguien abre la app en el día | En espera |
| 7.2 | Días de trabajo | Los días de espera cuentan de lunes a viernes; el horario dice lunes a sábado | Pendiente de confirmar con Andrew |

## 8. Pedir más contactos

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 8.1 | Cuándo y cuántos | Solo con toda la lista documentada; lote de 100 (7 con la escala de datos) o la propiedad completa | Pendiente de confirmar con Andrew |
| 8.2 | Refresco de la lista | Diario; la opción semanal aparece pero no tiene efecto | Pendiente de confirmar con Andrew |

## 9. Propagación a la propiedad

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 9.1 | Un "no" para toda la propiedad | Not Interested, Already Building y Do Not Contact detienen al resto de la propiedad; Do Not Contact, además, todas las propiedades de la persona | Pendiente de confirmar con Andrew |
| 9.2 | Colgó | Solo afecta al contacto ("propuesto") | Pendiente de confirmar con Andrew |
