# Reglas de Call Outreach

**Estado del documento:** borrador. Cada regla trae el valor que usa hoy la app y queda **Pendiente de confirmar con Andrew** hasta la sesión. Después de la sesión solo hay que reemplazar el valor y cambiar el estado a **Acordada**.

La estructura es la misma que la de `docs/reglas-call-outreach-plantilla.md`, con la misma numeración. Para saber dónde vive cada regla en el código, ver la sección "D1. Inventario de reglas" de `docs/validacion-sprint-18.md`.

## 1. Audiencias y categorías

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 1.1 | Categoría de contactos | La zona (audiencia): Pacific Palisades, Sunset Mesa, Malibu o Altadena, todas "Fire Rebuild" | Pendiente de confirmar con Andrew |
| 1.2 | Periodo de enfoque | No existe: entra cualquier contacto de las zonas de la campaña | Pendiente de confirmar con Andrew |
| 1.3 | Campañas | Una por día, con fecha, zonas, reps y meta de leads. Sin campaña del día, nadie recibe lista | Pendiente de confirmar con Andrew |

## 2. Prioridades y porcentajes

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 2.1 | Orden de prioridad | P1 Follow Up (mismo rep), P2 Permit Issued, P3 Undecided (mismo rep), P4 Left VM y P5 nunca contactado. Si empatan, va primero el que esperó más. Los contactos de un hogar van juntos y el hogar se ordena por su mejor prioridad | Pendiente de confirmar con Andrew |
| 2.2 | Porcentaje por categoría | No hay porcentajes; si una zona se agota, se sigue con las demás de la campaña | Pendiente de confirmar con Andrew |

## 3. Volumen diario

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 3.1 | Contactos por rep al día | 200, igual para todos. Con la escala actual de datos (0.07, la define el cliente) son 14 | Pendiente de confirmar con Andrew |
| 3.2 | Hogar completo contra límite | Se entrega el hogar completo aunque el rep pase su número | Pendiente de confirmar con Andrew |
| 3.3 | Rep que no trabaja un día | Se deja fuera de la campaña del día | Pendiente de confirmar con Andrew |

## 4. Follow-ups

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 4.1 | A quién vuelve | Al primer rep que llamó al contacto | Pendiente de confirmar con Andrew |
| 4.2 | Si el rep falta | Espera; nadie lo recibe ese día | Pendiente de confirmar con Andrew |
| 4.3 | Dentro o fuera del número diario | Dentro, y van primero en la lista | Pendiente de confirmar con Andrew |

## 5. Catálogo de resultados

Hoy el catálogo está fijo en la app. Los días de los resultados marcados con (*) se cambian en Outreach Manager → Assignment rules.

| Resultado | Intento | Vuelve en | Afecta al hogar | Pide fecha | Estado |
| --- | --- | --- | --- | --- | --- |
| Not Contacted | Sí | 1 día hábil (*) | No | No | Pendiente de confirmar con Andrew |
| Left VM | Sí | 3 días hábiles (*) | No | No | Pendiente de confirmar con Andrew |
| Wrong Number | Sí | 1 día hábil al otro número; si no hay, on-hold | No | No | Pendiente de confirmar con Andrew |
| Hung Up | Sí | 2 días hábiles (*) | No | No | Pendiente de confirmar con Andrew |
| Undecided | Sí | 10 días naturales, mismo rep (*) | No | No | Pendiente de confirmar con Andrew |
| Follow Up | Sí | La fecha elegida; si no hay, 2 días hábiles. Mismo rep | No | Sí | Pendiente de confirmar con Andrew |
| Working on Plans | Sí | No vuelve: pasa a ventas como Potential Lead | Sí: el resto del hogar sale de las listas | No | Pendiente de confirmar con Andrew |
| Interested | Sí | No vuelve: pasa a ventas como Potential Lead | Sí: el resto del hogar sale de las listas | No | Pendiente de confirmar con Andrew |
| Not Interested | Sí | 180 días naturales (*) | Sí: el resto del hogar sale de las listas (solo esa propiedad) | No | Pendiente de confirmar con Andrew |
| Already Building / Done | Sí | Nunca | Sí: el resto del hogar sale y la propiedad queda con "Construction started" | No | Pendiente de confirmar con Andrew |
| Do Not Contact | Sí | Nunca | Sí: el resto del hogar y todas las propiedades de esa persona | No | Pendiente de confirmar con Andrew |

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 5.1 | Ventana de 0 días | En días hábiles se toma como 1; en días naturales es el mismo día | Pendiente de confirmar con Andrew |
| 5.2 | Cambio de ventana | Solo aplica a los resultados nuevos; no recalcula las fechas ya puestas | Pendiente de confirmar con Andrew |

## 6. Intentos y on-hold

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 6.1 | Máximo de intentos | 6, y todos los resultados cuentan. Un follow-up agendado en el último intento se pierde | Pendiente de confirmar con Andrew |
| 6.2 | Reactivar | No hay forma de reactivar un contacto que llegó al máximo. On-hold (sin teléfono) se reactiva solo al agregar un número. "Reopen property" quita la detención del hogar pero no reinicia los intentos | Pendiente de confirmar con Andrew |

## 7. Horarios

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 7.1 | Hora del reparto de la mañana | Sin hora fija: corre la primera vez que alguien abre la app en el día. La pantalla dice "7:00 AM" | Pendiente de confirmar con Andrew |
| 7.2 | Días de trabajo | Los días de espera cuentan de lunes a viernes. El horario de llamadas dice lunes a sábado, de 9 AM a 7 PM (hora del Pacífico) | Pendiente de confirmar con Andrew |
| 7.3 | Cierre del día | Lo no llamado vuelve al pool cuando el rep pulsa End workday (opción alternativa: el mismo rep lo conserva) | Pendiente de confirmar con Andrew |

## 8. Pedir más contactos

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 8.1 | Cuándo y cuántos | Solo con toda la lista documentada. Lote de 100, que con la escala de datos son 7, o el hogar completo | Pendiente de confirmar con Andrew |
| 8.2 | Refresco de la lista | Diario. La opción semanal aparece en pantalla pero no tiene efecto | Pendiente de confirmar con Andrew |

## 9. Propagación al hogar

| # | Regla | Valor | Estado |
| --- | --- | --- | --- |
| 9.1 | Un "no" para todo el hogar | Not Interested, Already Building y Do Not Contact detienen al resto del hogar; Do Not Contact detiene además las otras propiedades de la persona | Pendiente de confirmar con Andrew |
| 9.2 | Colgó | Solo afecta al contacto (marcado como "propuesto") | Pendiente de confirmar con Andrew |
