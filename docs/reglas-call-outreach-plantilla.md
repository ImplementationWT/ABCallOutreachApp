# Reglas de Call Outreach: plantilla para la sesión con Andrew

Duración máxima: 60 minutos. Primero van las preguntas marcadas como **PRIORITARIA**, luego las de ajuste. Las marcadas **EN ESPERA** solo se registran: no se construyen todavía.

Ya están acordadas y no se preguntan. El detalle está en `docs/reglas-call-outreach.md`, con el número de cada regla:
- **2.0, 2.0b y 2.0c:** orden estricto de prioridades P1 a P5, también cuando el volumen diario no alcanza, sin porcentajes por categoría; los contactos de una misma propiedad salen juntos en la lista.
- **4.0 a 4.0d:** el follow-up pertenece al rep asignado y espera si ese rep no está; con Reassign pasa al rep nuevo; se agenda con fecha y hora, nunca en el pasado.
- **5.0 a 5.3:** catálogo de resultados editable sin desplegar; ventanas de recall de al menos 1 día, sin recalcular las fechas ya puestas; Working on Plans e Interested crean un lead.
- **6.0 a 6.0d:** cada llamada cuenta 1 intento, excepto Wrong Number; el máximo es 6, con la excepción del sexto intento; un contacto en on-hold lo reactivan su rep, el Outreach Manager o un administrador.
- **6.1:** al reactivar, los intentos no vuelven a 0.
- **6.2:** Wrong Number marca el número como inválido y no se vuelve a ofrecer; sin otro número válido, el contacto sale del pool.
- **1.3 a 1.3d:** las campañas son permanentes (activa, pausada o terminada) y puede haber varias activas a la vez; crearlas y el reparto diario son funciones separadas; pausar o terminar detiene las asignaciones nuevas y conserva el historial; sin campañas activas, nadie recibe lista ("No active campaigns").
- **7.0:** el día se cierra con End workday.
- **10.1 a 10.3:** las métricas son Calls Made, Connects y New Leads, en la vista Reports, por rep y día, contra la semana anterior; hoy salen de los resultados registrados en la app.
- **11.1 y 11.2:** RingCentral reemplazará a Orum; mientras tanto, marcado manual con un clic.

Cada pregunta trae:
- la pregunta;
- el valor que usa hoy la app;
- ejemplos de respuesta;
- una casilla para el valor acordado;
- el impacto si cambia.

El esfuerzo está en horas de desarrollo.

## Agenda

| Minutos | Tema |
| --- | --- |
| 0 a 5 | Qué cambió desde la validación (reglas ya acordadas, catálogo editable) |
| 5 a 25 | PRIORITARIAS: 1.1 y 5.4 |
| 25 a 40 | Catálogo de resultados (tabla de la sección 5) |
| 40 a 55 | Ajuste: 3.1, 3.2, 4.1, 6.2b, 7.2, 8.1, 8.2, 9.1, 9.2; registrar las de EN ESPERA (1.2, 1.4, 7.1) |
| 55 a 60 | Repaso de lo acordado |

---

## 1. Audiencias, categorías y campañas

### 1.1 PRIORITARIA. ¿Qué es una "categoría" de contactos?

- **Pregunta:** cuando hablamos de categorías, ¿se refiere a la zona (Pacific Palisades, Malibu…), a la etapa del permiso o a otra cosa?
- **Hoy:** la única agrupación son las 4 zonas (audiencias), y cada campaña elige cuáles se llaman ese día.
- **Ejemplos de respuesta:** "la zona"; "si tiene permiso o no"; "cuánto tiempo lleva sin construir".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** si no es la zona, hay que agregar ese dato a cada propiedad y al reparto. 4 a 8 h.

### 1.2 EN ESPERA. Periodo de enfoque

- **Pregunta:** ¿hay un periodo en el que nos concentramos en ciertos contactos, por ejemplo "este mes solo permisos de los últimos 90 días"?
- **Hoy:** no existe.
- **Ejemplos de respuesta:** "no hace falta"; "permisos emitidos en los últimos N días".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** un filtro más en el reparto. 4 h.

