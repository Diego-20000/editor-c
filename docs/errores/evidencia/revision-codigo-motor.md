# Revisión adversarial del motor (rama ccr-3dbcfd08-z20hft vs origin/main)

Método: lectura completa de `src/compiler.js` y `src/runtime.js`, más ~120 programas de prueba contra gcc 13.3 (`-std=gnu99`, `diff.sh`, y `YIELD=1` que es el modo real de la app: `yieldLoops:true`, todas las funciones `async`). Además: 2 fuzzers propios (enteros/BigInt con 16 tipos mezclados, ~370 programas x 60 sentencias; formatos de printf, 400 formatos x 6 semillas; todos los pares de tipos en args/retornos), mutación de sintaxis (120 000 mutantes de los casos), y comparación de avisos contra `gcc -Wall -Wextra -O2`.

Todos los reproductores están en `revision_motor/repro/` (`rNN_*.c`, con `.in` cuando hace falta). "ed" = editor con `YIELD=1`.
Notas: (1) los `.c` se corren con `bash test/diff.sh X.c [X.in]`; los avisos con `node test/run1.js X.c --warn`. (2) Aquí "regresión" no significa "ya andaba en main": casi todo lo de abajo ya estaba en main o es nuevo de la rama sin que main lo cubriera; lo marco cuando lo comprobé (se pudo reproducir `scanf` y `#undef` también en main).

Hallazgos ordenados por (gravedad x probabilidad de que un alumno lo encuentre).

---

## A. Avisos falsos / errores falsos sobre programas correctos (lo que más va a ver un alumno)

### A1. `while (n-- > 0)`, `while (i++ < 3)`, `while (--k > 0)`, `do {..} while (m-- > 0)` -> "es probable que nunca termine"  [ALTA probabilidad, media gravedad]
`r25_cond_incdec.c`
```c
int n = 5, s = 0, i = 0, k = 3, m = 4;
while (n-- > 0) s += n;
while (i++ < 3) s += 10;
while (--k > 0) s += 100;
do { s++; } while (m-- > 0);
```
gcc: sin avisos, imprime 245. ed: 4 avisos `W-bucle-infinito` ("ninguna variable de la condición (n) cambia dentro del bucle"). Es el idioma de cuenta regresiva; también sale con una función propia `while (e-- > 0)` (r16).
Causa: `checkLoop` (compiler.js ~801-819) arma el conjunto `mod` recorriendo solo `body` y `step`; nunca la condición `cond`, donde está el `++/--`/asignación.
Arreglo: `scan(cond)` (agregar `if (cond) scan(cond);` junto a `scan(body); if (s.step) scan(s.step);`).

### A2. `#include <stdio.h> // comentario` -> aviso falso + "falta #include <stdio.h>"  [ALTA, media]
`r01_include_comentario.c`
```c
#include <stdio.h> // entrada y salida
int main(){ printf("hola\n"); return 0; }
```
gcc: nada. ed: `l1: el #include está mal escrito...` y `l2: usás printf pero falta #include <stdio.h>`. Con `/* */` pasa igual.
Causa: en `tokenize`, `arg = m[2].trim()` incluye el comentario; la regex `^(<[^>\s]+>|"[^"]+")$` (línea ~80) falla y el include no se registra en `includes`, por lo que `needInclude` avisa de todo lo que use la biblioteca (un aviso por cada biblioteca).
Arreglo: sacar comentarios de `arg` antes de validar: `arg = m[2].replace(/\/\/.*$|\/\*[\s\S]*?\*\//g,'').trim()` (no para `define`, que ya tokeniza los comentarios).

