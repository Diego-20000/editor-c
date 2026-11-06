# Cambios de interfaz

Rama: `worktree-agent-aebad1991ae07a35f`. No se tocó `src/compiler.js`, `src/runtime.js` ni `test/`; el motor se usa solo por `CCompiler.compile(src, opts)` y `CRT.runProgram`.

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
- `tools/ui-smoke.js`: 72 comprobaciones (escritorio file://, un-archivo, celular) -> todas ok. Capturas en `docs/capturas/`.

## 4. Pendiente / ideas

- Divisor arrastrable entre editor y consola; en celular el teclado virtual tapa la consola mientras se escribe en `scanf` (se podría fijar la consola abajo con `visualViewport`).
- Service worker / manifest para instalar como app y uso offline en el celular (hoy offline = archivo único).
- Autocompletado y sugerencias de `#include`, deshacer propio para "reemplazar todos" en navegadores sin `execCommand`.
- Edición avanzada (varios cursores, plegado) y exportar/importar todos los programas en un `.json`.
- Vista previa de la captura antes de descargar y opción de tema oscuro en el PNG.

## Qué necesito del motor

- **Columnas** (inicio y fin) en `errors`/`warnings`: hoy se subraya la línea entera; con columna se podría subrayar el token.
- Campo `severity`/`code` estable para cada mensaje (permitiría agrupar y silenciar avisos).
- Número de línea del error en tiempo de ejecución también para divisiones por cero y accesos fuera de rango, si no lo traen ya.
- Líneas de fin (`endLine`) para bloques sin cerrar ("falta cerrar la llave abierta en la línea N").
- Para el cierre de programa: confirmar que `runProgram` devuelve siempre `code` (se muestra 0 si falta).