### 1.3 ACORDADA. Campañas permanentes

Ya no se pregunta. Las campañas se crean una vez y siguen activas hasta que alguien las pausa o las termina; puede haber varias activas a la vez (reglas 1.3 a 1.3d).

### 1.4 EN ESPERA. Campañas armadas con filtros

- **Pregunta:** ¿qué columnas y operadores necesita primero (zona, estado del permiso, inicio de obra, fecha y precio de venta, tipo de contacto)?
- **Hoy:** cada campaña se arma con zonas (audiencias). El documento Dynamic Campaign Filtering pide filtros sobre cualquier columna, con AND/OR.
- **Ejemplos de respuesta:** los tres ejemplos del documento: Palisades con permiso emitido y obra sin empezar; vendidas después del 1/7/2025 por más de 3 millones; vendedores en Cheviot Hills.
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** constructor de filtros y datos de venta y de tipo de contacto que hoy no se cargan. Se estima en la siguiente ronda.

## 3. Volumen diario (EN ESPERA)

### 3.1 Propiedad completa contra límite diario

- **Pregunta:** si al rep le faltan 2 contactos para su número y la siguiente propiedad tiene 3 personas, ¿se le da completa (pasa su número) o se para?
- **Hoy:** se entrega completa.
- **Ejemplos de respuesta:** "completa"; "parar y darla mañana"; "solo al dueño principal".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** 2 a 4 h.

### 3.2 Reps que no trabajan un día

- **Pregunta:** ¿cómo nos avisa que un rep no trabaja hoy?
- **Hoy:** solo quitándolo de sus campañas o pausándolas. Sus follow-ups lo esperan. El brief Assignment Engine propone que la gerencia reasigne su trabajo y sus follow-ups.
- **Ejemplos de respuesta:** "con la campaña está bien"; "un interruptor 'no trabaja hoy'".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** 2 a 3 h.

## 4. Follow-ups

### 4.1 Dentro o fuera del número diario

- **Pregunta:** ¿los follow-ups cuentan dentro del número diario del rep o se suman aparte?
- **Hoy:** cuentan dentro y van primero.
- **Ejemplos de respuesta:** "dentro"; "aparte".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** 1 a 2 h.

## 5. Catálogo de resultados (tabla para llenar)

- **Pregunta:** ¿estos días y efectos por resultado son los correctos?
- **Hoy:** el catálogo ya se cambia sin desplegar, por su API (el Outreach Manager o un administrador). Cada llamada cuenta como intento, excepto Wrong Number (acordado), y los días son al menos 1. Working on Plans e Interested crean un lead (acordado).
- **Impacto si cambia:** ninguno de código. Los valores los cambia el administrador.

| Resultado | Hoy: vuelve en | Hoy: afecta además a | Hoy: pide fecha y hora | Acordado: días (hábiles o naturales) | Acordado: afecta además a (nadie / la propiedad / la persona) | Acordado: pide fecha y hora |
| --- | --- | --- | --- | --- | --- | --- |
| Not Contacted | 1 día hábil | Nadie | No | | | |
| Left VM | 3 días hábiles | Nadie | No | | | |
| Wrong Number | 1 día hábil al otro número válido; si no hay, sale del pool | Nadie | No | | | |
| Hung Up | 2 días hábiles | Nadie | No | | | |
| Undecided | 10 días naturales, mismo rep | Nadie | No | | | |
| Follow Up | La fecha y hora que elige el rep, mismo rep | Nadie | Sí | | | |
| Working on Plans | Pasa a ventas | La propiedad | No | | | |
| Interested | Pasa a ventas | La propiedad | No | | | |
| Not Interested | 180 días naturales | La propiedad | No | | | |
| Already Building / Done | Nunca | La propiedad | No | | | |
| Do Not Contact | Nunca | La persona (todas sus propiedades) | No | | | |
| ¿Resultado nuevo? | | | | | | |