### A3. `while (getchar() != '\n');` y `while ((c = getchar()) != '\n' && c != EOF);` -> "el while termina en ';' y su cuerpo queda vacío"  [ALTA, baja-media]
`r03_vaciar_buffer.c` (idioma de vaciar el búfer, muy usado por alumnos tras un `scanf`). gcc -Wall -Wextra: sin avisos. ed: `W-cuerpo-vacio` en l5.
Causa: `checkEmptyBody` (~840) no mira si la condición tiene efectos.
Arreglo: no avisar si `this.hasSideEffect(s.c)` (while/do) -- probado: el aviso desaparece y los de `for (i=0;i<1000;i++);` se mantienen.

### A4. Ternario como sentencia con efectos -> "esta sentencia no hace nada"  [media, baja-media]
`r04_ternario_sentencia.c`
```c
a > b ? printf("a mayor\n") : printf("b mayor\n");
```
(también `a < b ? c++ : d++;` y `x ? (c = 1) : (d = 1);`). gcc -Wall -Wextra: sin aviso. ed: `W-sin-efecto` ("no hace nada") -- falso, imprime.
Causa: `stmt` case 'expr' (~666-671) avisa por `ek === 'cond'|'bin'|...` sin mirar `hasSideEffect(s.e)`.
Arreglo: `&& !this.hasSideEffect(s.e)` (probado). Ojo: `a < b && printf("x")` sí lo avisa gcc (-Wunused-value), así que con la misma condición se pierde ese aviso; aceptable.

### A5. "la función puede terminar sin 'return'" falso con `while(1)/for(;;)` que contienen un switch o un lazo con `break`, y con `while (true)`  [media, media]
`r05_return_switch.c`
```c
int menu(int x){
  while (1) {
    switch (x) { case 1: return 10; case 2: x = 1; break; default: return 0; }
  }
}
```
gcc -Wall -Wextra -O2: sin aviso (el `break` es del switch). ed: `W-sin-return` en l6. Igual con un `for` interno con `break`, y con `while (true)` (stdbool; `r20_while_true.c`) porque `alwaysReturns` exige `st.c.k === 'num'` y `true` es un `id`.
Causa: `hasBreak` (~787) cuenta cualquier `break` del subárbol, incluso los de un `switch`/lazo anidado; `alwaysReturns` caso `while` (~779) solo reconoce literales numéricos.
Arreglo: `hasBreak` debe no descender en `switch`/`while`/`do`/`for` anidados (un break dentro de ellos no sale del lazo exterior; sí desciende en `if`/bloques); y reconocer `true` / `!0` evaluando constante con `isConstExpr`+valor.

### A6. "se usa antes de darle un valor" falso (gcc -O2 callado) con inicialización en la primera vuelta  [media, media]
`r08_primera_iteracion.c`
```c
int n, i, x, menor, primero = 1;  scanf("%d", &n);
for (i = 0; i < n; i++) { scanf("%d", &x);
  if (primero) { menor = x; primero = 0; } else if (x < menor) menor = x; }
if (!primero) printf("%d\n", menor);
```
gcc: nada. ed: `l8: 'menor' se usa antes de darle un valor`. Igual con `if (i == 0) {a=1;b=1;} else {c=a+b;...}` (Fibonacci; sin aviso de gcc). Cuando la variable se usa después del lazo gcc a veces avisa (u5), así que el aviso del editor no es absurdo, pero con una bandera el programa es correcto.
Causa: el análisis marca asignado solo si todas las ramas lo asignan (`stmt` case 'if' ~689-695) y no conoce correlaciones entre condiciones.
Arreglo (política, no bug estricto): no avisar dentro de un lazo cuando la lectura está en un `if/else` cuya otra rama (o una rama previa) asigna la variable; o bajar a aviso solo si el uso es posterior al lazo.

### A7. "se usa antes de darle un valor" falso en el paso de un `for` cuyo valor se da en el cuerpo  [baja, baja]
`r21_step_for.c`: `for (i = 0; i < 6; i += paso) { paso = 2; ... }`. gcc: nada; ed: aviso sobre `paso`.
Causa: `case 'for'` (~708-721) compila `step` antes que el cuerpo (el orden de `assignLog` queda al revés). Arreglo: generar el código del `step` después del cuerpo (guardar la cadena y concatenar) o compilar cuerpo primero.

