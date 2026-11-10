# Editor C

Editor de C **sin anuncios** que corre en tu navegador. Escribís, ejecutás y probás tus programas al instante, sin instalar nada ni registrarte.

**Usarlo:** https://diego-20000.github.io/editor-c/ (o abrí `index.html` con doble clic: funciona sin internet; desde la web, tras la primera visita, también funciona sin conexión). Para pasarlo por pendrive o WhatsApp hay una versión de **un solo archivo**: `dist/editor-c.html`.

## Qué tiene

- Editor con colores, números de línea y sangría automática. El cierre automático de `()`, `[]`, `{}` y comillas viene **apagado** (que el alumno tipee todo) y se enciende en Ajustes. No hay autocompletado ni sugerencias de nombres.
- Consola donde escribís los datos como en una terminal (`scanf`, `getchar`), código de salida y botón **Detener** para cortar bucles infinitos (también durante la compilación). Si el programa lleva más de ~5 s sin pedir datos ni escribir, aparece un aviso ("puede haber un bucle infinito") que no bloquea nada.
- La compilación y la ejecución corren en un Worker: un código patológico (bucle infinito, fuente enorme, arreglo gigante) no congela la página. La salida tiene un tope (~400 000 caracteres).
- **Problemas**: errores y avisos con número de línea; clic para saltar a esa línea, que queda subrayada y marcada en el margen. Si el motor informa un código estable por aviso (`scanf-sin-amp`, …) se muestra discretamente y ese tipo de aviso se puede **silenciar** (se guarda en el dispositivo; se restaura desde el mismo panel o desde Ajustes).
- **Ayuda en dos niveles** (Ajustes o `?ayuda=1|2` en el enlace; se recuerda en el dispositivo). **Nivel 1 (por defecto): apagada.** Al ejecutar solo se dice que el programa no compiló o falló y de qué tipo general, sin línea ni mensaje: el alumno tiene que encontrar el error mirando el código, como con el profe. **Nivel 2: indica la línea y nada más** (sin sugerencias ni explicaciones). Todo sin IA y sin servidor. La base de conocimiento (`kb/`, escrita a mano y validada contra gcc 13) alimenta el buscador interno, el «¿qué es esto?» sobre cualquier palabra de C y el botón «Avisar a Diego»; las explicaciones y pistas por error están en la base pero la interfaz no las muestra por decisión pedagógica.
- **Panel «Ayuda»** (botón en la barra): buscador interno (sin modelo ni red) que mezcla errores, ayuda de cada elemento de C y lecciones; detalle con pistas por demanda, ejemplo en un programa nuevo («Abrir en el editor», «Probar») y navegación entre temas relacionados. Teclado: foco en la búsqueda al abrir, flechas para los resultados, `Esc` cierra.
- **«¿Qué es esto?»**: botón `?` del editor (o `Alt`+clic, o `F1` sobre lo que está bajo el cursor): tocar una palabra, un operador o un `%d` abre una burbuja con su explicación, sin mover el cursor ni modificar el código.
- **Casos para enviar** (Ajustes): los casos sin explicación quedan solo en el dispositivo; el alumno ve la vista previa exacta y **elige** mandarlos por WhatsApp (`src/config.js`, `WHATSAPP_NUMERO`), copiarlos o descargarlos como `.json`. Sin nombre ni datos personales y nunca de forma automática.
- **Cómo se escribió el programa**: el editor mide, solo en el dispositivo, cuánto se tipeó y cuánto se pegó o abrió desde un archivo, el tiempo y las ejecuciones; aparece como una línea opcional al pie de la captura. **Modo práctica**: con `?practica=1` en el enlace no se puede pegar ni soltar texto en el editor (cartel fijo visible).
- **Datos de entrada** opcionales para precargar lo que lee `scanf` y repetir pruebas sin volver a tipear.
- **Captura**: vista previa antes de descargar (con la opción de incluir u omitir los datos de entrada) y descarga de una imagen PNG con la cabecera (tus datos), el código y la salida, lista para entregar.
- **Programas**: guarda varios en tu dispositivo (con recuperación automática si cerrás sin querer), renombrar, borrar con deshacer, abrir y guardar `.c`. **Exportar todo** / **Importar** en un único `.json` (copia de seguridad): el archivo se valida y nunca pisa lo que ya tenés; antes de importar muestra qué se agrega, qué se omite y qué se renombra.
- **Divisor** arrastrable (o con teclado: flechas, `Shift`+flechas, Inicio/Fin, Enter para restablecer) entre el editor y la consola; recuerda su posición.
- **Celular**: pestañas Editor / Consola que conservan el scroll y el foco, objetivos táctiles de 44 px y el diseño sigue al teclado virtual (`visualViewport`) para que la línea de entrada quede siempre a la vista.
- **Instalable y sin conexión** (PWA): por `http(s)` (por ejemplo GitHub Pages) se puede instalar como app y, después de la primera visita, funciona sin internet. Cuando hay una versión nueva avisa y recarga al aceptar. Con `file://` y en el archivo único no se registra nada.
- Cabecera editable (`// Apellido, Nombre`, curso, materia, ciclo) que se recuerda para los programas nuevos.
- Buscar y reemplazar, ejemplos por tema, tema claro/oscuro (sigue al dispositivo), tamaño de letra.
- Atajos: `F1` o `Alt`+clic «¿Qué es esto?», `Ctrl+Enter` o `F5` ejecuta, `Ctrl+S` guarda, `Ctrl+/` comenta, `Tab`/`Shift+Tab` sangra, `Ctrl+F`/`Ctrl+H` busca/reemplaza.
- Avisos útiles: `%d` con una variable `float`, `scanf` sin `&`, variable usada sin valor inicial, `=` dentro de un `if`, `;` sobrante después de un `while`.
- Acepta `main()` sin tipo, `int main()` y `void main()`.
- Todo local: tu código se procesa en tu navegador y no se envía a ningún servidor; no hay analítica ni servicios de terceros. La web solo descarga los archivos del propio sitio (y consulta si hay una versión nueva); compartir un caso con Diego es siempre una acción voluntaria tuya.

