# Reglas de Call Outreach

**Estado del documento:** borrador con reglas acordadas. Cada regla está en uno de cuatro estados:
- **Acordada:** implementada en `fix/sprint-18` o, las de la ronda 1 de Andrew (noviembre de 2026), en `feat/campaign-filtering`.
- **Propuesta pendiente de Andrew:** implementada con un valor que propusimos, configurable, a la espera de que Andrew lo confirme.
- **Pendiente de confirmar con Andrew.**
- **En espera:** se decide después y no se construye todavía.

Los documentos que mandó Andrew en la ronda 1 están en `docs/andrew/` (Assignment Engine y Dynamic Campaign Filtering).

Usa la misma estructura que `docs/reglas-call-outreach-plantilla.md`. "Propiedad" es la propiedad con su permiso, a la que pueden pertenecer varios contactos. Para saber dónde vive cada regla en el código, ver la sección "D1. Inventario de reglas" de `docs/validacion-sprint-18.md`.

## 1. Audiencias, categorías y campañas

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 1.1 | Categoría de contactos | La zona (audiencia): Pacific Palisades, Sunset Mesa, Malibu o Altadena | Pendiente de confirmar con Andrew |
| 1.2 | Periodo de enfoque | No existe | En espera |
| 1.3 | Campañas | Permanentes: se crean una vez y siguen activas hasta que alguien las pausa o las termina. Puede haber varias activas a la vez. Cada una dice sus zonas (audiencias), sus reps y su meta | Acordada |
| 1.3b | Creación y reparto | Son funciones separadas: el reparto diario toma los contactos de todas las campañas activas del rep juntas, con el orden P1 a P5 y todas las reglas; un contacto que está en dos campañas se asigna una sola vez | Acordada |
| 1.3c | Pausar o terminar | Detiene las asignaciones nuevas de sus contactos y conserva todo el historial, incluidos los follow-ups. Terminar es definitivo. Las campañas diarias que existían quedan terminadas, como historial | Acordada |
| 1.3d | Sin campañas activas | Nadie recibe lista y la pantalla de inicio dice "No active campaigns" | Acordada |
| 1.4 | Campañas armadas con filtros | Filtros sobre cualquier columna, con operadores y lógica AND/OR (documento Dynamic Campaign Filtering) | En espera |

## 2. Prioridades y orden

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 2.0 | Orden de prioridad | P1 Follow Up, P2 Permit Issued, P3 Undecided, P4 Left VM y P5 el resto, en orden estricto, también cuando el volumen diario no alcanza: los follow-ups propios entran primero porque son P1, y un indeciso propio (P3) no entra antes que un permiso emitido (P2) | Acordada |
| 2.0b | Porcentaje por categoría | No hay porcentajes | Acordada |
| 2.0c | Orden de la lista del día | Los contactos de una misma propiedad salen juntos | Acordada |

## 3. Volumen diario

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 3.0 | Contactos por rep al día | 200, igual para todos (14 con la escala de datos 0.07, que define el cliente) | En espera |
| 3.1 | Propiedad completa contra límite | Se entrega completa | En espera |
| 3.2 | Rep que no trabaja un día | Hoy solo quitándolo de sus campañas o pausándolas; sus follow-ups lo esperan. El brief propone que la gerencia reasigne su trabajo | Pendiente de confirmar con Andrew |

## 4. Follow-ups

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 4.0 | A quién pertenece | Al rep asignado al contacto (el que lo agenda desde su lista) | Acordada |
| 4.0b | Si ese rep no está disponible | Se queda en su cola hasta que vuelva; nadie más lo toma | Acordada |
| 4.0c | Reassign | Los follow-ups pendientes de los contactos reasignados pasan al rep nuevo | Acordada |
| 4.0d | Fecha y hora | Se agenda con fecha y hora. Puede ser el mismo día si la hora es futura; nunca en el pasado | Acordada |
| 4.1 | Dentro o fuera del número diario | Dentro, y van primero | Pendiente de confirmar con Andrew |

## 5. Catálogo de resultados

El catálogo está en la colección `outcomes` y lo edita el Outreach Manager (o un administrador) en Outreach Manager → Global Assignment Rules, sin desplegar. Desactivar un resultado lo quita del formulario y conserva el historial.

"Cuenta como intento" de Wrong Number y "Crea lead" están acordados con Andrew. "Cuenta como connect" es una propuesta pendiente de Andrew (regla 5.4). Los días de espera y los efectos siguen pendientes de confirmar.