### A8. Bibliotecas estándar "desconocidas": `<float.h>`, `<stdint.h>`, `<stddef.h>`, `<assert.h>`, `<errno.h>`  [media, baja]
`r02_float_h.c`: `#include <float.h>` + `DBL_MAX`. ed: `W-preprocesador: no se conoce la biblioteca <float.h>` (aunque el propio editor dice "falta #include <float.h>" cuando falta, `needIncludeConst`). Además el aviso sale siempre en línea 1.
Causa: lista `ok` en `checkIncludes` (~588). Arreglo: agregar `float.h` (como mínimo), `stdint.h`, `stddef.h`, `assert.h`, `errno.h` y usar la línea real de cada `#include`.

### A9. Programa válido rechazado: prototipo viejo `int suma();` + definición con parámetros  [baja, alta si ocurre]
`r17_proto_vacio.c`. gcc -std=gnu99: compila e imprime 5. ed: `E-prototipo: ... una tiene 0 parámetro(s) y la otra 2` (y la llamada `suma(2,3)` también daría error de cantidad de argumentos).
Causa: `run()` paso 1 (~605-611) trata `()` como `(void)`. Arreglo: marcar `proto` con lista vacía como "sin especificar" y no comparar ni chequear aridad.

### A10. Macros: `#undef`/redefinición y uso antes de `#undef` (programa válido -> resultado erróneo o error)  [baja-media, alta si ocurre]
`r09_undef.c`: `#define N 3 / int a[N]; / #undef N / #define N 5 / int b[N];` -> gcc `3 5`, ed `5 5`. Y `#define MAX 3 ... main usa MAX ... #undef MAX` al final del archivo -> ed: error `'MAX' no está declarada` (programa válido).
Causa: `compile()` (~1375-1376) tokeniza todo el archivo y recién después hace `expandDefines` con la tabla FINAL. (Ya era así en main.)
Arreglo: expandir en `tokenize` al llegar a un `#undef` o a un `#define` de un nombre ya definido (`out = expandDefines(out, defines)` en ese punto), así cada uso ve la definición vigente.

### A11. `#if` con aritmética real / macros anidadas  [baja, baja]
`r15_if_macro.c`: `#define Y 5 / #define X Y / #if X == 5 && 7 / 2 == 3` -> gcc 1, ed 0.
Causa: `ppVal` (~34-40) solo sustituye macros de un único token numérico (`#define V (5)`, `#define L -1` o `X -> Y -> 5` dan 0), evalúa con JS (`7/2` = 3.5, `0x10` se rompe: el `x10` se toma como identificador -> 0). Arreglo: expandir las macros con `expandDefines` antes, y dividir con `Math.trunc`; aceptar literales hex.

### A12. Tabla de funciones de biblioteca pisa las del alumno  [baja, media si ocurre]
`r16_nombre_biblioteca.c`: el alumno define `int pow(int b, int e)` (o `round`, `abs`...). gcc usa la del alumno (`[mi pow]1024`); ed ignora la suya (usa `Math.pow`, no imprime `[mi pow]`) y además avisa `usás pow pero falta #include <math.h>` y `printf: '%d' espera un entero, pero ... es double`.
Causa: en `call()` (~1194-1240) los builtins se resuelven antes de `this.funcs.get(name)`. Arreglo: si el programa define una función con ese nombre, saltear el builtin (y el chequeo de `#include`).

### A13. `putchar()` / `isdigit()` / `toupper()` sin argumentos -> excepción interna del compilador  [baja, baja]
`r22_putchar_vacio.c`: `TypeError: Cannot read properties of undefined (reading 'line')` (`call()`, `this.expr(args[0])`). En la app lo atrapa el Worker ("error interno del editor"). Arreglo: validar `args.length` en las funciones de 1 argumento (hoy solo lo hacen sqrt/pow/abs).
(Los 120 000 mutantes sintácticos solo encontraron esta clase.)

