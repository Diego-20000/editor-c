# Auditoría de Editor C (noviembre de 2026)

Rama `fable-auditoria`. Tarea pedida en `docs/TAREA_FABLE.md`. Este informe se escribe de a poco: lo que figura acá está hecho y probado.

## Estado
- **Tarea 1 (seguridad de lo que entra desde afuera): hecha.** Pruebas: `node test/seguridad.test.js` (15 pruebas, motor y datos) y `node tools/ui-seguridad.js` (199 comprobaciones con Chromium). Las dos están sumadas a `bash test/todo.sh`.
- **Tarea 2 (campaña contra gcc): sin empezar.** Solo se sumaron 4 casos (`test/cases/fable_001` a `fable_004`), iguales a gcc.
- `bash test/todo.sh` completo (15/11/2026): 14 de 15 pasos en verde en la corrida entera; el paso que falló («Interfaz (completa)», porque la prueba lee la imagen de la captura con `fetch` y la política lo bloqueaba) se arregló permitiendo `connect-src blob:` y se repitió aparte: 1215 ok, 0 fallas. Motor contra gcc: 365/365. No se volvió a correr la batería entera después de ese último cambio.

## Tarea 1: resultado
**No se encontró ninguna forma de ejecutar un script** (XSS) por ningún camino: nombre de programa, nombre de prueba, JSON importado, enlace `#p=`, valores de `localStorage`, nombre de archivo ni identificadores del código. Las 23 líneas con `innerHTML` de `src/app.js` son vaciados (`''`) o texto pasado por `esc()` como contenido de un elemento (resaltado, guías, coincidencias, subrayados) o números de línea; el resto de la interfaz usa `textContent`. El código que genera el compilador pasa los textos por `JSON.stringify` y los nombres con prefijo (`v_`, `f_`): 15 textos hostiles y 54 nombres de JavaScript probados, sin escape.

Sí aparecieron fallas de robustez, algunas con pérdida de datos:

| # | Gravedad | Falla | Cómo se reproduce | Arreglo | Prueba |
|---|---|---|---|---|---|
| 1 | Alta | Importar más de lo que entra en el navegador decía «Se importaron 12 programas», no guardaba nada y **desde ahí tampoco se guardaba lo que el alumno escribía** (un solo aviso, que quedaba tapado) | Importar un JSON de 12 programas de 900 KB | Si no entra, se vuelve atrás y se avisa; el aviso de «no se pudo guardar» se repite cada minuto mientras siga fallando | ui-seguridad 3 |
| 2 | Media | Bomba de descompresión por enlace: un `#p=z.` de 300 KB hacía usar **342 MB** (el tope de 512 KB cortaba tarde) | Enlace con 300 MB de ceros comprimidos | El comprimido entra de a 1 KB y bajo pedido; tope de 100.000 caracteres para el enlace. Ahora 17 MB | ui-seguridad 2 |
| 3 | Media | Datos guardados con otro tipo rompían la página: no abrían Programas, Casos ni Captura y el editor no ejecutaba | `editorc.progs` con `name` u otros campos que no son texto | Todo lo guardado se revisa al arrancar (`progLimpio`, `pruLimpiar`, usuario, casos) | ui-seguridad 1 |
| 4 | Media | Abrir un archivo de 40 MB congelaba la página 24 s y cargaba 42 MB en el editor | «Abrir archivo .c» con un archivo grande | Tope de 1 MB con aviso | ui-seguridad 4 |
| 5 | Media | Con el editor instalado, el service worker devolvía la página principal para cualquier dirección que no estuviera en la caché: `dist/editor-c.html` se veía roto y un 404 parecía el editor | Abrir `dist/editor-c.html` después de la primera visita | Primero la red; la página principal solo sin conexión | ui-seguridad 7 |
| 6 | Baja | «Avisar a Diego» dejaba de abrir (para siempre, hasta borrar los datos) si el programa tenía medio carácter suelto, cosa que puede venir en un enlace o un JSON | Código con `\ud800` y «Avisar a Diego» | Los textos se dejan bien formados antes de armar el enlace | seguridad.test 4, ui-seguridad 6 |
| 7 | Baja | Las pruebas guardadas se perdían al importar (se exportaban, pero no se leían) | Exportar un programa con pruebas e importarlo | `parseImport` conserva `tests` | ui-seguridad 3 |
| 8 | Baja | Nombres recibidos con caracteres de control o marcas de dirección (las que hacen leer «exe.jpg» al revés), y nombre de archivo sin tope (341 caracteres) | Enlace, JSON o archivo con ese nombre | `nombreLimpio` en los tres caminos (60 caracteres) | ui-seguridad 2, 3, 4 |
| 9 | Baja | Una variable llamada `toString`, `constructor`, etc.: «¿Qué es esto?» devolvía una función interna de JavaScript y «Más ayuda» rompía el diálogo; `#include <constructor>` daba un error interno del compilador | Tocar esa variable con «¿Qué es esto?» | Índices sin prototipo en `kb.js` y `nombres.js`; `own()` en el compilador | seguridad.test 2 y 3, ui-seguridad 5 |
| 10 | Baja | Al armar un enlace, la entrada no tenía tope (3 MB de entrada = enlace de 3 MB) | Entrada enorme y «Pasar a otro dispositivo» | Mismo tope que al recibir (2000) | ui-seguridad 2 |