### 5.4 PRIORITARIA. ¿Qué resultados cuentan como connect?

- **Pregunta:** para las métricas, ¿cuáles resultados significan que una persona contestó?
- **Hoy (propuesta, ya configurable en el catálogo):** Hung Up, Undecided, Follow Up, Working on Plans, Interested, Not Interested, Already Building / Done y Do Not Contact. No cuentan Not Contacted, Left VM ni Wrong Number.
- **Ejemplos de respuesta:** "así está bien"; "Hung Up no cuenta"; "solo las conversaciones".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** ninguno de código: lo cambia el Outreach Manager en el catálogo.

## 6. Intentos y on-hold

### 6.1 ACORDADA. El contador al reactivar

Ya no se pregunta. Al reactivar un contacto en on-hold, sus intentos no vuelven a 0; es fijo.

### 6.2b Números alternativos verificados

- **Pregunta:** cuando un número resulta equivocado, ¿cómo se verifica un número alternativo antes de llamarlo?
- **Hoy:** con Wrong Number, el número queda inválido y se llama al siguiente número del contacto que no esté marcado como inválido, sin verificación aparte.
- **Ejemplos de respuesta:** "así está bien"; "solo números que vengan de una fuente verificada"; "que alguien lo confirme antes".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** un estado "verificado" por número y quién lo marca. 2 a 4 h.

## 7. Horarios

### 7.1 EN ESPERA. Hora del reparto de la mañana

- **Pregunta:** ¿a qué hora de California deben estar listas las listas? ¿Qué hacemos si ese reparto falla?
- **Hoy:** no hay hora fija; se arma la primera vez que alguien abre la app en el día. El reparto ya se escribe todo o nada.
- **Ejemplos de respuesta:** "7:00 AM, y si falla que me avise por correo".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** tarea programada con horario de verano, reintento y aviso. 8 a 12 h.

### 7.2 Días de trabajo

- **Pregunta:** ¿se trabaja de lunes a viernes o de lunes a sábado? ¿Los días de espera cuentan los sábados?
- **Hoy:** los días de espera cuentan de lunes a viernes, pero el horario dice lunes a sábado.
- **Ejemplos de respuesta:** "lunes a viernes"; "lunes a sábado".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** 1 h.

## 8. Pedir más contactos

### 8.1 Cuándo y cuántos

- **Pregunta:** ¿el rep solo puede pedir más cuando documentó toda su lista? ¿Cuántos más?
- **Hoy:** solo con toda la lista documentada. El lote es de 100, escalado a 7 por los datos actuales.
- **Ejemplos de respuesta:** "sí, 50"; "cuando le queden menos de 5".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** el número no requiere código; la condición, 1 h.

### 8.2 Refresco de la lista

- **Pregunta:** ¿la lista se arma todos los días o una vez por semana?
- **Hoy:** diario. La opción "weekly" aparece pero el motor no la usa.
- **Ejemplos de respuesta:** "diario"; "semanal".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** semanal, 4 a 6 h; quitar la opción, menos de 1 h.

## 9. Propagación a la propiedad (confirmación)

### 9.1 Un "no" para toda la propiedad

- **Pregunta:** si alguien de la propiedad dice "no me interesa", ¿dejamos de llamar a todos sus contactos? ¿Y si dice "no me llamen más": también a sus otras propiedades?
- **Hoy:** sí en los dos casos. "No me interesa" solo afecta a esa propiedad.
- **Ejemplos de respuesta:** "sí, así"; "el 'no' de un familiar no cuenta para el dueño".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** se cambia en el catálogo; si el criterio depende del rol del contacto, 2 h.

### 9.2 "Colgó"

- **Pregunta:** ¿"colgó" debe contar como un "no" para la propiedad?
- **Hoy:** no; está marcado como "propuesto".
- **Ejemplos de respuesta:** "no"; "a la segunda vez que cuelga, sí".
- **Acordado:** ☐ ______________________
- **Impacto si cambia:** en el catálogo, ninguno; "a la segunda vez", 2 h.