---

## B. Salida distinta de gcc en programas válidos

### B1. `scanf("%d", &a[expr])`: el índice se evalúa al guardar y solo si la conversión anda  [media, ALTA gravedad]
`r06_scanf_indice.c`
```c
int a[10], n = 0;
while (scanf("%d", &a[n++]) == 1);
printf("n=%d\n", n);
```
entrada `4 5 6`: gcc `n=4` (el `n++` corre en cada llamada, también en la que falla); ed `n=3`. Y `r23_scanf_orden.c`: `scanf("%d %d", &a[i++], &a[i++])` con `7 8` -> gcc `8 7` (argumentos de derecha a izquierda), ed `7 8`.
Causa: `scanfCall` (~1332, 1351) llama `lvalue(a.e, true)` sin `useTemps` y mete `lv.c` dentro de las flechas `()=>lv.c` / `(v)=>{lv.c=v}`: el índice (con su `i++`) se evalúa recién cuando el runtime ejecuta el setter. Ya pasaba en main.
Arreglo: `lvalue(a.e, true, true)`, emitir `lv.pre` (en orden de derecha a izquierda, como `hoistArgs`) antes del `await $.scanf(...)` y usar `$aN[$iN]` en las flechas.

### B2. `scanf("%d", &a[f(i)])` con una función del alumno (o getchar) en el índice: el programa NO CORRE  [baja-media, ALTA gravedad]
`r07_scanf_llamada.c`
```c
int idx(int i){ return i * 2; }
... for (i = 0; i < 3; i++) scanf("%d", &a[idx(i)]);
```
gcc: `5 6 7`. ed (YIELD=1, que es la app): `Error inesperado del editor ... Unexpected identifier 'f_idx'`.
Causa: el mismo `refs.push('[()=>'+lv.c+...)`: `lv.c` lleva `(await f_idx(...))` dentro de una flecha NO async -> SyntaxError al armar el programa. Con `yieldLoops` todas las llamadas a funciones propias son `await`. Se arregla con el mismo cambio de B1 (evaluar el lvalue antes, fuera de las flechas).

### B3. Orden de evaluación de gcc con una llamada junto a una variable simple  [baja, media]
`r13_orden_llamada.c`
```c
int g = 0; int inc(){ g++; return g * 10; }
int x = g + inc();   // gcc 11, ed 10
g = 0; g += inc();   // gcc 11, ed 10   (también g = g + inc())
```
gcc evalúa primero la llamada y recién después lee la variable global simple; el editor evalúa izquierda a derecha en `binOp`/`assignOp`. Realista con contadores globales. Solo `printf`/llamadas a funciones propias (hoistArgs) imitan a gcc.
Arreglo: en `binOp`, si un operando tiene llamada y el otro es una lectura simple de variable (`id` global o cualquiera), hoistear la llamada a un temporal antes; en `assignOp` compuesto (`+=`) evaluar el RHS con efectos antes de leer el LHS.
Variante: `r24_compuesto_indice.c`: `a[pos()] += val()` gcc `(val)(pos)`, ed `(pos)(val)` (con `=` simple sí coincide).

### B4. Funciones de `math.h` no usan `hoistArgs` (orden derecha a izquierda)  [baja, baja]
`r14_math_orden.c`: `pow(rd(), rd())`, entrada `2 3`: gcc `9` (3^2), ed `8`. También `fmax`, `atan2`, `hypot`. Causa: la rama MATH de `call()` (~1209-1216) arma `a.map(...)` sin `hoistArgs`. Arreglo: usar `hoistArgs(args, a)` como en las funciones del usuario.

