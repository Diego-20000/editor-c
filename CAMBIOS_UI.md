# Cambios de interfaz

Rama: `ui-pendientes` (primera tanda: `worktree-agent-aebad1991ae07a35f`). No se tocó `src/compiler.js`, `src/runtime.js` ni `test/`; el motor se usa solo por `CCompiler.compile(src, opts)` y `CRT.runProgram`.

## 1. Estructura

- `node build.js` (solo node) genera `index.html` + `assets/{styles.css,compiler.js,runtime.js,examples.js,app.js}` (scripts clásicos) y `dist/editor-c.html` (un solo archivo).
- `assets/runtime.js` agrega al final `var RT_SRC = "<texto del runtime>"`: el Worker se crea desde un Blob y con `file://` no se puede `fetch`ear el archivo.
- Verificado con Chromium headless desde `file://`: ambas versiones cargan, crean el Worker, ejecutan `scanf`, sin errores de consola y sin pedidos de red.

## 2. Auditoría (lo que faltaba frente a Programiz/OnlineGDB)

Sin navegación de errores (solo lista), sin subrayado en la línea, mensajes sin contexto de código, un único programa guardado, sin buscar/reemplazar, sin cierre automático de paréntesis/comillas, sin Ctrl+/, sin F5, sin entrada precargable (había que retipear cada prueba), sin copiar salida, sin captura para entregar, ejemplos en lista plana que pisaban el programa actual, sin cabecera de identificación, acento verde del tema claro con contraste insuficiente (3.5:1), tema que no seguía al sistema después de la primera visita, objetivos táctiles chicos en celular, sin posición del cursor.

## 3. Implementado

- Panel **Problemas** (cantidad de errores/avisos, línea de código citada, clic salta a la línea), subrayado ondulado + fondo en la línea y marca en el margen; se conserva mientras se edita sin cambiar el número de líneas.
- Atajos: Ctrl/Cmd+Enter y F5 ejecutar, Ctrl+S guardar `.c`, Ctrl+/ comentar, Tab/Shift+Tab, Ctrl+F / Ctrl+H, Esc cierra la búsqueda. Lista en "Ayuda y atajos".
- Cierre automático de `() [] {} "" ''` (con sobrescritura, borrado de a pares, envolver selección, sin autocierre en comentarios ni dentro de palabras); funciona con `beforeinput`, también en teclados de celular.
- Buscar y reemplazar con resaltado de todas las coincidencias, contador, mayúsculas, reemplazar uno/todos (con deshacer).
- Datos de entrada precargados: se consumen solos y se muestran como si se hubieran tipeado; al agotarse el programa pregunta normalmente.
- Consola: limpiar, copiar salida, "Programa terminado · código de salida N", "Detenido por el usuario".
- **Captura PNG** (cabecera con datos del alumno, código coloreado con números de línea, entrada y salida; siempre fondo claro). En celulares usa "compartir" si el navegador lo permite.
- **Programas** guardados en el dispositivo (lista, renombrar, borrar con deshacer, nuevo, abrir `.c`), autoguardado a los 350 ms y al ocultar/cerrar la pestaña; migra el programa de la versión anterior.
- Cabecera editable (Ajustes > Mis datos) que se recuerda; se aplica a programas nuevos y actualiza la cabecera del programa abierto si no se la modificó a mano.
- Ejemplos por tema (16 + 2 para practicar errores y avisos), todos verificados con el compilador; si el programa actual tiene trabajo propio se abren como programa nuevo.
- Tema Automático/Claro/Oscuro (CSS puro con `prefers-color-scheme`, sin parpadeo), tamaño de letra, objetivos táctiles de 44 px en pantallas táctiles, contraste AA en tema claro, roles/etiquetas aria, foco visible, `role="status"`/`log`, diálogos con `aria-labelledby`, favicon embebido (sin pedido extra).
- `tools/ui-smoke.js`: ver sección 6. Capturas en `docs/capturas/`.

## 4. Segunda tanda (ui-pendientes)

**Robustez**
- La compilación pasó al Worker. `build.js` agrega `CC_SRC` (texto del compilador) a `assets/compiler.js` y `RT_SRC` a `assets/runtime.js`; la página arma un Blob con ambos y un arranque (`BOOT`) que recibe el fuente, compila, avisa los diagnósticos (`compiled`) y ejecuta. La página ya no llama a `CCompiler.compile` salvo en el respaldo (sin Worker).
- Detener termina el Worker, así que funciona también mientras compila ("Compilación detenida por el usuario").
- Aviso no bloqueante (banda sobre los problemas, con su propio botón Detener) si lleva más de 5 s ejecutando o compilando sin pedir datos ni escribir; se oculta con cualquier salida, entrada o al terminar. Umbral configurable para pruebas: `__editorc.cfg.slowMs`.
- Tope de salida de 400 000 caracteres, ahora aplicado también dentro del Worker (corta el programa en el origen) además de la página.
- La salida se vuelca al DOM en lotes cada ~40 ms. Antes, un bucle con `printf` dejaba la página bloqueada ~18 s después del tope (relayout cuadrático de 400 KB de texto en cada mensaje); ahora corta en ~0,4 s.

