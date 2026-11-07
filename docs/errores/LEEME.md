# Análisis de errores del Editor C

Esta carpeta existe para analizar y mejorar **cómo el editor le habla al alumno cuando algo sale mal**: qué tipos de error hay, qué dice hoy el editor, qué falta detectar y cómo conviene explicarlo.

## Quién usa el editor
Alumnos de 5.º año de la E.E.S.T. N.º 8 de Morón (16-17 años), en la materia Lenguajes Electrónicos V. Es su primer contacto con C. Llegan desde un método propio del profesor: resuelven en papel con **diagramas Nassi-Shneiderman** (estructuras SS, BC, LR, LC), con variables en MAYÚSCULAS, y recién después pasan el programa a C y lo prueban. Lo que escriben y lo que ven en pantalla tienen que coincidir con lo que hicieron en papel.
El material de la materia está en el repositorio `Diego-20000/brizuela` (`CLAUDE.md`, `REFERENCIA_CLAUDE_BRIZUELA.md`, `claude-brizuela/`, el apunte `3.1_Introduccio_n_a_la_Programacio_n_Estructurada_en_Lenguaje_C_2020.pdf`).

## Qué hay en esta carpeta
| Archivo | Qué es |
|---|---|
| `CATALOGO.md` | Todos los mensajes distintos que el editor mostró en más de 800 programas (errores de compilación, avisos y errores de ejecución), cada uno con un programa mínimo que lo provoca y lo que dice gcc sobre ese mismo programa. |
| `catalogo.json` | Lo mismo, para procesarlo: `id`, `nivel`, `code`, `plantilla`, `cuenta`, `ejemplo`, `linea`, `gcc`. |
| `ejemplos/` | Un programa por mensaje (`M001.c`, `M002.c`, …). |
| `evidencia/` | Informes de las pruebas hechas al editor: `auditoria-diagnosticos.md` (300 programas con error y 116 válidos contra gcc), `errores-y-robustez.md` (215 errores de alumno, 100 válidos y análisis de flujo), `revision-codigo-motor.md`. |
| `PROMPT_CHATGPT.md` | El pedido para el análisis. |

## Cómo funciona hoy
- `src/compiler.js`: el compilador dice `this.err(msg, línea)` y `this.warn(msg, línea)`. El **código** de cada mensaje (`E-…`, `W-…`) se deduce con expresiones regulares sobre el texto (`CODIGOS` y `conCodigo`, cerca del final del archivo). Es frágil; la idea es pasar el código explícito en cada llamada.
- `src/runtime.js`: los errores de ejecución son `CRuntimeError` (índice fuera del arreglo, división por cero, arreglo demasiado grande…).
- Los avisos nunca impiden ejecutar; los errores sí.
- La interfaz (`src/app.js`) muestra los problemas en un panel con la línea, permite saltar a ella y silenciar un aviso por código.
- Un solo error puede generar varios mensajes encadenados; ya se filtran los avisos que caen en una línea con error.

## Cómo regenerar el catálogo
```
node tools/catalogo-errores.js docs/errores CARPETA_CON_PROGRAMAS_C [OTRA ...]
```
Necesita `node` y `gcc`. Cada carpeta contiene archivos `.c` y, si hace falta, un `.in` con la entrada.

## Reglas del editor que no se discuten
- Todo corre en el navegador del alumno; ningún programa sale del dispositivo. Un análisis que requiera enviar código a un servidor queda fuera.
- El mensaje es en español rioplatense, corto y con la línea.
- Un aviso es una sospecha; solo es error lo que gcc también rechaza o lo que el editor no puede ejecutar.
- No se agregan al lenguaje construcciones que el profesor no enseña (ver `docs/COMPATIBILIDAD.md`).