### B5. UB de pre-incremento/asignación: gcc re-lee la variable, el editor toma el valor en ese momento  [baja, media (ejercicios "qué imprime")]
`r12_ub_preinc.c`
```c
int i = 0, x; x = ++i + ++i;   // gcc 4 (2+2), ed 3
i = 1; i += i++;               // gcc 3,      ed 2
```
Tambien `printf("%d %d", i++, ++i)` (gcc `1 2`, ed `1 1`), `printf("%d %d %d", i, i++, ++i)` (gcc `2 1 2`, ed `2 1 1`), `(i=3)+(i=4)` (gcc 8, ed 7), `i + (i=7)` (14 vs 12). Mismo resultado de gcc en -O0/-O1/-O2. El postfijo (`i++ + i++`, `a[i++]=i++`) sí coincide. Causa: `incdec` prefijo y `assignOp` devuelven el valor asignado (snapshot), pero en gcc el resultado de `++i`/`i=x` es el lvalue y se lee después de evaluar el resto. Arreglo costoso; ver si vale la pena (son UB).

### B6. `sizeof` es `int`/`unsigned`, en C es `size_t` (unsigned long)  [baja, baja]
`r11_sizeof.c`: `-1 < sizeof(int)` -> gcc 0, ed 1; `sizeof(int) - 5` con `%lu` -> gcc 18446744073709551615, ed 4294967295. Causa: `case 'sizeof'` (~987-994) devuelve `t:'int'` (tipo) o `'uint'` (arreglo). Arreglo: devolver `t:'ulong'` con BigInt (`'8n'`...) o al menos 'ulong'. Cuidado: hoy `sizeof(a)/sizeof(a[0])` es Number y se usa como índice/tamaño; pasa por `ix`/`mk` que ya aceptan BigInt.

### B7. Arreglo con primera dimensión omitida e inicializador plano: filas de más  [baja, baja]
`r10_init2d.c`: `int u[][2] = {1,2,3,4,5};` -> gcc `sizeof(u)/sizeof(u[0])` = 3, ed 5 (`declCode` ~857: `dimsCode.push(String(v.init.items.length))`, cuenta los elementos planos). Con llaves anidadas (`{{1},{2},{3}}`) anda. Arreglo: si la lista es plana y hay más dimensiones, filas = ceil(items / producto de las demás dimensiones).

### B8. `NAN`, `acos(2)`, `fabs(nan)`, `NAN+1` imprimen "-nan" (gcc "nan")  [baja, baja]
`r18_nan.c`: gcc `nan nan -nan`, ed `-nan -nan -nan`. Causa: `cformat` (runtime ~142) trata todo NaN como negativo (correcto para `0.0/0.0`, `sqrt(-1)`, `inf-inf`, `0*inf`, `log(-1)`, `fmod(x,0)` en x86, que sí dan `-nan`), pero no para la constante `NAN`, `acos/asin` fuera de dominio ni operaciones sobre un NaN positivo. Sin canal de signo en JS; la salida más frecuente (`-nan`) está bien.

### B9. `%#.0e`/`%#.0E` no pone el punto  [muy baja]
`r19_alt_e.c`: gcc `[1.e+06] [2.E+00]`, ed `[1e+06] [2E+00]` (`expForm` ~75-78 no mira `alt` con `p === 0`). Solo `#` con precisión 0 en `e/E`; `%#.0f` y `%#g` están bien.

### B10. Precisión de `pow`/`cbrt`/`exp2`... (V8 vs glibc)  [muy baja]
`pow(x, 2.5)`, `pow(2, i/7.0)`, `cbrt(x)`: diferencias de 1 ulp en ~1 de cada 100 valores al mostrar 15-17 dígitos (`%.17g`, o `%.10f` con magnitud 1e5+). Con `%.2f`/`%.6f` no se ve. `sin/cos/tan/exp/log/atan/sinh/log10` coincidieron en 400 puntos. Y `pow(1, ±inf)`, `pow(-1, ±inf)`, `pow(1, NaN)` dan NaN en JS y 1 en C; `fmax/fmin` con NaN también difieren.

