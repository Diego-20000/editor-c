# Tarea para Fable: buscar fallas en Editor C (14/11/2026)

Leé primero `CLAUDE.md` (contexto, reglas y comandos). Esta tarea es **de auditoría**: el objetivo es encontrar y arreglar fallas reales, con pruebas que las prueben. No se agregan funciones nuevas.

## Reglas que no se rompen
- Sitio **estático**: sin servidor, sin cuentas, sin analítica, sin IA, sin pedidos de red a terceros. Todo sigue funcionando sin conexión y con doble clic (`file://`).
- Todo lo que lee el alumno va en **español neutro** (sin voseo; «tú» o impersonal). Lo vigila `node test/neutro.test.js`.
- Ejemplos de código: `int main()` sin `return 0`, sin `do-while`.
- **Diferencias a propósito con gcc** (no son fallas, no se tocan): `main` sin `int`, falta de `#include` y función sin prototipo son *error* (como Programiz); `scanf` sin `&` es error; un `;` faltante se marca en su línea; el cuadro «Entrada» agrega un salto de línea final. Están en `docs/COMPATIBILIDAD.md`.
- **No hay que afirmar que algo coincide con gcc si no se comparó** (`bash test/run_all.sh`). El comportamiento indefinido (variable sin inicializar, índice fuera de rango, desborde de entero con signo, formato que no corresponde al tipo) queda fuera de contrato: no se cuenta como falla.
- Trabajá en una rama nueva (`fable-auditoria`). **No crees PR ni publiques**: eso lo decide Diego. Hacé commit y push seguido (cada tanda), para no perder nada si se corta la sesión. Los commits terminan con las líneas de atribución que indique el sistema.
- Antes de cerrar: `bash test/todo.sh` completo en verde.

## Tarea 1: auditoría de seguridad de lo que entra desde afuera (primero, es lo más chico)
El editor recibe datos que no escribió el alumno por varios caminos, y los alumnos se mandan enlaces y archivos entre ellos.

1. Armá el inventario: el enlace `#p=…` («Pasar a otro dispositivo», `src/compartir.js` y `src/app.js` cerca de las líneas 1827 y 1848), la importación de JSON («Exportar todo» / importar, `src/app.js` cerca de 1875 y 1910), abrir un archivo `.c` (`FileReader`), los valores de `localStorage` al arrancar (`store.json`), los casos sin respuesta, y los textos de la base `kb-data.js`.
2. Revisá los **23 usos de `innerHTML` en `src/app.js`**: para cada uno, ¿entra algún texto que venga de afuera o del código del alumno (nombres de programas, nombres de pruebas, identificadores del código en los mensajes de error, nombres de archivo, texto de un enlace)? ¿Está escapado con `esc()` o se usa `textContent`?
3. Intentá romperlo de verdad con cargas del tipo `"><img src=x onerror=...>` en cada campo: nombre de programa, nombre de una prueba, nombre dentro de un JSON importado, contenido de un enlace `#p=`, valores guardados en `localStorage`, identificadores raros en el código C que terminan en mensajes. Escribí `tools/ui-seguridad.js` (Playwright, como `tools/ui-reparos.js`) que pruebe cada camino y falle si algún script se ejecuta o si la página se rompe.
4. Revisá el service worker (`src/sw.js`) y el armado de enlaces: ¿se puede envenenar la caché, abrir una redirección o hacer que un enlace consuma memoria sin límite (enlaces gigantes, JSON de cientos de MB)? Poné topes razonables donde falten.
5. Evaluá agregar una política `Content-Security-Policy` por `<meta>` (GitHub Pages no deja poner cabeceras). Solo se implementa si **no rompe** el funcionamiento sin conexión, `file://`, el Web Worker armado desde un `Blob` ni `dist/editor-c.html` (un solo archivo con scripts en línea). Si no se puede sin debilitarla, dejá escrito por qué.
6. Arreglá lo que encuentres. Cada arreglo lleva su prueba.

**Entrega:** un listado corto de hallazgos (gravedad, cómo se reproduce, cómo se arregló, prueba) y los riesgos que quedan.

## Tarea 2: campaña de ejercicios contra gcc (la pesada)
Hoy el motor está comparado con 361 programas (`test/cases`) y un generador aleatorio de **expresiones** (`test/fuzz.py`). Falta probar **programas completos con instrucciones**, al estilo de los TP de la materia. Objetivo: encontrar diferencias entre el editor y gcc 13.

1. Escribí un generador de programas con estructura (`test/fuzz2.py`, determinista por semilla) que combine: `if`/`else if`/`else`, `for` y `while` anidados con `break`/`continue`, `switch` con y sin `break`, funciones con prototipo (parámetros por valor, retorno de `int`/`float`/`double`/`char`, recursión), arreglos 1D y 2D (también como parámetro), `char[]` y funciones de `string.h`, `#define` con y sin parámetros, `math.h`, `printf` con anchos, precisiones y banderas, y lectura con `scanf` (`%d %f %lf %c %s`, varios valores por línea, entradas con espacios y saltos). Tiene que generar **solo programas sin comportamiento indefinido** (inicializar todo, índices dentro de rango, sin desborde de entero con signo, formatos que coincidan con el tipo, lazos que terminan).
2. Además, escribí **a mano al menos 150 programas** con casos que suelen romper compiladores caseros, por categoría: lectura con `scanf` y entradas raras, formatos de `printf`, conversiones y promociones de tipos, división y resto con negativos, `unsigned`/`char`/`short` con vuelta, `float` frente a `double`, prioridad y orden de evaluación definido, cortocircuito, ámbito de variables (bloques, globales, `static`), recursión profunda, matrices, textos, `switch` con *fall-through*, macros con efectos.
3. Cada programa: compilar con `gcc -std=gnu99 -Wall -Wextra`, ejecutar con su entrada, correr el mismo programa en el editor (`node test/run1.js archivo.c < entrada`) y comparar salida **y código de salida** (`bash test/diff.sh`). Mirá también los **avisos y errores** que el editor da: un programa que gcc compila sin errores no debería dar error en el editor (salvo las diferencias a propósito de arriba), y no debería avisar de cosas inexistentes (falsos positivos).
4. Cada diferencia se clasifica: (a) falla del editor → se arregla, y el programa pasa a `test/cases/` (`.c` y, si lee, `.in`) con el nombre `fable_NNN_tema.c`; (b) comportamiento indefinido → se descarta; (c) diferencia a propósito → se anota; (d) no se puede corregir → se documenta en `docs/COMPATIBILIDAD.md`.
5. Medí también: tiempos (¿algún programa razonable tarda demasiado?), memoria (arreglos grandes, recursión profunda) y que el mensaje de error del editor sea coherente con el problema real.

**Entrega:** tabla con la cantidad de programas por categoría, cuántas diferencias aparecieron, cuántas eran fallas reales (con su arreglo) y cuáles quedaron sin resolver. Si después de una campaña grande no aparece nada, también es un resultado: decilo y mostrá la cobertura.

## Orden y presupuesto
El tiempo de uso de Fable termina el 16/11 y tiene un tope del plan: hacé primero la Tarea 1 y después la 2, y escribí el informe de a poco (`docs/AUDITORIA_2026-11.md`) para que, si se corta, quede lo hecho. Ejecutá `bash test/todo.sh --rapido` seguido y el completo (con interfaz, unos 10 minutos) al final.
