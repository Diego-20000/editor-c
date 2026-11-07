# Evidencia de proceso (`src/proceso.js`)

Mide **cómo se escribió** el código dentro del editor y lo muestra como evidencia en la captura de entrega. No detecta nada: no existe una marca confiable para eso. Solo cuenta de dónde vino cada carácter. Todo ocurre en el dispositivo, sin red.

## Qué guarda y qué no (privacidad)

- Por cada carácter del texto guarda su **procedencia**, en tramos: `t` tipeado, `p` pegado, `a` automático (lo puso el editor: sangría, cierre de llaves, comentar, Tab), `c` cargado (archivo, ejemplo, programa guardado), `u` desconocido (deshacer/rehacer, autocorrector).
- Contadores: teclas, borrados, correcciones (borrar justo después de tipear), ejecuciones, pegados bloqueados, tiempo activo, momento de inicio, y la lista de pegados como `{lineas, caracteres, momento}` (máx. 100).
- **Nunca guarda el contenido** de lo tipeado ni de lo pegado. Del portapapeles solo mide largo y líneas. En localStorage va únicamente: los tramos (`"t120p30a4"`), contadores, y por cada línea del programa su largo y una huella de 32 bits (sirve para reconciliar si el texto cambió afuera; no permite recuperar la línea).
- El módulo conserva en memoria una copia del último texto (como el propio textarea) para calcular diferencias; no se serializa.
- No sale nada del dispositivo. La única salida es la línea de texto que el alumno decide incluir en la captura.

## API (puro, sin DOM; también `module.exports` en node)

```
Proceso.nuevo(textoInicial, tipoInicial='c', {ahora})   -> p
p.insertar(pos, texto, tipo='t')   p.borrar(desde, hasta, {auto})   p.reemplazar(desde, hasta, texto, tipo)
p.reconciliar(textoNuevo, tipo='u')   p.cargar(texto, tipo='c')
p.contar() -> {total,t,p,a,c,u}      p.metricas()      p.ejecutar()      p.actividad()
p.serializar() -> objeto JSON      Proceso.restaurar(obj, textoActual) -> p
Proceso.resumen(p) -> {total, tipeado, pegado, automatico, cargado, desconocido (enteros, suman 100),
                       caracteres:{t,p,a,c,u}, minutos, segundos, ejecuciones, correcciones, pegados, pegadoMayor:{lineas,caracteres}}
Proceso.linea(resumen) -> "Escrito en el editor: 94 % tipeado · 6 % pegado · 31 min de trabajo · 12 ejecuciones"
Proceso.politicaPegado({permitir, aviso})   Proceso.politicaDesdeEnlace(location.search, aviso) -> bool
Proceso.conectar(textarea, {aviso, ahora, tipoInicial}) -> adaptador
```

Reglas: los índices son UTF-16 (como el textarea). Tiempo activo = suma de los intervalos entre eventos; un intervalo mayor a 60 s no suma. `reemplazar` con tipo `a` conserva el origen de lo que no cambió (comentar o sangrar un bloque pegado no lo vuelve "automático").

Adaptador (`conectar`): `.proceso` (el actual), `.marcarAuto(fn, {primerCaracterTipeado})`, `.marcarCargado(texto, tipo='c')`, `.restaurar(obj, texto)`, `.serializar()`, `.contar()`, `.resumen()`, `.linea()`, `.ejecutar()`, `.desconectar()`.

## Integración en `src/app.js`

Orden de scripts: cargar `proceso.js` antes de `app.js` (agregarlo en `build.js`, `template.html`, `PRECACHE` y el bundle de `dist/`). No hace falta en el Worker.