---

## C. Falsos negativos de avisos (gcc -Wall -Wextra -O2 avisa y el editor no)  [baja]
- Variable asignada solo en algunos `case` de un `switch` sin `default` y usada después (`x2.c`: gcc "u may be used uninitialized"). `stmt` case 'switch' no hace el análisis if/else.
- Variable asignada en el cuerpo de un lazo y usada después: se da por asignada (`asignarLog` tras `while/for`); correcto para `for` típicos, pero oculta `while (c) { x = 1; } use(x)`.
- Asignación dentro de `&&`/`||` (`if (n > 0 && (k = n) > 0)`) se da por asignada siempre.
- `inSC` suprime el aviso en TODO el lado derecho de `&&`/`||`, aun si la variable nunca se asignó.
- `printf("%d", sizeof(x))`, `%d` con `unsigned long`/`%u` con `long`: sin aviso (gcc -Wformat avisa).
- Mensajes sin código propio (caen en `otro` y por eso no se pueden silenciar con coherencia): `else sin if`, `falta 'while' del do`, `cadena sin cerrar`, `comentario sin cerrar`, `'=>'`/`'=<'`/`'<>'`, `a la izquierda del = ...`, `falta el #endif`, `printf/scanf necesita un texto...` (cae en `funcion`). Nada grave.

## D. Límites / información
- Recursión: se rompe cerca de 9 000 niveles (`sum(9000)` falla; gcc llega a >100 000). Igual en main (limite de V8), pero ahora el mensaje sale con `línea undefined`.
- `Function(...)` se usa dentro del compilador (`ppVal` para `#if`, constantes de `case` y de tamaños de arreglo): si la página tuviera CSP sin `unsafe-eval` el runtime tiene respaldo (`makeProgram`) pero `#if` daría "la condición del #if no se entiende" aun para `#if 1`. Hoy `template.html` no define CSP.
- Arreglos globales de más de 20 M elementos se rechazan (gcc los acepta en .bss); locales > ~2 M `int` en gcc ya revientan la pila (el editor no).
- Salida de `fprintf(stderr, ...)` se mezcla con stdout (esperable en la UI; hace fallar comparaciones de stdout puro).

---