### Refuerzos (no eran fallas)
- **Política CSP por `<meta>`: implementada**, en `index.html` y en `dist/editor-c.html` (scripts y estilo en línea permitidos por su hash, sin `'unsafe-inline'`). Probada con Chromium por http, sin conexión, con `file://` y en el archivo único: el Worker armado desde un Blob funciona y el uso normal no produce ningún bloqueo; marcado y scripts inyectados a propósito no se ejecutan y la página no puede mandar datos a otro sitio. Lleva `'unsafe-eval'` porque el programa en C se ejecuta con `new Function`; no debilita la protección contra marcado inyectado. Para que entrara hubo que quitar un `onclick` en línea de la plantilla y el `style` del sprite de íconos (`build.js` falla si vuelven a aparecer).
- El Worker donde corre el programa queda sin red ni almacenamiento (`fetch`, `caches`, `indexedDB`, `importScripts`…).
- `esc()` también escapa comillas; `build.js` escapa `<!--` en los scripts en línea.

### Riesgos que quedan
1. **La política CSP solo se pudo probar con Chromium** (acá no hay Firefox ni Safari). Si un navegador bloqueara el Worker, el editor cae a ejecutar en la página, que la política permite. Conviene abrir el sitio en un iPhone y en Firefox y ejecutar un programa antes de publicar.
2. **Origen compartido**: todo lo publicado en `diego-20000.github.io` comparte `localStorage` y caché con el editor. Un script de terceros en otra página de ese mismo sitio podría leer los datos de los alumnos. Se resuelve con un dominio propio para el editor.
3. `frame-ancestors` no se puede poner por `<meta>`: otro sitio puede mostrar el editor dentro de un marco.
4. Si el navegador no deja usar Workers, el programa corre en la página (sin el recorte de red del punto anterior).
5. Las marcas de dirección dentro del **código** recibido no se filtran (solo en los nombres): la vista previa del enlace muestra el texto tal como lo dibuja el navegador.
6. Memoria y tiempo de un programa hostil (arreglos enormes, recursión): queda para la Tarea 2.

## Tarea 2: campaña contra gcc (en curso)
### Programas aleatorios completos (`test/fuzz2.py`, hecho)
Generador determinista por semilla: `if`/`else if`/`else`, `for` y `while` anidados con `break`/`continue`, `switch` con y sin `break`, bloques con variables que tapan a otras, funciones con prototipo (también con arreglo 1D y matriz como parámetro, `static`, recursión), arreglos 1D y 2D con inicialización parcial, `char[]` con `strlen`/`strcpy`/`strcat`/`strcmp`, `#define` con y sin parámetros, `math.h`, `printf` con anchos, precisiones y banderas, y `scanf` de `%d %f %lf %c %s`. Sin comportamiento indefinido. Se corre con `bash test/fuzz2_run.sh CANTIDAD [PRIMERA_SEMILLA]` y quedó en `test/todo.sh` (60 programas por corrida).

| Tanda | Programas | Diferencias | Fallas reales |
|---|---|---|---|
| Semillas 1 a 3000 | 3000 | 1 | 1 |
| Semillas 3001 a 6000 | 3000 | 0 | 0 |

- **Falla real (arreglada):** `0.0 - ENTERO` con el entero en 0. gcc 13 lo reduce a «menos el entero pasado a decimal» y da `-0.0` (se ve como `-0.0000` en `printf`); el editor daba `0.0000`. Con un decimal a la derecha (`0.0 - X`) gcc da `0.0` y el editor ya coincidía. Casos: `test/cases/fable_005_cero_menos_entero.c` y `fable_006_cero_menos_decimal.c`.
- **Descartada (no es falla):** una primera versión del generador ponía dos llamadas con efecto en una misma asignación (`M[f()] = f()`); ese orden no está definido en C. Se corrigió el generador.

### Programas a mano por categoría
Sin empezar (faltan los 150 programas, las mediciones de tiempo y memoria y la tabla final).