## Qué soporta

Tipos `int`, `float`, `double`, `char`, `short`, `long` y `long long` (64 bits exactos), `unsigned` en todos, `bool`, `const`, `static`; `if`/`else`, `switch`, `while`, `do-while`, `for`; funciones con prototipos y recursión; arreglos de 1 y 2 dimensiones (también como parámetro); `printf`/`scanf` con todos sus formatos; `math.h`, `ctype.h`, `rand` (misma secuencia que gcc en Linux), `time`; `#define` (con y sin parámetros), `#if`/`#ifdef`/`#else`/`#endif`.

Avisos y errores en español con el número de línea, entre ellos: variable sin valor, `=` dentro de un `if`, `scanf` sin `&` o con menos variables, división entera guardada en `float`, `#include` faltante, función sin `return`, `switch` sin `break`, bucles que no terminan, `const` modificado y nombres mal escritos (con sugerencia).

**Textos:** `char[]`, `%s`, `fgets`, `sprintf` y las funciones básicas de `string.h`.

**Todavía no:** punteros en general, `struct` y archivos.

## Importante

Qué se promete y qué no: ver [docs/COMPATIBILIDAD.md](docs/COMPATIBILIDAD.md).

Para docentes (cómo usarlo en clase, la ayuda por enlace y qué mide la línea de proceso): [docs/PARA_DOCENTES.md](docs/PARA_DOCENTES.md).

Contexto y reglas del proyecto (sitio estático en GitHub Pages, sin servidor, sin IA, sin conexión): ver [CLAUDE.md](CLAUDE.md).

No es gcc. Es un intérprete del subconjunto de C que se usa al empezar a programar. La salida de `printf` (incluido el redondeo) se comparó contra gcc con los casos de `test/cases` y con programas generados al azar. Quedan diferencias solo en comportamientos que C no define (por ejemplo conversiones de decimal a entero fuera de rango o desbordes de `long` mayores a 2^63). Si algo se comporta distinto que en gcc, abrí un issue.

## Desarrollo

```
node build.js            # genera el sitio a partir de src/ (sin dependencias)
node tools/ui-smoke.js   # prueba de la interfaz con Chromium headless (necesita playwright); sale con código != 0 si algo falla
SHOTS_FINAL=1 node tools/ui-smoke.js docs/capturas   # además regenera las capturas de docs/capturas/
bash test/run_all.sh     # compara la salida de test/cases contra gcc (necesita gcc)
bash test/fuzz_run.sh    # programas aleatorios contra gcc
```

`build.js` produce, y se suben al repositorio:

- `index.html` + `assets/` (`styles.css`, `compiler.js`, `runtime.js`, `examples.js`, `proceso.js`, `app.js`, `kb-data.js`, `config.js`, `kb.js`, `compartir.js`, íconos): scripts clásicos, sin módulos ni bundlers. Funciona con doble clic (`file://`) y en GitHub Pages desde la raíz.
- `manifest.webmanifest` y `sw.js`: app instalable y uso sin conexión. La versión de la caché (`editor-c-<hash>`) es el hash del contenido de todo lo que se precachea, calculado en cada build; si no cambia nada, no hay "versión nueva". Los íconos PNG los genera el propio build (sin dependencias).
- `dist/editor-c.html`: lo mismo en un solo archivo, para compartir sin internet (sin manifest ni service worker).

Fuentes en `src/`:

- `compiler.js`: traduce el C a JavaScript.
- `runtime.js`: `printf`/`scanf` y utilidades.
- El build agrega al final de `assets/compiler.js` y `assets/runtime.js` sus propios textos (`CC_SRC`, `RT_SRC`): con ellos la página arma el Worker desde un Blob (con `file://` no hay `fetch`). El Worker recibe el código fuente, compila y ejecuta; la página solo recibe diagnósticos y salida. Si el navegador no deja crear el Worker, se compila y ejecuta en la página (los lazos ceden el control, pero la compilación sí bloquea).
- `sw.js`: plantilla del service worker (el build completa versión y lista de archivos).
- `app.js`, `app.css`, `template.html`, `examples.js`: interfaz (también `tools/ui-smoke.js` y `tools/ui-reparos.js`). `kb.js`, `compartir.js`, `proceso.js`, `config.js` y `kb/`: el entrenador, los casos sin respuesta y la evidencia de proceso (ver `kb/README.md` y `docs/PROCESO.md`).
- `test/`: `diff.sh` compara la salida contra gcc (`./test/diff.sh test/cases/fmt.c`) y `fuzz.py` genera expresiones aleatorias.

Después de tocar algo en `src/`, corré `node build.js` y subí también los archivos generados.

## Licencia
Editor C es de Diego Segurotti (ArtPrograms Studio). Uso libre y gratuito **dentro de este sitio**, para estudiar y con fines no comerciales. No se puede copiar, modificar, redistribuir ni vender sin permiso. Texto completo: [PolyForm Strict License 1.0.0](LICENSE).