| Resultado | Cuenta como intento | Cuenta como connect (propuesta) | Crea lead | Vuelve en | Afecta además a | Pide fecha y hora | Estado de los días y efectos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Not Contacted | Sí | No | No | 1 día hábil | Nadie | No | Pendiente de confirmar con Andrew |
| Left VM | Sí | No | No | 3 días hábiles | Nadie | No | Pendiente de confirmar con Andrew |
| Wrong Number | **No (acordada)** | No | No | 1 día hábil al otro número válido; si no hay, sale del pool | Nadie | No | Pendiente de confirmar con Andrew |
| Hung Up | Sí | Sí | No | 2 días hábiles | Nadie | No | Pendiente de confirmar con Andrew |
| Undecided | Sí | Sí | No | 10 días naturales, mismo rep | Nadie | No | Pendiente de confirmar con Andrew |
| Follow Up | Sí | Sí | No | La fecha y hora elegidas, mismo rep | Nadie | Sí | Pendiente de confirmar con Andrew |
| Working on Plans | Sí | Sí | **Sí (acordada)** | No vuelve: pasa a ventas | La propiedad | No | Pendiente de confirmar con Andrew |
| Interested | Sí | Sí | **Sí (acordada)** | No vuelve: pasa a ventas | La propiedad | No | Pendiente de confirmar con Andrew |
| Not Interested | Sí | Sí | No | 180 días naturales | La propiedad (solo esa) | No | Pendiente de confirmar con Andrew |
| Already Building / Done | Sí | Sí | No | Nunca | La propiedad, que queda con "Construction started" | No | Pendiente de confirmar con Andrew |
| Do Not Contact | Sí | Sí | No | Nunca | La persona: todas sus propiedades | No | Pendiente de confirmar con Andrew |

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 5.0 | Catálogo editable | Crear, editar y desactivar sin desplegar; el Outreach Manager (rol manager) o un administrador | Acordada |
| 5.1 | Ventana mínima | Al menos 1 día; el catálogo no acepta 0 | Acordada |
| 5.2 | Cambio de ventana | Solo afecta a los resultados nuevos; no se recalculan las fechas ya puestas | Acordada |
| 5.3 | Crea lead | Working on Plans e Interested generan un lead: la propiedad pasa a ventas y cuenta en New Leads. Es un campo del catálogo ("Creates a lead") | Acordada |
| 5.4 | Cuenta como connect | Los resultados en que una persona contestó: Hung Up, Undecided, Follow Up, Working on Plans, Interested, Not Interested, Already Building / Done y Do Not Contact. No cuentan Not Contacted, Left VM ni Wrong Number. Es un campo del catálogo ("Counts as connect") | Propuesta pendiente de Andrew |

## 6. Intentos y on-hold

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 6.0 | Qué cuenta como intento | Cada llamada cuenta 1, excepto Wrong Number | Acordada |
| 6.0b | Máximo | 6 (es el valor que usa hoy la app: `rules/default.maxAtt`). Al llegar, el contacto pasa a on-hold y sale del pool | Acordada |
| 6.0c | Excepción del sexto intento | Si en el sexto intento se agenda un follow-up, se respeta. El contacto pasa a on-hold solo si esa llamada tampoco se concreta | Acordada |
| 6.0d | Quién reactiva | El rep asignado, el Outreach Manager (Andrew, rol manager) o un administrador; el contacto vuelve al pool | Acordada |
| 6.1 | El contador al reactivar | Los intentos no vuelven a 0 (empieza una nueva ronda). La opción "Back to 0" de Global Assignment Rules queda apagada | Acordada |
| 6.2 | Wrong Number | No cuenta como intento. El número marcado queda inválido y no se vuelve a ofrecer para llamar. Si el contacto no tiene otro número válido, sale del pool hasta que se agregue uno | Acordada |
| 6.2b | Números alternativos verificados | Usar solo números alternativos verificados (brief Assignment Engine) | Pendiente de confirmar con Andrew |

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

## 10. Métricas

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 10.1 | Métricas de Andrew | Calls Made, Connects y New Leads | Acordada |
| 10.2 | Cálculo | Por rep y por día, con el total del equipo, un ranking por métrica, Dial to Connect (Connects sobre Calls Made), Connect to Lead (New Leads sobre Connects) y la comparación con el mismo día de la semana anterior. Vista Reports, para el Outreach Manager (rol manager) y los administradores; por defecto, hoy en hora del Pacífico | Acordada |
| 10.3 | Fuente de los datos | Hoy, los resultados registrados en la app (una llamada por resultado). Cuando exista la cuenta de RingCentral, sus llamadas; los cálculos no cambian | Acordada |
| 10.4 | Qué es un connect | Ver la regla 5.4 | Propuesta pendiente de Andrew |
| 10.5 | Envío del resumen por correo y métricas en monday | No se construye todavía | En espera |

## 11. Sistema de llamadas

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 11.1 | Proveedor | RingCentral reemplazará a Orum. Todavía no tenemos la cuenta | Acordada |
| 11.2 | Mientras tanto | Marcado manual: el rep llama con un clic desde su lista o desde la ficha del contacto (enlace `tel:` con el número normalizado) y registra el resultado en la misma vista. Los números inválidos no se ofrecen | Acordada |
