# Editor C

Editor de C **sin anuncios** que corre en tu navegador. Escribís, ejecutás y probás tus programas al instante, sin instalar nada ni registrarte.

**Usarlo:** https://diego-20000.github.io/editor-c/ (o abrí `index.html` con doble clic: funciona sin internet). Para pasarlo por pendrive o WhatsApp hay una versión de **un solo archivo**: `dist/editor-c.html`.

## Qué tiene

- Editor con colores, números de línea, sangría automática y cierre automático de `()`, `[]`, `{}` y comillas.
- Consola donde escribís los datos como en una terminal (`scanf`, `getchar`), código de salida y botón **Detener** para cortar bucles infinitos.
- **Problemas**: errores y avisos con número de línea; clic para saltar a esa línea, que queda subrayada y marcada en el margen.
- **Datos de entrada** opcionales para precargar lo que lee `scanf` y repetir pruebas sin volver a tipear.
- **Captura**: descarga una imagen PNG con la cabecera (tus datos), el código, la entrada y la salida, lista para entregar.
- **Programas**: guarda varios en tu dispositivo (con recuperación automática si cerrás sin querer), renombrar, borrar con deshacer, abrir y guardar `.c`.
- Cabecera editable (`// Apellido, Nombre`, curso, materia, ciclo) que se recuerda para los programas nuevos.
- Buscar y reemplazar, ejemplos por tema, tema claro/oscuro (sigue al dispositivo), tamaño de letra.
- Atajos: `Ctrl+Enter` o `F5` ejecuta, `Ctrl+S` guarda, `Ctrl+/` comenta, `Tab`/`Shift+Tab` sangra, `Ctrl+F`/`Ctrl+H` busca/reemplaza.
- Avisos útiles: `%d` con una variable `float`, `scanf` sin `&`, variable usada sin valor inicial, `=` dentro de un `if`, `;` sobrante después de un `while`.
- Acepta `main()` sin tipo, `int main()` y `void main()`.
- Todo local: tu código no sale de tu navegador, no hay analítica ni pedidos de red.

## Qué soporta

Tipos `int`, `float`, `double`, `char`, `long`, `unsigned`; `if`/`else`, `switch`, `while`, `do-while`, `for`; funciones con recursión; arreglos de 1 y 2 dimensiones; `printf`/`scanf` con sus formatos; `math.h`, `rand` y `ctype.h` básicos; `#define` de constantes.

**Todavía no:** punteros, textos (`char[]` con `%s`), `struct` y archivos.

## Importante

No es gcc. Es un intérprete del subconjunto de C que se usa al empezar a programar. La salida de `printf` (incluido el redondeo) se comparó contra gcc con los casos de `test/cases` y con programas generados al azar. Quedan diferencias solo en comportamientos que C no define (por ejemplo conversiones de decimal a entero fuera de rango o desbordes de `long` mayores a 2^63). Si algo se comporta distinto que en gcc, abrí un issue.

## Desarrollo

```
node build.js            # genera el sitio a partir de src/ (sin dependencias)
node tools/ui-smoke.js   # prueba de la interfaz con Chromium headless (necesita playwright)
```

`build.js` produce, y se suben al repositorio:

- `index.html` + `assets/` (`styles.css`, `compiler.js`, `runtime.js`, `examples.js`, `app.js`): scripts clásicos, sin módulos ni bundlers. Funciona con doble clic (`file://`) y en GitHub Pages desde la raíz.
- `dist/editor-c.html`: lo mismo en un solo archivo, para compartir sin internet.

Fuentes en `src/`:

- `compiler.js`: traduce el C a JavaScript.
- `runtime.js`: `printf`/`scanf` y utilidades (el build agrega `RT_SRC`, su texto, para crear el Worker sin `fetch`).
- `app.js`, `app.css`, `template.html`, `examples.js`: interfaz.
- `test/`: `diff.sh` compara la salida contra gcc (`./test/diff.sh test/cases/fmt.c`) y `fuzz.py` genera expresiones aleatorias.

Después de tocar algo en `src/`, corré `node build.js` y subí también los archivos generados.

## Licencia

MIT © 2026 ArtPrograms Studio