**Celular**
- `visualViewport` fija el alto de la app (`--app-h`, `--app-top`, clase `kb` cuando faltan más de 120 px); la línea de entrada se desplaza a la vista en cada cambio. Con teclado abierto se ocultan Problemas y Entrada para dejar lugar.
- Menos de 700 px de ancho (o menos de 480 de alto): pestañas Editor / Consola. Ambos paneles siguen en el layout (solo `visibility`), por eso conservan scroll, selección y foco. Ejecutar pasa a la consola; tocar un problema vuelve al editor.
- Objetivos táctiles de 44 px en todo (botones, pestañas, diálogos, entrada de la consola, "Silenciar", casillas).

**PWA / sin conexión**
- `manifest.webmanifest` (colores de los tokens: `#0e1116` fondo, `#141922` tema), íconos PNG generados por el build (192, 512, maskable 512, apple-touch 180), `sw.js` con caché `editor-c-<hash del contenido>`.
- Se registra solo en http(s) y solo si la página trae el `<link rel="manifest">` (el archivo único no lo trae). Versión nueva: queda en espera y la página muestra "Hay una versión nueva del editor" con **Recargar**; al aceptar se guarda el trabajo, se activa y recarga. Se revisa al volver a la pestaña y cada hora.

**Editor**
- Divisor entre editor y consola: arrastrable (mouse/táctil), teclado (flechas ±2, Shift ±10, Inicio/Fin, Enter restablece), `role="separator"` con `aria-valuenow`; vertical desde 900 px, horizontal entre 700 y 899 px; la posición se guarda por orientación.
- Vista previa de la captura (diálogo) con casilla para incluir u omitir la entrada.
- Exportar/importar todos los programas (`editor-c-programas-AAAAMMDD.json`, `{app, version:1, programs:[{name, code, input, t}]}`). Se valida (JSON, `app`, `version`, tamaños, tipos) y antes de importar un diálogo informa nuevos / repetidos (se omiten) / mismo nombre con otro contenido (se agregan como "… (importado)") / inválidos. Nunca borra ni pisa.
- Códigos de diagnóstico: si cada error/aviso trae `code` se muestra en el panel y los avisos se pueden silenciar por código (guardado en `localStorage`, restaurable). Sin `code` no cambia nada.

## 5. Pendiente / ideas

- Con el respaldo sin Worker la compilación sigue bloqueando la página (no hay forma de cortarla); solo ocurre si el navegador no permite Workers.
- No se pudo probar un teclado virtual real (el emulador de Chromium no lo abre): se simula achicando el viewport visible. Falta probar en iOS Safari / Android Chrome reales (sobre todo el `scrollIntoView` y el comportamiento de `interactive-widget`).
- Autocompletado y sugerencias de `#include`, deshacer propio para "reemplazar todos" en navegadores sin `execCommand`.
- Edición avanzada (varios cursores, plegado) y opción de tema oscuro en el PNG.
- Un aviso "instalar la app" propio (hoy se usa el del navegador).

## Qué necesito del motor

- **Columnas** (inicio y fin) en `errors`/`warnings`: hoy se subraya la línea entera; con columna se podría subrayar el token.
- Campo `code` estable en cada mensaje: **ya está usado** si existe (mostrar y silenciar); `severity` sigue sin hacer falta.
- Número de línea del error en tiempo de ejecución también para divisiones por cero y accesos fuera de rango, si no lo traen ya.
- Líneas de fin (`endLine`) para bloques sin cerrar ("falta cerrar la llave abierta en la línea N").
- Para el cierre de programa: confirmar que `runProgram` devuelve siempre `code` (se muestra 0 si falta).

## 6. Pruebas (`tools/ui-smoke.js`)

`node tools/ui-smoke.js` termina con código distinto de cero si algo falla. Recorre `index.html` (file://), `index.html` por http (servidor estático de node) y `dist/editor-c.html` (file:// y http), en escritorio (1280x800) y celular (390x844, `isMobile`, `hasTouch`): compilación en el Worker (se comprueba que `CCompiler.compile` no se llama en la página), errores y avisos, Detener en ejecución y en compilación, aviso de 5 s (umbral real una vez, reducido en el resto), bucle con y sin salida, tope de salida, arreglo gigante, fuente de 50 000 líneas, respaldo sin Worker, pestañas con scroll/foco, teclado virtual simulado, objetivos de 44 px (varias vistas y diálogos), divisor (mouse, teclado, orientación, persistencia), vista previa, exportar/importar (válidos, repetidos, renombrados e inválidos), códigos y silenciar, service worker solo en http, segunda carga con el servidor apagado, actualización con "versión nueva", consola limpia y cero pedidos de red externos. Con `SHOTS_FINAL=1` regenera `docs/capturas/`.
