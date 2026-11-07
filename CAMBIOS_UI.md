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

## 6. Entrenador (rama ent-u1)

Se integran en la interfaz los módulos ya hechos (`src/kb.js`, `src/compartir.js`, `src/proceso.js`, `src/config.js` y `kb/`); no se tocó el motor ni esos módulos. Todo es estático: sin red, sin IA, sin servidor.

**Ayuda por niveles en Problemas.** Cada diagnóstico se explica con `KB.explicar` (por el campo `kb` si el motor lo trae, si no por plantilla del mensaje). Nivel 0: mensaje del compilador con la línea. Nivel 1 (por defecto): mensaje corto de la base (con la línea y los nombres de variable del alumno en lugar de los del ejemplo de la base) y botón «Pista» que revela de a una con `KB.pista`; la tercera es «Mostrar la solución» y pide confirmación en el lugar (sin `confirm()` del navegador). Nivel 2: además la explicación del concepto. El mensaje original del compilador queda siempre en chico («Compilador: …»). «¿Qué es esto?» abre la lección o ayuda relacionada. Al editar la línea marcada, la ayuda de ese problema se esconde (clase `stale`) hasta la próxima ejecución. Nivel: Ajustes o `?ayuda=0|1|2` (se recuerda en `editorc.ayuda`).

**Mensajes ambiguos.** Si varias entradas de la base comparten el mismo mensaje del editor y el diagnóstico no trae `kb`, no se elige una al azar: se muestra el mensaje original y «Buscar en la ayuda». Ver pedido 1.

**Panel «Ayuda»** (`#dAyuda`, botón en la barra): `KB.buscar`, resultados con su tipo, detalle de error/ayuda/lección, pistas por demanda, «Abrir en el editor» y «Probar» (programa nuevo, nunca pisa el actual), relacionados por `errores_ids`, volver. Teclado: foco en la búsqueda, flechas, Inicio/Fin, Esc.

**«¿Qué es esto?»**: botón `?` en la cabecera del editor (`#whatBtn`), Alt+clic (escritorio) y F1 (en el cursor). Una capa transparente (`#whatLay`) recibe el toque, así que el cursor y el texto no se mueven; la posición se calcula con las métricas de la fuente monoespaciada. En celular el modo se apaga al cerrar la burbuja.

**Casos sin respuesta.** Al mostrar un diagnóstico sin explicación se llama a `Compartir.nuevoCaso` + `guardar` (localStorage, tope y duplicados del módulo). Ajustes → «Casos para enviar» (`#dCasos`): lista con casillas, vista previa exacta, aviso de privacidad, «Enviar por WhatsApp» (un `<a target=_blank rel="noopener noreferrer">` con `Compartir.urlWhatsApp`; sin número en `CONFIG.WHATSAPP_NUMERO` abre WhatsApp sin destinatario y lo dice), «Copiar» (con estado claro si el navegador bloquea el portapapeles) y «Descargar archivo .json». Borrar uno (con Deshacer) o todos. Nunca se envía nada solo.

**Evidencia de proceso** (`docs/PROCESO.md`): adaptador conectado al textarea antes de los demás listeners; `marcarAuto` en cada inserción del propio editor (sangría, Tab, comentar, cierre, reemplazar, cabecera); `marcarCargado` al abrir archivo, ejemplo, importar o plantilla; el estado va dentro de cada programa (`proc`) y se restaura con él; `proc.ejecutar()` en cada ejecución; línea al pie de la captura (se parte en renglones si no entra) con casilla para incluirla u omitirla (por defecto incluida; Ajustes la recuerda). Los programas de versiones anteriores, sin datos de proceso, arrancan como «origen no determinado». `?practica=1`: `Proceso.politicaDesdeEnlace` cancela pegar y soltar, con cartel fijo `#practica`. El texto de Ajustes explica qué se mide y que queda en el dispositivo; la palabra «IA» no aparece.

**Cierre automático** apagado por defecto (`editorc.autocierre`), interruptor en Ajustes; la sangría automática no cambia. `pisarLlave` también queda apagado cuando el cierre está apagado (si no, tragaría una llave tipeada). Sin autocompletado ni sugerencias.

**Pruebas.** `tools/ui-smoke.js` suma `entrenadorSuite` (escritorio y celular emulado 390x844, en `file://`, http y `dist/`) y `procesoSuite` (teclado y portapapeles reales). `tools/ui-reparos.js` prueba tipear con el cierre automático apagado y encendido. Ambos salen con código distinto de cero si algo falla. Hooks nuevos en `window.__editorc`: `proceso()`, `procLinea()`, `nivelAyuda()`.

**Las ~14 fallas viejas de `ui-smoke`.** En este entorno la prueba de antes de los cambios dio 554 ok y una sola falla, y esa era de tiempo («50 000 líneas: la página responde durante la compilación», 1056 ms contra un tope de 1000 ms, con la máquina cargada). Los errores del tipo «browser has been closed» no son de la aplicación: ocurren cuando dos corridas de Playwright pelean por la máquina, o cuando algo reconstruye `assets/` mientras corre la prueba.

### Pedidos a otros agentes

1. **Motor (`src/compiler.js`)**: poner el campo `kb` (id de la base) en cada diagnóstico. Hoy, por plantilla del mensaje, «falta un ';' al final de esta línea (antes de 'A')» coincide con 5 entradas distintas (`SIN-001`, `PRF-022`, `SIN-032`, `SIN-057`, `SIN-058`) y `KB.explicar` devuelve la última, que es de otro tema («while con mayúscula»); la interfaz lo detecta y no lo muestra, pero con `kb` se explicaría bien. Lo mismo pasa con 19 entradas de `E-falta-punto-coma`.
2. **Base (`kb/`)**: `build.js` no copia `codigo_mal` al sitio (`CAMPOS_ERROR`), así que el detalle de un error muestra solo «Así queda bien». La interfaz ya muestra «Así falla» con «Abrir en el editor» si el campo llega. Pedido: incluir `codigo_mal` (y `entrada`) en `assets/kb-data.js`.
3. **Base**: los mensajes de `mensaje_editor` traen «Línea N:» y nombres de variable de un programa de ejemplo. La interfaz los reemplaza por la línea y los nombres del alumno cuando el mensaje del editor trae las mismas comillas simples; sería más seguro que la base use marcadores (`{LINEA}`, `{VAR}`).
4. **`KB.explicar`**: devolver `null` (o una marca de ambigüedad) cuando varias entradas comparten plantilla, en lugar de elegir la última.
5. **`src/config.js`**: falta el número real de `WHATSAPP_NUMERO` (pregunta abierta 1 del CLAUDE.md).