## E. Revisado y está bien (sin diferencias contra gcc)
- Enteros de 64 bits (BigInt): `conv()` en las 11x11 combinaciones de tipos (args, retornos, asignaciones, casts, compuestos), `binOp` con operandos mezclados int/uint/long/ulong/short/ushort/char/uchar/bool/float/double, comparaciones con y sin signo, shifts, `++/--`, `+=` con RHS double, ternario con tipos mezclados, `switch` sobre long/char, índices long, arreglos de long/ulong/bool/uchar/short (1D y 2D), argumentos y retornos long/ulong/bool, `scanf` y `printf` con `%ld %lld %lu %llu %zu %hd %hhd`, funciones de math.h y `abs/labs` con argumentos long, constantes `LONG_MAX/ULONG_MAX`, sufijos `L UL LL u`, hex/octal/binario, `-2147483648`, desborde con envoltura. Fuzzer propio de ~370 programas x 60 sentencias: 0 diferencias (las 3 que aparecieron eran UB de double -> char fuera de rango del propio generador). Misma batería en modo `YIELD=1`.
- `ulong`, `bool` (`b++`, `b--`, `b = 5`, `b = 0.5`), `uchar`/`short`/`ushort` (envoltura en `=`, `+=`, `++`, `<<`, argumentos y retornos).
- Hoisting de locales sin inicializar: recursión (un `let` por invocación), variables en bloques anidados, en `switch`/`case` con llaves, `for (int ...)`, sombreado entre bloques, repetición de `int x;` entre iteraciones (persisten como en gcc -O0). Sin colisiones de nombres (`v_x$h<N>`, `$o<N>`, `$s<N>` únicos).
- Sombreado con nombres únicos: global/param/local/bloque/for anidados; static locales (varios por función, mismo nombre en bloque interno, en funciones recursivas, arreglos `static`).
- Temporales `$a<N>/$i<N>` y `$t`: índices con efectos, `a[b[i++]]++`, `m[next()][next()]=..`, `a[i++]+=..`, funciones recursivas con índices con efectos, argumentos anidados; no hay colisiones (el contador es por función y las variables son `let` por invocación).
- `hoistArgs`: derecha a izquierda con llamadas anidadas, `printf` con llamadas que imprimen, cortocircuito `&&`/`||` dentro de argumentos, `getchar()`/`scanf` dentro de funciones usadas como argumentos (async), ternarios de textos como argumentos.
- `#define` con parámetros: argumentos con comas entre paréntesis (`MAX((1,2),0)`), macros anidadas/encadenadas, macros que expanden a `for`/`printf`, argumentos macro, continuación con `\`; `#if/#ifdef/#ifndef/#elif/#else/#endif` anidados, `defined X`/`defined(X)`, `#elif` tras rama tomada, `#undef` seguido de `#ifdef`.
- Arreglos como parámetro y `sizeof` (1D/2D, `sizeof(param)` = 8, `sizeof a`, `sizeof m[0]`), `$.init` con llaves omitidas en 1D/2D/3D, relleno parcial, `{}` y `{0}`, inicializadores de long/double.
- `scanf`: `%i %x %X %o %u %d %ld %lld %lu %hd %c %f %lf`, saturación (>2^64, > LONG_MAX, negativos en `%u/%x`), ancho (`%3d%2d`), supresión (`%*d`), literales en el formato, fin de entrada, `1.`/`.5e`/`-`/`+5`, mezcla con `getchar()` y `%c`.
- `printf`: flags/ancho/precisión con `h hh l ll z j t`, `*` y `.*` negativos, `%#x %#o %#.5x %08.3f`, `%e %g %G %#g`, redondeo exacto (half-even), inf/nan, `%.0d` con 0, `\0` en el formato, `%5s/%-10s` con UTF-8 (ancho en bytes), valor de retorno en bytes. Fuzzer de formatos (6 x 400): solo diferencias B9 y bytes sueltos de `%c` > 127.
- `rand/srand` glibc: secuencias idénticas para 10 semillas (0, 1, 2^31, 2^32-1, negativas, double), 100 000 llamadas, `RAND_MAX`.
- ctype con máscaras glibc: `isalpha`..`tolower` para c = -1..255, `char` negativo.
- Mensajes de error en tiempo de ejecución con línea (división, resto, índice, tamaño de arreglo, ancho de formato gigante), también dentro de macros y funciones; código de salida `& 255`.
- Códigos de diagnóstico (`conCodigo`): los 22 de `test/diag.js` y revisión de los ~150 mensajes literales contra la tabla `CODIGOS` (solo los de la sección C caen en `otro`).
- Robustez: 120 000 mutantes de sintaxis; 0 excepciones salvo A13. Rendimiento: lazo de 10 M iteraciones con `long` (BigInt) 0,2-0,4 s; con `YIELD=1` y 100 M iteraciones de `int` 1,7 s; llamadas a funciones ~7x más lentas en modo async.
- `test/run_all.sh`: 71/71; `test/diag.js`: 22/22; todos los casos también con `YIELD=1`.

## F. Prioridad sugerida de arreglo
1. B2 (programa válido no corre) y B1 (mismo código; `while (scanf(.., &a[n++]) == 1)`).
2. A1, A2, A3, A4, A5, A8 (avisos falsos que un alumno ve con programas comunes; los 4 primeros son de 1-3 líneas).
3. A10, A9, A12, B3, B7.
4. El resto.

Parches de prueba (A2, A3, A4, A8) aplicados a una copia en `revision_motor/patched/` (no al repo): los avisos falsos desaparecen y `test/diag.js` sigue en 22/22.