1. **Crear el adaptador** una vez, después de definir `ta` (cerca de la línea 147, antes de los listeners de `beforeinput`/`input`): `const proc = Proceso.conectar(ta);`. Así su `beforeinput` corre antes que el de app.js y ve el estado original. Los listeners que engancha: `beforeinput`, `input`, `paste`, `drop`, `dragover`, `keydown`. El `input` de app.js (l. 148) no cambia.
2. **Envolver con `proc.marcarAuto(...)`** todo lo que app.js inserta solo (todo pasa hoy por `guard = true` ... `finally { guard = false }`; conviene envolver el cuerpo del `try`):
   - `editRange` (l. 162-171) y `insert` (l. 155) cuando lo llaman otros: envolver dentro de `editRange`.
   - `toggleComment` (l. 175-191): `guard = true; try { ... insert(text) ...}`.
   - `pisarLlave` (l. 195-206).
   - Autocierre en `beforeinput` (l. 218 envolver con selección, l. 223 par de cierre, l. 225 borrado del par).
   - Tab (l. 235-244): `insert('    ')` en l. 237 (sin guard hoy: envolver) y el bloque con indentado/desindentado en l. 242.
   - Enter (l. 245-257): usar `proc.marcarAuto(() => ..., { primerCaracterTipeado: true })` para que el `\n` cuente como tipeado y la sangría como automática.
   - `}` que quita 4 espacios (l. 260).
   - Reemplazo de cabecera en Ajustes (l. 939, `ta.value = ...`): `proc.marcarAuto(() => { ta.value = ...; })`. Sin eventos; se reconcilia como `a` al terminar.
   - Buscar y reemplazar (`replaceOne`/`replaceAll`, ~l. 340-347): si escriben `ta.value` o `setRangeText`, envolver con `marcarAuto`.
3. **`marcarCargado`** (lo cargado no lo tipeó el alumno): al final de `showProgram` (l. 79-89), después de `ta.value = p.code`. Ahí mismo decidir: si el programa tiene datos guardados, `proc.restaurar(p.proc, p.code)`; si no, `proc.marcarCargado(p.code)`. Casos que pasan por ahí: abrir `.c` (l. 728-733, vía `newProgram`), ejemplo (l. 866-872), programa guardado (l. 891), importar JSON (l. 1015-1048; guardar/leer `proc` en `planImport`/`parseImport`, si no viene queda como cargado). Para el programa nuevo con plantilla (`newProgram` sin código, l. 90-95) usar `proc.marcarCargado(p.code, 'a')` para que la plantilla no cuente como "archivo abierto". Si `newProgram` recibe código (archivo/ejemplo), tipo `c`.
4. **Guardar**: en `flushSave` (l. 69-74) agregar `cur.proc = proc.serializar();` (si el programa activo es `cur`). Va dentro del JSON de `progs` (`persist`, l. 66). Tamaño: ~2 KB por programa de 100 líneas. Incluir `proc` en la exportación JSON (l. 976) es opcional; si se incluye, el profesor ve la evidencia del archivo.
5. **Ejecuciones**: `proc.ejecutar()` al inicio de `run()` (l. 680), después de `flushSave()`.
6. **Captura PNG** (`makePng`, l. 752-826): después de `drawRows(outRows...)` (l. 821), agregar una fila al pie con `proc.linea()` en `12px UI` color `#566174`, y sumar su alto a `H` (l. 777: `+ 22`). Mantener el ancho: partir con `ctx.measureText` si no entra en `W - 2*padX`. Opción en el diálogo (`shotIn`, l. 846) para incluir/omitir la línea, por defecto incluida. Calcular la línea antes de `H`.
7. **Modo práctica sin pegar**: al arrancar, antes de `conectar`: `Proceso.politicaDesdeEnlace(location.search, (a) => toast('Modo práctica: en este enlace no se puede pegar. Escribilo vos.'))`. Parámetro del enlace: `?practica=1` (mismo estilo que `?ayuda=`). Cancela `paste` y `drop` de texto (también mover texto arrastrado dentro del editor); archivos arrastrados no se tocan. Cada intento queda en `proc.proceso.bloqueados` (no va en la línea de la captura). Mostrar un cartel fijo "Modo práctica: sin pegar" cuando esté activo.
8. **Cambio de programa**: antes de `showProgram` ya se llama `flushSave()` (l. 90, 891); eso guarda el `proc` del programa anterior. No hace falta más.

## Redacción de la línea

Hechos, sin acusar y sin la palabra "IA". Muestra tipeado siempre; pegado, cargado (`% abierto desde un archivo`) si hay; automático y desconocido solo desde 5 %. Si lo cargado es 20 % o más agrega "parte del código se abrió desde un archivo"; si es 90 % o más, "el código se abrió desde un archivo".

## Límites que hay que decir con honestidad

- Deshacer/rehacer y el autocorrector del teclado del celular no revelan origen: se marcan `u`.
- Tipear en otro editor y pegar por tramos chicos no se distingue de tipear. Es evidencia de proceso, no prueba.
- Si el navegador no manda `beforeinput` bien (algunos teclados), el módulo cae en una diferencia mínima contra el último texto: nunca se rompe la suma de tramos.

## Pruebas

`node test/proceso.test.js` (124 casos: núcleo, reconciliación, serialización, tiempo, adaptador con textarea falso, modo práctica y dos fuzz).
