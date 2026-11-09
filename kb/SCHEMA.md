# Base de conocimiento del editor («el entrenador»)

Datos fijos que el editor consulta para explicar errores y responder dudas. **No hay IA en el editor**: todo es una tabla que se consulta con reglas y un buscador de palabras. La base se «entrena» afuera (con ChatGPT, con Claude y con los casos reales que los alumnos mandan), se **valida contra gcc 13 y contra el editor** y se guarda como archivos.

## Archivos
```
kb/chatgpt/      entrega cruda de ChatGPT (parcial: 50 errores, 153 ayudas, 35 lecciones). Solo lectura.
kb/errores/      un archivo por categoría: SIN.json, DEC.json, TIP.json, OPE.json, PRF.json, SCN.json, CTL.json,
                 FUN.json, ARR.json, PRE.json, EJE.json, LOG.json, POR.json, NOS.json  (arreglos JSON)
kb/ayuda.json    ayuda contextual: una entrada por elemento de C
kb/lecciones.json  mini-lecciones de conceptos
```
Cada archivo es **un único arreglo JSON** (UTF-8, sin comentarios, sin comas finales).

## Prefijos de categoría y de id
SIN sintaxis y escritura · DEC declaraciones y variables · TIP tipos y conversiones · OPE operadores y expresiones · PRF printf · SCN scanf · CTL estructuras de control · FUN funciones · ARR arreglos y textos · PRE preprocesador y bibliotecas · EJE errores de ejecución · LOG lógica del algoritmo (estructuras de la materia) · POR portabilidad y entorno · NOS lo que el editor todavía no soporta.
El **id** de un error es `PREFIJO-NNN` (tres dígitos, desde 001 en cada categoría), por ejemplo `SCN-004`. Los 50 de ChatGPT pasan a `SIN-001`…`SIN-050` (mismo orden que su `n`).

## Un error (`kb/errores/*.json`)
```json
{
 "id": "SCN-004",
 "categoria": "scanf",
 "nombre_corto": "scanf sin &",
 "frecuencia": "muy alta | alta | media | baja",
 "codigo_mal": "programa C mínimo y completo (máximo 12 líneas) que provoca el error",
 "codigo_bien": "el mismo programa corregido",
 "entrada": "texto para stdin si el programa lee datos, o \"\"",
 "que_dice_gcc": "primer diagnóstico REAL de gcc 13 -std=gnu99 -Wall -Wextra (una línea, sin ruta de archivo), o \"nada\"",
 "mensaje_editor": "lo que el editor debería decir: español rioplatense, máximo 2 oraciones, con 'Línea N' cuando haya línea",
 "explicacion": "2 a 4 oraciones con el CONCEPTO de C detrás del error, sin jerga",
 "como_arreglarlo": "pasos concretos, sin escribir la solución completa de un ejercicio de la materia",
 "pistas": ["pista leve (no dice dónde está el error)", "pista media (dice la zona o el concepto)", "casi la solución"],
 "relacion_con_la_materia": "SS | BC | BC anidada | LR | LC | tipos | scanf | prototipos | arreglos…",
 "deteccion": "estatica | ejecucion | heuristica | no_detectable",
 "como_detectarlo": "regla concreta en una o dos líneas",
 "riesgo_falso_positivo": "cuándo avisaría sin razón (con un programa correcto de ejemplo) o 'ninguno'",
 "nivel": "error | aviso | informacion",
 "verificado_gcc13": true,
 "detectado_editor": true,
 "mensaje_editor_actual": "mensaje EXACTO que el editor de hoy da para codigo_mal, o null si no lo detecta",
 "codigo_editor_actual": "el campo code del diagnóstico de hoy (por ejemplo E-scanf-sin-amp) o null",
 "verificado_editor_corrige": true,
 "notas": "opcional"
}
```
- `verificado_gcc13`: **true solo si de verdad se compiló con gcc 13** y salió lo que dice `que_dice_gcc` (o «nada»). Si no se pudo, `false`. Nunca inventar la salida de gcc.
- `detectado_editor` / `mensaje_editor_actual` / `codigo_editor_actual`: se obtienen **ejecutando el editor de verdad** (`node -e` con `require('./src/compiler.js').compile(...)`, o `node test/run1.js archivo.c --warn`). Para errores de ejecución, el mensaje es el `RUNTIME ERR`.
- `verificado_editor_corrige`: el `codigo_bien` compila en el editor sin errores ni avisos y da la misma salida que gcc.
- `solucion_ejercicio` (opcional, true): el `codigo_bien` es la solución de un ejercicio de la materia; el build NO lo manda al navegador.
- Un `aviso` es una sospecha: nunca impide ejecutar. Solo es `error` lo que gcc también rechaza o lo que el editor no puede ejecutar.

## Una ayuda (`kb/ayuda.json`)
```json
{ "elemento": "%d", "tipo": "palabra clave | operador | formato | escape | funcion | directiva | tipo | concepto",
  "que_es": "1 oración", "como_se_usa": "ejemplo de 1 a 3 líneas",
  "error_tipico": "el error más común y cómo se ve", "en_la_materia": "tema del apunte o null",
  "errores_ids": ["PRF-001"], "buscar": ["sinónimos y palabras con que un alumno lo buscaría"] }
```

## Una lección (`kb/lecciones.json`)
```json
{ "id": "L-001", "titulo": "Por qué 7/2 da 3", "explicacion": "5 a 8 líneas", "ejemplo": "programa completo que compila",
  "entrada": "", "resultado": "salida EXACTA que da gcc 13 al ejecutarlo",
  "errores_ids": ["TIP-001"], "buscar": ["division entera", "decimales"] }
```
`resultado` se obtiene **ejecutando** `ejemplo` (con gcc 13 y con el editor); deben coincidir.

## Reglas de contenido
- Español rioplatense (vos, usá, fijate), tono de compañero mayor, sin retar, sin humor forzado.
- Solo el C del nivel de la materia (ver `docs/COMPATIBILIDAD.md` y el apunte en `Diego-20000/brizuela`). Variables de los ejemplos en MAYÚSCULAS, como en la materia; `scanf`/`printf` con `%d %f %c`.
- Las pistas son progresivas y **no dan la solución completa de un ejercicio**: la idea es que el alumno piense y tipee.
- Todo corre sin conexión: ninguna regla puede depender de un servidor.
- Sin registros repetidos ni casi repetidos.
