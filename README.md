# Editor C

Editor de C **sin anuncios** que corre en tu navegador. Escribís, ejecutás y probás tus programas al instante, sin instalar nada ni registrarte.

**Usarlo:** https://diego-20000.github.io/editor-c/ (o descargá `index.html` y abrilo con doble clic: funciona sin internet).

## Qué tiene

- Editor con colores, números de línea y sangría automática.
- Consola donde escribís los datos como en una terminal (`scanf`, `getchar`).
- Botón **Detener** para cortar bucles infinitos.
- Avisos útiles con el número de línea: `%d` con una variable `float`, `scanf` sin `&`, variable usada sin valor inicial, `=` dentro de un `if`, `;` sobrante después de un `while`.
- Acepta `main()` sin tipo, `int main()` y `void main()`.
- Tema claro/oscuro, tamaño de letra, abrir y guardar `.c`, y ejemplos.
- Tu código no sale de tu navegador; se guarda solo en tu dispositivo.

## Qué soporta

Tipos `int`, `float`, `double`, `char`, `long`, `unsigned`; `if`/`else`, `switch`, `while`, `do-while`, `for`; funciones con recursión; arreglos de 1 y 2 dimensiones; `printf`/`scanf` con sus formatos; `math.h`, `rand` y `ctype.h` básicos; `#define` de constantes.

**Todavía no:** punteros, textos (`char[]` con `%s`), `struct` y archivos.

## Importante

No es gcc. Es un intérprete del subconjunto de C que se usa al empezar a programar. La salida de `printf` (incluido el redondeo) se comparó contra gcc con los casos de `test/cases` y con programas generados al azar. Quedan diferencias solo en comportamientos que C no define (por ejemplo conversiones de decimal a entero fuera de rango o desbordes de `long` mayores a 2^63). Si algo se comporta distinto que en gcc, abrí un issue.

## Desarrollo

```
node build.js            # genera index.html a partir de src/
```

- `src/compiler.js`: traduce el C a JavaScript.
- `src/runtime.js`: `printf`/`scanf` y utilidades.
- `src/app.js`, `src/app.css`, `src/template.html`: interfaz.
- `test/`: `diff.sh` compara la salida contra gcc (`./test/diff.sh test/cases/fmt.c`) y `fuzz.py` genera expresiones aleatorias.

## Licencia

MIT © 2026 ArtPrograms Studio
