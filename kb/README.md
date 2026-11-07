Ver [SCHEMA.md](SCHEMA.md). `chatgpt/` es la entrega cruda de ChatGPT (solo lectura); `errores/`, `ayuda.json` y `lecciones.json` son la base validada.

## Cómo lo usa el editor (API)
`node build.js` lee `kb/errores/*.json` (menos `NUEVOS.json`), `kb/ayuda.json` y `kb/lecciones.json` (si falta alguno, sigue sin romper), saca los campos que solo sirven para validar (`que_dice_gcc`, `codigo_mal`, `riesgo_falso_positivo`, `deteccion`, `verificado_*`…) y genera `assets/kb-data.js` (`window.KB_DATA = {errores, ayuda, lecciones}`). `KB_DIR=otra/carpeta node build.js` arma el sitio con otra base (las pruebas usan `test/fixtures/kb/`). Se cargan con `<script defer>` después de los scripts de siempre, en este orden: `kb-data.js`, `config.js`, `kb.js`, `compartir.js`. Como son `defer`, `window.KB` existe recién cuando termina de armarse la página (antes de `DOMContentLoaded`), no mientras corre `app.js` al final del `<body>`.

### `src/kb.js` → `window.KB` (en node: `require`)
- `KB.cargar({errores, ayuda, lecciones})` → `{errores, ayuda, lecciones}` (cantidades). En el navegador carga solo `window.KB_DATA`.
- `KB.explicar(diag, nivel?)` → `{entrada, via: 'kb'|'plantilla'|'codigo', nivel}` o `null`. `diag = {line, msg, code, kb?}`. Orden: campo `kb` (id del caso) → plantilla del mensaje (`mensaje_editor_actual` normalizado) → `codigo_editor_actual` si lo usa una sola entrada → `null`. `nivel` (0, 1 o 2) por defecto es `KB.ayudaPorDefecto()` (1). `KB.entradaPara(diag)` hace lo mismo y devuelve `{entrada, via}`.
- `KB.ayudaNivel(entrada, nivel, diag?)` → `{nivel, mensaje, explicacion, pistas, hayMasPistas, totalPistas}`. Nivel 0: solo el mensaje original (`diag.msg`); 1: `mensaje_editor` + pista 1; 2: mensaje + explicación + pistas 1 y 2. La pista 3 no sale nunca de acá.
- `KB.pista(entrada, n, {vistas, confirmar})` → `{n, texto, bloqueada, esSolucion, hayMas}` o `null`. Se piden de a una (`n` ≤ `vistas + 1`); la 3 exige `vistas >= 2` y `confirmar: true`.
- `KB.buscar(texto, {max = 8, tipos})` → `[{tipo: 'error'|'ayuda'|'leccion', id, titulo, resumen, puntaje, entrada}]` ordenado por puntaje. Sin tildes ni mayúsculas, sin palabras vacías, raíz simple (plurales, -ar/-er/-ir), prefijos, sinónimos (tabla fija en el módulo), pesos por campo (`nombre_corto`/`elemento`/`titulo`/`buscar` pesan más que `explicacion`), palabras raras pesan más y bonus por frase completa. Los símbolos de C (`&&`, `%d`, `++`, `7/2`) también cuentan. Opcional `buscar: [...]` en cualquier entrada para agregar formas de preguntar.
- `KB.elementoEnPosicion(codigo, offset)` → clave de ayuda (`'printf'`, `'%5.2f'`, `'&&'`, `'#include'`, `'\\n'`, `'else if'`, `'()'`…) o `null` (comentarios, texto común de un string, números, variables del alumno). `KB.ayudaDe(clave)` → entrada de ayuda o `null`; un formato con ancho o flags cae al más general que exista (`%7.3f` → `%f`).
- Otros: `KB.normalizarMensaje(msg)`, `KB.normalizarNivel(n)`, `KB.ayudaPorDefecto(n?)`, `KB.entrada(id)`, `KB.tamano()`.

### `src/config.js` → `window.CONFIG`
`{WHATSAPP_NUMERO: '', VERSION}`. El número va con código de país y sin `+` (`'5491112345678'`); vacío = WhatsApp sin destinatario. `VERSION` la completa `build.js` (es la misma que la caché del service worker).

### `src/compartir.js` → `window.Compartir`
Todo es por decisión del alumno; el módulo solo arma textos y enlaces.
- `nuevoCaso({codigo, entrada, diag, nivelAyuda, version})` → `{v:1, fecha, version, nivel_ayuda, diag:{nivel, code, msg, line}, codigo, entrada}`. Quita la cabecera de comentarios del principio (nombre, curso…), correos, enlaces y teléfonos, y corrige `diag.line`. Código máximo 4000 caracteres: si se recorta agrega `recortado` (largo original) y `aviso`.
- `guardar(caso, almacen)` → `{ok, duplicado, total}`; `listar(almacen)`; `borrar(posicion|clave, almacen)`; `clave(caso)`. El almacén es cualquier objeto con `getItem`/`setItem` (localStorage). Tope de 50 (se van los más viejos), sin repetir código + mensaje, tolera almacenes rotos.
- `mensajeWhatsApp(casos)` → texto para pegar (título, versión, diagnóstico, código en bloque ```` ```c ````) y al final una línea `#DATOS {json compacto}`.
- `urlWhatsApp(texto, numero)` → `https://wa.me/<numero>?text=…`. Si el texto codificado pasa de 1800 caracteres quita la línea `#DATOS`, acorta los bloques de código y agrega «(recortado: copiá el resto con Copiar)». `Compartir.textoCompleto` guarda el texto entero y `Compartir.recortado` dice si hubo recorte.
- `exportarJSON(casos, {compacto})` → `{formato: 'casos-sin-respuesta-v1', casos}`; `importarJSON(texto)` → `{casos, descartados: [{indice, motivo}]}` (acepta también el mensaje de WhatsApp). Validación estricta: campos desconocidos grandes, tamaños y tipos.

### Herramienta para sumar casos: `tools/kb-agregar-caso.js`
`node tools/kb-agregar-caso.js ARCHIVO [--salida kb/errores/NUEVOS.json]`. `ARCHIVO` es el `.json` exportado o el mensaje de WhatsApp pegado en un `.txt`. Por cada caso arma un borrador con el esquema de arriba (`codigo_mal` = el código del alumno, `que_dice_gcc` y lo del editor corriendo gcc y el editor de verdad), id `NUE-nnn`, `notas: "pendiente de revisión"`; agrega al final de `NUEVOS.json` sin pisar nada ni repetir un código. Después se completan `codigo_bien`, explicación y pistas, y se corre `tools/kb-validar.js`. `NUEVOS.json` y los `NUE-*` no entran al sitio.

### Pruebas
`node test/kb.test.js` (datos de ejemplo en `test/fixtures/kb/`, con el mismo diseño de carpetas que `kb/`).
