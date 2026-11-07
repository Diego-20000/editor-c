# Pedido para ChatGPT

Copiá el texto de abajo de la línea tal cual.

---

Actuá como especialista en didáctica de la programación y en diseño de mensajes de error (pensá en cómo explican los errores Elm y Rust, pero para alumnos de 16-17 años de una escuela técnica argentina que ven C por primera vez). Tenés acceso a GitHub. Leé antes de responder:

1. Repositorio `Diego-20000/editor-c`, rama **`analisis-errores`**. Empezá por `docs/errores/LEEME.md`; después `docs/errores/CATALOGO.md` y `catalogo.json` (los 200 mensajes que el editor muestra hoy, con un programa mínimo para cada uno y lo que dice gcc), `docs/errores/ejemplos/`, `docs/errores/evidencia/` (tres informes de pruebas con cientos de errores de alumnos simulados), `docs/COMPATIBILIDAD.md` y, en `src/compiler.js`, los métodos `err`, `warn`, `suggest`, `checkLoop`, `alwaysReturns`, la tabla `CODIGOS` y `conCodigo`; en `src/runtime.js`, `CRuntimeError`.
2. Repositorio `Diego-20000/brizuela` (la materia): `CLAUDE.md`, `REFERENCIA_CLAUDE_BRIZUELA.md`, `claude-brizuela/` y el PDF `3.1_…Lenguaje_C_2020.pdf`. Usá el vocabulario y la notación del profesor: variables en MAYÚSCULAS, estructuras SS / BC / BC anidada / LR / LC, `leer` y `mostrar` en el algoritmo, diagrama Nassi-Shneiderman y la regla «algoritmo = diagrama = verificación = C».

No modifiques ni subas nada. Quiero análisis y propuestas, no código.

## Qué necesito

### A. Taxonomía de errores
Agrupá los mensajes del catálogo por **causa en la cabeza del alumno**, no por cómo lo detecta el compilador (por ejemplo: «escribió algo que no es C», «confundió la asignación con la comparación», «el algoritmo de papel no llegó al código», «el dato que entra no es el que espera el programa», «pidió algo que el editor no soporta»). Para cada grupo: definición en una línea, qué ids del catálogo incluye, gravedad (bloquea / avisa / informa), frecuencia esperada en un curso de 30 alumnos. Si la taxonomía actual de códigos (`E-sintaxis`, `E-funcion`, `W-sin-inicializar`…) no sirve, proponé una mejor con códigos estables y nombres cortos. Señalá los mensajes que hoy caen en `E-otro` / `W-otro`.

### B. Reescritura de cada mensaje
Para cada id del catálogo, devolvé un registro con estos campos (en español rioplatense, tono de un compañero mayor, sin jerga, sin sermonear, sin humor forzado):
- `id`, `codigo` (propuesto)
- `titulo`: hasta 6 palabras
- `que_paso`: 1 oración, lo que el programa hizo o no pudo hacer
- `por_que`: 1 oración, la causa más probable
- `como_arreglarlo`: 1 a 2 oraciones y un ejemplo corto antes/después (máximo 3 líneas de C)
- `en_la_materia`: a qué estructura o concepto del apunte se relaciona (BC, LR, LC, variable, tipo, `scanf`, prototipo…), o `null`
- `certeza`: `seguro` (es un error real) o `sospecha` (puede ser intencional) y cuándo no avisar
- `pista_1`, `pista_2`, `pista_3`: tres niveles de ayuda, de la menos a la más reveladora, para que el alumno pueda resolver sin que el editor le dé la solución completa de un ejercicio
Agrupá la salida en bloques JSON de 20 registros para que se pueda pegar.

### C. Lo que falta detectar
Con la evidencia de `docs/errores/evidencia/` y tu conocimiento de los errores típicos de principiantes en C, listá los errores que el editor **todavía no detecta** o detecta mal. Para cada uno: ejemplo mínimo, regla de detección (estática o en ejecución), riesgo de falso positivo con un ejemplo de programa correcto que la dispararía, y prioridad (alta / media / baja) según frecuencia × daño. Prestá atención especial a los errores de **lógica de las estructuras de la materia**: LC con centinela mal leído, contador o acumulador sin inicializar, `PROM = A / N` con `N` entero o cero, mínimo inicializado en 0, `if` con `;`, lazo que no avanza, `scanf` con formato equivocado, orden de lectura distinto del algoritmo.

### D. Falsos positivos y falsos negativos
Revisá cada aviso del catálogo (nivel «aviso») y decidí: ¿se mantiene, se hace más estricto, se vuelve opcional o se elimina? Un aviso que molesta a alumnos que tienen razón es peor que uno que falta. Proponé una regla para decidir qué avisos se muestran por defecto y cuáles se activan en un «modo estricto».

### E. Cómo se presenta
Proponé el diseño de la respuesta al error, sin pensar en colores sino en contenido y orden: qué se ve primero, cuántos mensajes se muestran a la vez (hoy un error puede arrastrar varios en cascada), cómo se agrupan los repetidos, qué va en el margen junto a la línea y qué en el panel, cuándo se muestra el valor de las variables en un error de ejecución (por ejemplo «`I` valía 5 y el arreglo tiene 5 posiciones»), cómo se pide ayuda («otra pista»), y qué pasa cuando el alumno corrige y el error desaparece. Pensalo para pantalla de celular.

### F. Errores de ejecución
Los 8 mensajes de nivel «ejecución» (división por cero, índice fuera del arreglo, recursión sin fin, arreglo gigante…) necesitan una explicación que ayude a **encontrar la línea del algoritmo** que falló. Proponé el texto y qué datos del momento conviene mostrar.

### G. Cómo comprobar que los mensajes sirven
Sin grabar a los alumnos ni guardar datos personales, proponé una forma de probar los mensajes con un curso real: preguntas a hacer, qué contar (por ejemplo cuántos alumnos corrigen el error sin pedir ayuda y en cuánto tiempo) y cómo decidir si un mensaje se reescribe.

## Cómo quiero la respuesta
- Primero un resumen de 10 líneas con lo más importante; después las secciones A a G en ese orden.
- Marcá siempre qué afirmación sale de lo que leíste en los repositorios (citá archivo e id) y cuál es suposición tuya.
- Si dos opciones son válidas, mostrá las dos con pros y contras y recomendá una.
- Al final, una lista de cambios ordenada por impacto/esfuerzo, con estimación en horas de trabajo de una sola persona, separando: (1) solo textos, (2) cambios en `src/compiler.js` o `src/runtime.js`, (3) cambios de interfaz.
- Restricciones que no se negocian: todo corre en el navegador sin enviar el código a ningún servidor; los mensajes son en español; un aviso nunca impide ejecutar; no se agregan al lenguaje cosas que el profesor no enseña.
