# Auditoría de diagnósticos del Editor C

Fecha de la corrida: 2026-11-06. Editor: `/home/user/editor-c` (src/compiler.js ~1014 líneas, src/runtime.js). Referencia: gcc 13 `-Wall -Wextra`.

Material en esta carpeta:
- `casos/` 260 programas con errores/descuidos (001..260) + `casos3/` 40 más (301..340) = **300 casos con error**.
- `validos/` (v01..v66) + `validos2/` (w01..w50) = **116 programas válidos** para buscar falsos positivos.
- `extra/` 5 casos sueltos (archivo vacío, solo comentario, varios errores juntos).
- `resultados.json`, `resultados_casos3.json`: salida cruda de gcc y del editor por caso. `casos*.txt` son las fuentes con las que se generaron los `.c`. `run.py`, `show.py`, `cw.js`: scripts de corrida.

Cómo se leyó el resultado: `ERR` = el editor se niega a ejecutar. `WARN` = ejecuta con aviso. "silencio" = sin ERR ni WARN. Cuando el editor corre un programa que en C tiene comportamiento indefinido (variable sin inicializar) el editor muestra un valor "razonable" (0) y gcc muestra basura: eso no se marca como diferencia, pero justifica avisar.

Nota de ejecución: en `test/run1.js` los bucles infinitos cuelgan el proceso (la app real usa `yieldLoops` + botón Detener y corta la salida a un tope, así que no es cuelgue del navegador, pero no hay ningún mensaje que explique por qué "no termina").

---

## 0. Resumen en una pantalla

- El editor ya cubre muy bien: `;` faltante (línea correcta, usa la línea anterior), llaves/paréntesis, comillas sin cerrar, `&` faltante en scanf, formatos printf/scanf contra el tipo, no declarada, doble declaración, `=` en condición, división por cero (en ejecución, con línea), índice fuera de rango (con línea), argumentos de más/menos, `void` usado como valor, asignar a `const`, `else` sin `if`, `case` fuera de `switch`, división entera guardada en float, comparar decimales con `==` contra literal.
- **9 programas terminan en mensaje interno de JS o sin línea** (sección 1).
- **Faltan avisos importantes que gcc sí da y que son de los errores más comunes en la materia**: falta `#include <stdio.h>`/`<math.h>`, función usada antes de definir sin prototipo, función `int` sin `return`, `switch` sin `break`, `case` repetido, prototipo que no coincide con la definición, `if (…);`, `a == 5;` como sentencia, `&` por `&&`, `0 < a < 3`.
- **Mensajes engañosos**: "falta un ';' … (antes de '{')" para `elseif`, `elif`, `then`, `else (cond)`, `Int a`, `string x`, `flaot`; "los punteros todavía no están soportados" para `2 ** 3`; "parámetro mal escrito" para código suelto fuera de función.
- **Falsos positivos / limitaciones que un alumno puede toparse con código válido**: arreglos como parámetro de función (`int v[]`), `sizeof(v)/sizeof(v[0])`, `?:` con textos dentro de printf, `char s[] = "hola"`/`%s`, `unsigned char` se comporta como `char` con signo (imprime -56 en vez de 200), aviso de "sin inicializar" falso en `i == 0 || x > mayor`.

---

## 1. Tabla principal, ordenada por gravedad y frecuencia esperada

Veredictos: OK / aviso faltante / error faltante / mensaje malo / línea mal / falso positivo / crash.

### 1A. CRASH / mensaje interno de JS / ejecución con resultado incorrecto

| Caso | gcc -Wall -Wextra | Editor | Veredicto |
|---|---|---|---|
| 044 `scanf("%d %d", &a);` (falta una variable) y 304 `scanf("%d");` | warning `-Wformat` (compila; en ejecución lee basura) | WARN correcto en la línea, **pero al ejecutar**: `RUNTIME ERR lundefined: error interno: Cannot read properties of undefined (reading '1')` | **crash** (mensaje feo, sin línea). Muy probable en alumnos |
| 154 `if (d) break;` y 155 `continue;` fuera de bucle | `error: break statement not within loop or switch` | compila sin queja; al correr: `error interno: Illegal break statement` (sin línea) / `Illegal continue statement: no surrounding iteration statement` | **crash** + error faltante |
| 149 `default:` repetido en un switch | `error: multiple default labels in one switch` | compila; al correr `error interno: More than one default clause in switch statement` (sin línea) | **crash** + error faltante |
| 090 `int v[-3];` | `error: size of array 'v' is negative` | compila; al correr `tamaño de arreglo inválido (-3)` sin línea | mensaje malo + línea mal (debe ser error de compilación con línea) |
| 091 `int v[0];` | compila (extensión GNU) | `tamaño de arreglo inválido (0)` sin línea y no ejecuta nada | mensaje malo / línea mal (tamaño 0 casi siempre es error del alumno; igual hay que dar línea) |
| 121 recursión sin caso base; 258 `main()` llamándose a sí mismo | `warning: infinite recursion detected` (121) / segfault | `desbordamiento de la pila (recursión infinita o muy profunda)` **sin línea** (en 258 imprime 40 veces "a" antes) | línea mal (mensaje razonable, falta dónde) |
| 340 `unsigned char c = 200; printf("%d", c);` y v54 | imprime 200 | imprime **-56** (`unsigned char` se trata como `char` con signo; w49 `c = c + 10` sí da 4) | **resultado incorrecto** (bug de `typeSpec`) |

### 1B. Error o aviso FALTANTE en errores muy frecuentes

| Caso | gcc | Editor | Veredicto |
|---|---|---|---|
| 131 falta `#include <stdio.h>` (usa printf) | warning implicit declaration + builtin mismatch (gcc 14 lo hace error) | silencio, ejecuta | **aviso faltante** (muy frecuente; el profe lo exige) |
| 132 falta `#include <math.h>` (usa sqrt) | warning implicit declaration | silencio, ejecuta | **aviso faltante** (muy frecuente) |
| 101 función usada antes de definirla, sin prototipo | warning `-Wimplicit-function-declaration` (error en gcc 14) | silencio (el editor junta todas las firmas primero) | **aviso faltante** (el tema "funciones con prototipos" es de la materia) |
| 110 / 111 función `int` sin `return` al final (o `return` solo dentro de `if/else if`) | warning `control reaches end of non-void function` | silencio; devuelve 0 (en C devuelve basura: 4 / 1165197680) | **aviso faltante** (muy frecuente) |
| 142 `switch` sin `break` (cae al siguiente case) | warning `-Wimplicit-fallthrough` | silencio | **aviso faltante** (muy frecuente) |
| 143 `case 1:` repetido | `error: duplicate case value` | silencio, corre el primero | **error faltante** |
| 145 `case 1.5:`, 146 `case k:` (variable), 148 `case d > 0:`, 152 `case "b":` | `error: case label does not reduce to an integer constant` / `pointers are not permitted` | silencio, corre | **error faltante** |
| 114 / 337 prototipo con distinta cantidad de parámetros o distinto retorno que la definición | `error: conflicting types for 'f'` | silencio, corre | **error faltante** |
| 005 `if (a > 3);` (punto y coma sobrante) | warning `-Wempty-body` + `misleading-indentation` | **silencio** (el `for`/`while` sí avisan: 006, 007) | **aviso faltante** (típico) |
| 311 `else;` | warning `-Wempty-body` | silencio | aviso faltante |
| 030 `a == 5;` (querían asignar) y 226 `a + 1;` | 226: warning `statement with no effect`; 030 gcc además avisa `-Wunused-value` | silencio (en 030 solo avisa "sin inicializar" de `a`, que es otro tema) | **aviso faltante** (típico) |
| 167 `if (a == b)` con dos variables `double`/`float` | gcc no avisa | silencio (solo avisa si un lado es literal con decimales: 165, 166, 168, 310) | **aviso faltante** (el caso más común es variable contra variable) |
| 177 `if (a > 0 & b > 0)` | warning `-Wparentheses` | silencio | aviso faltante |
| 178 `if (0 < a < 3)` | warning `-Wparentheses` / `bool-compare` | silencio (da "rango" para a=5, que es incorrecto) | **aviso faltante** (típico de matemática) |
| 133 `#include <studio.h>`; 137 `<conio.h>`; 214 `# comentario`; 134 `include <stdio.h>` sin `#` | 133/137/214: `fatal error`/`invalid directive`; 134: error | 133, 137, 214: **silencio** y ejecuta; 134: "no se entiende 'include' fuera de una función" | aviso/error faltante (133, 137, 214); 134 mensaje malo |
| 072 `r` asignada solo dentro de un `if` y leída después | sin aviso (solo con -O) | silencio (imprime 0) | aviso faltante (útil pero con riesgo de falsos positivos, ver 3.29) |
| 095 `int v[3] = {1,2,3,4,5};` | warning `excess elements in array initializer` | silencio | aviso faltante |
| 320 función y variable global con el mismo nombre | `error: redeclared as different kind of symbol` | silencio | error faltante (bajo) |
| 306 `x =+ 1;` / `x =- 1;` | sin aviso | silencio | aviso faltante (bajo, pero clásico) |
| 248 `2 ^ 3` | warning `-Wxor-used-as-pow` | silencio, da 1 | **aviso faltante** (típico: "potencia") |
| 249 `2 ** 3` | error | ERR "los punteros todavía no están soportados" | mensaje malo (ver 1C) |
| 156 `while (i < 5) { printf… }` sin tocar `i`; 158 `for(;;)`; 159 `while(1){}`; 161 `x != 1.0` con paso 0.1; 162 `char c < 200` | 162: warning `-Wtype-limits` | silencio; el programa corre para siempre (la app imprime sin parar hasta el tope de salida) | **aviso faltante** (bucle infinito: muy frecuente) |
| 157 `for (i=10; i>0; i++)` | sin aviso (termina por overflow/break) | igual | OK en comportamiento; aviso faltante opcional |
| 058 `printf("%ld", int)` | warning `-Wformat` | silencio | aviso faltante (bajo; fuera de materia: casi no usan long) |
| 303 `printf("100%\n")` | warning `unknown conversion type` | silencio (imprime `100%`) | aviso faltante (bajo) |
| 333 `scanf("%.2f", &x)` | warning `unknown conversion` | silencio; x queda en 0 | aviso faltante |
| 041 `scanf("%d, %d")`, 042 `scanf("%d\n")`, 043 `scanf("Ingrese: %d")` | gcc no avisa (en 041/043 lee mal; 042 queda esperando) | silencio; 041 y 043 dejan el valor sin leer | **aviso faltante** (alumnos ponen texto/coma/`\n` dentro de scanf) |
| 040 `scanf("%d")` seguido de `scanf("%c")` | sin aviso | silencio (lee el `\n`; igual que C) | OK en comportamiento; aviso faltante opcional (sugerir `" %c"`) |
| 075 leer `v[0]` de arreglo sin inicializar | warning `-Wuninitialized` | silencio (imprime 0) | aviso faltante (bajo) |
| 106 / 107 / 313 / 314 / 336 `int r = mitad(5)` donde la función devuelve float, `int r = sqrt(17)`, `int r = pow(10,2)`, `int r = a / b` con `b` float | gcc no avisa (sin `-Wconversion`) | silencio, trunca | aviso faltante opcional ("se pierde la parte decimal"). Con `pow` además es riesgo real en C (99.999→99) |
| 105 `doble(2.7)` a parámetro `int` | sin aviso | silencio, trunca | aviso faltante opcional |
| 125 / 319 `void main()` / `float main()` | warning `-Wmain` | silencio | OK por tolerancia (es práctica común escolar); aviso opcional |
| 127 `main()` sin tipo | warning `-Wimplicit-int` | silencio | OK por tolerancia; aviso opcional |
| 201 `bool b` sin `<stdbool.h>` | error unknown type name | silencio, ejecuta (w01 con `stdbool.h` OK) | aviso faltante (bajo) |
| 136 `system("pause")` | compila | silencio y no hace nada | OK (en navegador no aplica) |
| 227 `if (a > 3 \|\| a < 10)` siempre verdadera; 228 `if (5)`; 326 `if ("a")` | sin aviso | silencio | aviso faltante opcional |

### 1C. MENSAJE MALO o ENGAÑOSO (línea correcta, texto confuso)

| Caso | gcc | Editor | Veredicto |
|---|---|---|---|
| 199 `Int a = 5;`, 200 `string nombre`, 202 `flaot x` | `unknown type name 'Int'; did you mean 'int'?` | `falta un ';' al final de esta línea (antes de 'a')` | **mensaje malo** (frecuente). Debe decir que `Int` no es un tipo |
| 171 `} elseif (…) {`, 172 `elif`, 173 `else (a<0) {`, 175 `if (…) then {` | error `expected ';' before '{'` | `falta un ';' al final de esta línea (antes de '{')` | **mensaje malo** (frecuente en quien viene de otro lenguaje) |
| 249 `2 ** 3` | `invalid type argument of unary '*'` | `los punteros todavía no están soportados en este editor` | **mensaje malo** (confunde) |
| 130 `printf` suelto fuera de función (global) | error | `parámetro mal escrito: se esperaba un tipo (int, float, ...)` | **mensaje malo** |
| 198 `5++;` | `lvalue required as increment operand` | `a la izquierda del = tiene que haber una variable` | mensaje malo (no hay `=`) |
| 181 `int int = 5;`, 183 `int float = 5;` | `two or more data types…` | `se esperaba un nombre pero se encontró '='` | mensaje malo (182 `int for` sí sale bien: "'for' es una palabra reservada") |
| 185 `int 1a`, 216 `float x = 2,5;`, 217 `2.5.3`, 218 `25a` | `invalid suffix`, `too many decimal points`… | 185: "se esperaba un nombre pero se encontró '1'"; 216: "…encontró '5'"; 217 y 218: "falta un ';' … (antes de '0.3' / 'a')" | mensaje malo. 216 (`2,5` con coma decimal) es muy frecuente en hispanohablantes |
| 186 `int mi var`, 187 `mi-var`, 244 `int mi func(…)` | `expected '=', ',', ';'…` | "falta un ';' … (antes de 'var' / '-' / 'func')" | mensaje parcialmente útil; mejor "los nombres no llevan espacios ni guiones" |
| 025 `int años` | gcc 13 lo acepta (UTF-8) | `carácter no válido 'ñ'` en la línea correcta | OK en línea; mensaje mejorable ("los nombres no pueden llevar ñ ni tildes") |
| 024 comillas tipográficas “ ” | `stray '\342'` | `carácter no válido '“'` | OK. Mejorable: "esas comillas “ ” vienen de Word/celular, usá las rectas \"" |
| 027 punto y coma griego (U+037E) | stray | `carácter no válido ';'` (se ve igual que un `;`) | mensaje malo (indistinguible a simple vista). Decir el código U+037E |
| 020 `printf(Hola mundo\n);` | undeclared 'Hola' | `carácter no válido '\'` | mensaje malo (debería decir "faltan las comillas del texto") |
| 021 `char c = 'ab';` | warning multichar | ERR "carácter con comillas simples mal escrito…" | OK (más estricto que gcc, bien) |
| 023 `printf('Hola\n')` | warning (crash en C) | ERR mismo mensaje de 021 | OK, pero el mensaje habla de "un solo carácter"; ayuda más: "las comillas simples son para un carácter, para texto usá \"…\"" |
| 022 `char c = "a";` | warning `-Wint-conversion` | `no se puede usar un texto entre comillas como número` | **línea mal** (reporta línea 0), mensaje aceptable |
| 108 `int x = saludar();` (void) | error | `esa función no devuelve ningún valor` | **línea mal** (línea 0) |
| 129 `return "ok";` en main | warning | `no se puede usar un texto entre comillas como número` | **línea mal** (línea 0) |
| 097 `w = v;` entre arreglos | `assignment to expression with array type` | dos ERR: "'w' es un arreglo: usá w[i]…" y "'v' es un arreglo…" | mensaje malo (debe decir que no se copia un arreglo con `=`, copiar con un `for`) |
| 096 `printf("%d", v)`; 098 `scanf("%d", &v)`; 243 `f(v)` | warning | ERR "'v' es un arreglo: usá v[i]" | OK |
| 099 / 100 `m[1]` o `m[1,1]` en matriz 2D | warning | "'m' tiene 2 dimensión(es) y se usó con 1" | OK |
| 122 `int Main()` / 123 `mian` | error undefined reference | `no hay función main()…` (línea 1) | OK; mejorable: "encontré 'Main' (¿main con minúscula?)" |
| 124 `int main {` | error | "falta un ';' al final de esta línea (antes de '{')" | mensaje malo (falta `()`) |
| 329 falta `}` de una función y sigue otra función | error al final | "falta un ';' … (antes de '(')" en la línea de `int main() {` | línea bien, mensaje malo: debería decir "falta cerrar la llave de la función 'f' antes de empezar 'main'" |
| 330 `int main();` seguido de `{` | error | "no se entiende '{' fuera de una función" | mensaje malo (sobra el `;` en la cabecera) |
| 115 función dentro de `main` | gcc permite (extensión GNU anidada) | "falta un ';' … (antes de '(')" | mensaje malo ("no se pueden definir funciones dentro de otra función") |
| 116 `int f(x)` sin tipo de parámetro | warning implicit int | "parámetro mal escrito: se esperaba un tipo" | OK |
| 332 `int v(5);` | error | "falta un ';' … (antes de '(')" | mensaje malo (creen que `()` define tamaño) |
| 179 `a <> 3`, 180 `a => 3` | error | "falta una expresión antes de '>'" | mensaje regular (decir "usá != / >=") |
| 176 `a > 0 and b > 0` | error | "se esperaba ')' pero se encontró 'and'" | mensaje regular: decir "en C: && (y), \|\| (o), ! (no)" |
| 174 `if a > 0 {` | error | "se esperaba '(' pero se encontró 'a'" | OK |
| 147 `case 1..3:` | error | "se esperaba ':' pero se encontró '0.3'" | mensaje malo (muestra `0.3`) |
| 192 `#define N = 5;` | error en la línea del `#define` | `falta una expresión antes de '='` reportado en la línea del **uso** (l4, no l2) | línea mal + mensaje malo |
| 191 `N = 6` con `#define N 5` | error | "a la izquierda del = tiene que haber una variable" | mensaje regular: "N es una constante del #define, no se puede cambiar" |
| 203 / 204 `Printf`, `Scanf`; 205 `cout`; 206 `print`; 211 `gets`; 138 `strlen` | warning/err | "la función 'Printf' no está declarada" (+ un segundo error espurio en 204: "el operador '&' solo se usa dentro de scanf"; en 205: "no se puede operar con un texto…") | mensaje regular + errores en cascada. Sugerir "¿printf?" |
| 207 / 208 / w19 `char nombre[10]; scanf("%s", nombre)` | funciona en C | 2-3 mensajes en cascada ("scanf necesita '&'…", "es un arreglo…", WARN "%s…") | **falso positivo / limitación** con mensaje confuso (debe ser UN solo mensaje: "los textos (char[]) no están soportados en este editor") |
| 062 / 063 variable sin declarar usada varias veces | 1 error por uso | repite el mismo error por cada uso (l3, l4 …; en `extra/dos_undecl.c` 4 errores por 2 variables) | mensaje redundante (deduplicar por nombre, mostrar el primero) |
| 069 `a = 5; int a;` | error en l3 | ERR l3 correcto + WARN espurio l5 "se usa antes de darle un valor" | ruido (suprimir WARN cuando hay ERR del mismo nombre) |
| 033 / 034 / 035 `scanf("%d", n)` | warning, crash en ejecución | ERR correcto en l4 + WARN espurio de "sin inicializar" en l5 | ruido (mismo motivo) |
| 084 `a % 2` con float | error | ERR correcto + WARN espurio de printf en la misma línea | ruido |
| 141 `raiz(16.0)` | warning implicit | ERR correcto + WARN espurio de printf | ruido |
| 057 `printf("20% sobre %d")` | warning | WARN: "pide 2 valores…" y "'%s' es para textos y 'd' es int…" | mensaje malo (nombra 'd' que es la variable, el alumno no entiende; falta decir "el % solo se escribe %%") |
| 053 `printf("el valor es ", a);` | warning extra args | WARN "recibe más valores (1) de los que usan los %" | OK; mejorar con "¿falta %d?" |
| 039 `scanf("%lf", &x)` con x float | gcc: pisa memoria (stack smashing) | WARN correcto | OK |
| 059 `printf("%.2d", x)` x float | warning | WARN: "'%d' espera un entero, pero 'x' es float" imprime `03` | OK |
| 083 `printf("%f", a / b)` | warning | WARN "el argumento 1 es entero (int)" | OK (mensaje podría decir "a / b") |
| 128 `main(int argc, char *argv[])` | funciona | ERR "los punteros todavía no están soportados" | limitación aceptable (se puede aclarar que main no lleva parámetros acá) |

### 1D. FALSOS POSITIVOS / limitaciones con código válido para gcc

| Caso | gcc | Editor | Veredicto |
|---|---|---|---|
| v21 `int suma(int v[], int n)`, w16 `int v[5]` como parámetro, w15 `int m[2][2]` como parámetro, 120, 242 | compila y corre | ERR `los arreglos como parámetro todavía no están soportados en este editor` | **falso positivo / limitación grave** (arreglos + funciones es tema de 5to) |
| w31 `sizeof(v) / sizeof(v[0])` | 5 | ERR `sizeof solo se soporta con un tipo (sizeof(int)) o una variable simple` (dos veces) | **falso positivo** (idioma habitual para el largo de un arreglo) |
| v28 `printf("%s\n", a > 3 ? "mayor" : "menor");` | compila | ERR `los dos lados del ?: deben ser números` (+ WARN %s) | **falso positivo** |
| v54 / 340 `unsigned char` | 200 | imprime -56 | **resultado incorrecto** |
| w48 `if (i == 0 \|\| x > mayor) mayor = x;` | sin aviso | WARN `'mayor' se usa antes de darle un valor` | **falso positivo** (el `\|\|` protege la lectura; patrón máximo/mínimo muy usado) |
| v45 / 006 `for (…) ;` con cuerpo vacío intencional | sin aviso | WARN `el for termina en ';'…` | aviso razonable; es falso positivo si es intencional (retraso/for sin cuerpo). Bajo, aceptable |
| v43 `#define DOBLE(x) ((x)*2)` | compila | ERR `los #define con parámetros todavía no están soportados` | limitación (fuera de lo básico) |
| w02 `enum`, w03 `typedef`, 209 punteros, 210 struct, 207/208/w19 `char[]`/`%s`, `gets`, `strlen` | compilan | ERR explícito "todavía no está soportado" | limitación declarada (OK por alcance de la materia) |
| 092 `int n=5; int v[n];` (VLA) | compila (C99) | silencio, funciona | OK |
| 041..043 | ver 1B | | |
| w41 `float mitad(int x){ return x / 2; }` | sin aviso | WARN "la división es entre dos enteros y se trunca…" | **no es falso positivo**: el aviso es correcto y útil (confirmado) |

### 1E. Casos que ya están OK (pudieron verificarse con el mismo criterio de línea/mensaje)

001, 002, 003, 004 (`;` faltante, con la línea de la sentencia incompleta y no la siguiente: correcto); 006, 007 (`for`/`while` con `;` sobrante); 009, 010 (`for` con comas / un solo `;`: mensaje "falta un ';' … (antes de ')')" aceptable); 011, 012 (llave sin cerrar, indica la línea de apertura); 013 (`}` de más); 014 (falta `}` de función, ver 329); 015, 016, 017, 018 (paréntesis); 019, 259 (comillas / salto de línea dentro del texto); 028, 029, 032, 309, 324 (`=` en condición, con el aviso correcto); 031 (`int a == 5`); 033, 034, 035, 322 (`scanf` sin `&`); 036, 037, 038, 039, 301 (formato de scanf contra el tipo); 045, 046, 048, 051, 052, 054, 055, 056, 302 (formatos de printf); 060, 061 (el mensaje no sugiere "¿quisiste decir 'Total'?" como gcc, ver 3.25), 062, 063, 064, 065 (no declarada / fuera de alcance); 066, 067, 068 (doble declaración); 070, 071, 073, 074, 315, 316 (sin inicializar); 076, 077, 078, 236, 328 (división por cero en ejecución con línea correcta); 079 (float/0 da `inf` igual que C); 080, 081, 082 (división entera a float, aviso muy bueno); 085, 086, 087, 088, 335 (índice fuera de rango, con línea correcta, mejor que C); 089, 093, 094 (arreglo índice/tamaño inválido); 102 (prototipo sin definición); 103, 104 (argumentos); 109, 112, 334 (`return` mal usado); 113, 126 (definida dos veces); 117 (función sin paréntesis); 118, 119 (tipo dentro de la llamada); 139 (`pow(2)`); 144, 318 (switch con selector no entero); 150, 151 (case sin `:`); 153 (`case` fuera de `switch`); 164, 323 (do-while / for sin `;`); 165, 166, 168, 310 (comparar float con `==`); 169, 170 (`else` sin `if`); 182, 254 (palabra reservada como nombre); 188, 189, 190 (const); 194, 195, 196, 197 (asignar a no-variable); 212 (comentario sin cerrar); 213 (`/` suelto); 215, 219 (octal `010` = 8 igual que C), 220, 221, 222 (desbordamientos que se comportan como C); 252, 253 (declaraciones con coma); 255; 257; 245, 246, 247, 331, 307, 308, 305 (expresiones incompletas); 317 (`%i`); 338, 339.

### 1F. Valores de salida que difieren de C pero son "comportamiento indefinido" en C

Las variables sin inicializar (070, 071, 073, 074, 075, 072, 315, 316), el índice fuera de rango y `scanf` con tipo equivocado (036-039, 301) dan en gcc basura o corrupción de pila (`stack smashing detected` en 039, 088, 301), y en el editor un valor "limpio" (0) o un error claro. Es mejor en el editor; solo hay que asegurarse de que el aviso salga SIEMPRE (por ejemplo 072 y 075 hoy no avisan).

---

## 2. Programas VÁLIDOS probados (116)

Pasaron sin error ni aviso y con la misma salida que gcc (v01-v66 excepto los citados, w01-w50 excepto los citados): hola mundo, `main()` sin tipo, `void main()`, `main(void)`, prototipos sin nombres de parámetros, globales (`int`, `float`, sin inicializar), comentarios raros (`/* // */`, `"` dentro de `//`, comentario final sin salto de línea), `#define` numéricos y vacíos, `const`, `for (int i…)`, scanf con `%d %f %lf %c` y valor de retorno `== 1`, switch con cases apilados y con `char`, do-while, arreglos 1D/2D (con `{0}`, `[]` e inicialización parcial, `#define MAX` como tamaño, `const int N` como tamaño, global), math (`sqrt pow fabs sin floor ceil exp log log10 cos tan atan fmod`), `abs`, casts, `char` aritmético, operadores compuestos, ternario numérico y anidado, formatos `%5d %-5d %05d %x %o %e %g %%`, `%ld %lld %u`, recursión, `static` local, `rand/srand/time`, `exit`, `INT_MAX`, `M_PI`, `fflush`, `getchar/putchar`, `isdigit/isalpha/toupper`, `stdbool.h`, estilo Allman, tabs, `\0 \t \'`, hex, sufijos `L f`, `1e3`, `unsigned`/`short`/`long double`, tildes en comentarios y textos (v58 OK), mezcla de funciones `void`/`return;`.

Falsos positivos reales: ver 1D (arreglos como parámetro, `sizeof` de arreglo, `?:` con textos, `unsigned char`, aviso falso de variable no inicializada con `||`).

---

## 3. Lista priorizada de qué agregar o corregir

Orden: gravedad × frecuencia en alumnos de 5to año. Los números de línea de `src/compiler.js` son aproximados (mirados el 2026-11-06; otro agente está editando el archivo): buscar por el texto indicado.

### P0 — Eliminar errores internos de JS (crash)

**3.1 `scanf` con menos variables que `%`** (casos 044, 304).
- Hoy: WARN en compilación y `error interno: Cannot read properties of undefined` al ejecutar.
- Cambiar a ERROR cuando faltan variables (cuando sobran, dejar aviso).
- Texto: `scanf pide leer 2 valores (hay 2 '%d') pero solo tiene 1 variable: falta una variable con '&' (por ejemplo scanf("%d %d", &a, &b);)`
- Dónde: `scanfCall`, justo donde dice `if (rest.length !== specs.length) this.warn('scanf lee ' …` (~l. 960). Usar `this.err` si `rest.length < specs.length`.
- Además en `runProgram` (runtime.js ~l. 352) reemplazar `error interno: …` por un texto genérico amable: `Error inesperado del editor (no es culpa de tu programa): <mensaje>. Avisale al profe.`

**3.2 `break` / `continue` fuera de un bucle o switch** (154, 155).
- Texto: `'break' solo se puede usar dentro de un for, while, do-while o switch` y `'continue' solo se puede usar dentro de un for, while o do-while`.
- Dónde: `stmt()` en Gen, `case 'break'` / `case 'continue'` (~l. 575). Mantener `this.loopDepth` y `this.switchDepth` incrementados en `while/do/for/switch`. O bien chequear en el parser (~l. 320).

**3.3 `default` repetido y `case` repetido / no constante** (149, 143, 145, 146, 148, 152).
- Textos:
  - `ya hay un 'default' en este switch (solo puede haber uno)`
  - `el valor 'case 1' está repetido en este switch`
  - `después de 'case' tiene que ir un número o un carácter fijo (por ejemplo case 3: o case 'a':), no una variable ni una cuenta`
  - `'case' necesita un valor entero: 1.5 no sirve`
- Dónde: Gen `case 'switch'` (~l. 577): llevar un `Set` de valores; evaluar `it.e` solo si es literal (`num`/`char`/unario `-` de literal) o macro numérica; si no, error. Comparar `ce.t` para rechazar float y `str`.

**3.4 Tamaño de arreglo ≤ 0** (090, 091).
- Convertir en error de compilación cuando la dimensión es una constante entera ≤ 0.
- Texto: `el tamaño del arreglo tiene que ser mayor que 0 (usaste -3)`
- Dónde: `declCode`, bucle de dimensiones (~l. 620-625); hoy solo se chequea `INTLIKE`. Si `v.dims[i].k === 'num'` (o unario menos de literal) y valor ≤ 0 → `this.err(…, v.line)`.

**3.5 Líneas en 0 o ausentes** (022, 108, 129; 121 y 258; 090/091).
- Los `err(…, 0)` de `val()`/`conv()` (~l. 660-665: "esa función no devuelve ningún valor", "no se puede usar un texto entre comillas como número"): propagar la línea del nodo (`this.curLine`, asignándola al entrar a `stmt()` y a cada `expr()`), y usarla como valor por defecto en vez de 0.
- Desbordamiento de pila en runtime (`runtime.js` ~l. 351): informar el nombre de la última función llamada. Texto: `la función 'f' se llama a sí misma sin parar (le falta el caso base, el 'if' que corta la recursión)`. Se puede llevar una pila liviana de nombres de función en las funciones generadas (`$cs`), o al menos detectar en compilación "función cuya primera sentencia es `return f(...)`/ cuerpo sin `if`" como aviso.

**3.6 `unsigned char` con signo** (340, v54).
- `typeSpec()` (~l. 175-192) devuelve `'char'` y descarta `uns`. Agregar tipo `'uchar'` (wrap & 255) o, mínimo, error explícito: `unsigned char todavía no está soportado; usá int`.

### P1 — Avisos que gcc da y el profe espera ver (muy frecuentes)

**3.7 Falta `#include <stdio.h>` / `<math.h>`** (131, 132) y encabezado inexistente (133, 137, 214).
- `includes` ya se junta en el lexer (`else if (dir === 'include') includes.push(arg)`, ~l. 66) pero no se usa en Gen.
- Textos (aviso, no error, para no trabar; o error si el profe lo prefiere):
  - `usás printf pero falta #include <stdio.h> al principio del programa`
  - `usás sqrt pero falta #include <math.h> al principio del programa`
  - `no existe la biblioteca <studio.h>: ¿quisiste escribir <stdio.h>?`
  - `<conio.h> no está disponible acá; para esperar una tecla usá scanf o getchar`
  - `'# comentario' no es un comentario en C: los comentarios empiezan con // o /* */`
- Dónde: conjunto `MATH_FNS` (sqrt, pow, fabs, sin, cos, tan, exp, log, log10, floor, ceil, fmod, atan…) y `STDIO_FNS` (printf, scanf, getchar, putchar, puts); al resolver la llamada en `callExpr` (~l. 860-900) llamar `this.needInclude('math.h', name, line)` que avise una sola vez por encabezado. Lista blanca de encabezados válidos: stdio, math, stdlib, string, ctype, time, limits, stdbool.

**3.8 Función `int/float` sin `return` en algún camino** (110, 111).
- Texto: `la función 'signo' puede terminar sin ejecutar 'return' (si x vale 0 no devuelve nada): en C devuelve un valor basura. Agregá un return al final.`
- Dónde: `funcCode` (~l. 523-531). Función auxiliar `alwaysReturns(stmt)`: `return` → true; `block` → algún elemento true; `if` con `else` → ambas ramas; `while(1)`/`for(;;)` sin break → true; `switch` con default y todas las ramas retornan → true. Si `ret !== 'void'`, `f.name !== 'main'` y no `alwaysReturns(body)`, `this.warn(…, linea del cierre de la función)` (guardar `endLine` en el nodo func en el parser).

**3.9 Función usada antes de su definición sin prototipo** (101).
- Texto: `'doble' se usa antes de estar definida: falta el prototipo arriba de main (por ejemplo: int doble(int x);)`
- Dónde: `run()` paso 1 (~l. 481-487): al armar `this.funcs`, guardar `order` (índice del item) y `hasProto` (si hubo `proto` antes de la definición). En el call site (~l. 897, donde `const f = this.funcs.get(name)`), si `f.node && !f.hasProto && f.node.line > n.line` (la definición viene después), avisar. Línea = la de la llamada.

**3.10 Prototipo que no coincide con la definición** (114, 337).
- Texto: `el prototipo de 'f' (línea 2) dice 2 parámetros y la definición (línea 3) tiene 1` / `el prototipo de 'f' devuelve float pero la definición devuelve int`.
- Dónde: `run()` paso 1, rama `prev && prev.node` es falsa pero `prev` viene de `proto`: comparar `ret`, `params.length` y tipos; error en la línea de la definición.

**3.11 `switch` sin `break`** (142).
- Texto: `este 'case' sigue con el siguiente porque falta un 'break;' (en C no se corta solo)`
- Dónde: Gen `case 'switch'` (~l. 577). Al pasar de un grupo `case` al siguiente, si el grupo anterior tiene sentencias y su último elemento no es `break/return/continue/exit()`, avisar en la línea del último statement. Los `case 2: case 3:` apilados NO avisan (grupo vacío).

**3.12 Bucle infinito** (156, 158, 159, 161, 162, 007).
- Heurística de compilación (aviso, nunca error): `while`/`do-while`/`for` cuya condición usa variables que ninguna sentencia del cuerpo (ni del paso del `for`) modifica, sin `break`, `return`, `exit`, `scanf` ni `getchar` en el cuerpo, y sin llamadas a funciones que reciban esas variables. Excluir `while(1)`/`for(;;)` si el cuerpo contiene `break` o `return`.
  - Texto: `en este while ninguna variable de la condición (i) cambia dentro del bucle: es probable que nunca termine`
  - `while (1) sin 'break' ni 'return' adentro: el bucle no termina nunca`
- Runtime: si la ejecución lleva más de ~3 s sin leer entrada, mostrar debajo de la salida: `El programa sigue ejecutándose. Si no esperabas eso, puede haber un bucle infinito: apretá Detener y revisá la condición del bucle.` (hoy solo hay un tope de salida: app.js ~l. 335).
- Dónde: Gen `case 'while'` / `'for'` / `'do'` (~l. 590-605), junto a `checkEmptyBody`.

**3.13 `if (…);` y `else;`** (005, 311).
- Hoy `checkEmptyBody` se llama solo para `while` y `for`. Llamarlo también desde `case 'if'` (cuerpo `s.a`) y para `s.b` de `else` con `s.b.k === 'empty'`.
- Texto: `el if termina en ';' y su cuerpo queda vacío: lo que sigue se ejecuta siempre. ¿Sobra ese ';'?`

**3.14 Sentencia sin efecto: `a == 5;`, `a + 1;`, `x;`** (030, 226).
- Texto: `esta sentencia no hace nada: compara pero no guarda el resultado. ¿Querías asignar con '=' ?` (para `==`) / `esta cuenta no se guarda en ninguna variable` (para el resto).
- Dónde: Gen `case 'expr'` (~l. 540). Si `s.e.k` es `bin`/`un`/`id`/`num` (no `assign`, `call`, `inc/dec`) → warn.

**3.15 `&` por `&&`, `|` por `||`, y `0 < a < 3`** (177, 178).
- Textos: `usaste '&' (operación de bits); para "y" lógico se escribe '&&'` / `0 < a < 3 no comprueba un rango: C evalúa primero (0 < a) que da 0 o 1. Escribilo así: 0 < a && a < 3`
- Dónde: Gen binario (~l. 796-830): si op es `&`/`|` y ambos operandos son comparaciones (`bin` con op relacional) → aviso; si op relacional y el operando izquierdo es otra comparación relacional → aviso.

**3.16 Comparar `float`/`double` con `==` entre variables** (167).
- Hoy el aviso solo sale si un literal tiene parte decimal (~l. 802, `frac(ln)||frac(rn)`). Extenderlo: avisar si **cualquiera** de los dos operandos es de tipo `float`/`double` y el otro no es un entero constante (excluir `x == 0` y `x == 2` con literal entero). Mantener el texto actual.

**3.17 `^` y `**` como potencia** (248, 249).
- Textos: `en C, '^' no es potencia (es XOR de bits): 2 ^ 3 da 1. Usá pow(2, 3) de <math.h>` y `en C no existe '**': usá pow(2, 3) de <math.h>`.
- Dónde: Gen binario para `^` con operandos int (aviso), y en el parser (`unary`, donde hoy dice "los punteros todavía no están soportados") detectar `*` seguido de `*` en posición binaria: mensaje de arriba.

### P2 — Mensajes engañosos de sintaxis (frecuentes)

**3.18 Tipo mal escrito o desconocido** (199 `Int`, 200 `string`, 202 `flaot`, 201 `bool`).
- Texto: `'Int' no es un tipo de C: ¿quisiste escribir 'int'? (C distingue mayúsculas y minúsculas)` / `'flaot' no es un tipo: ¿float?` / `en C no existe 'string'; para un carácter usá char (los textos completos todavía no están soportados en este editor)`.
- Dónde: parser, sentencia expresión (~l. 433, `const e = this.expr(); this.expect(';')`): antes de llamar `expr()`, si `peek()` es `id` que no es palabra clave ni variable/función conocida **y** `peek(1)` es `id` (patrón `Tipo nombre`), lanzar este error. Sugerencia por distancia de edición ≤ 2 contra `int float double char void long short unsigned`.

**3.19 `elseif`, `elif`, `else (cond)`, `then`** (171, 172, 173, 175).
- Textos: `'elseif' no existe en C: se escribe 'else if (condición)'`, `'elif' es de Python: en C se escribe 'else if'`, `después de 'else' no va una condición: si querías otra condición escribí 'else if (…)'`, `en C el if no lleva 'then': el cuerpo va entre llaves { }`.
- Dónde: `expect(';')` (~l. 156): si `found` es `{` y el token anterior es un `id` de la lista (`elseif`, `elif`, `then`, `endif`) o está dentro de `else (`…; más simple: en `stmt()` expresión-sentencia, si el primer token es uno de esos ids → lanzar el mensaje específico.

**3.20 Operadores de otro lenguaje** (176 `and/or/not`, 179 `<>`, 180 `=>`, 306 `=+`).
- Textos: `en C la "y" lógica es '&&', la "o" es '||' y el "no" es '!'`; `en C "distinto" se escribe '!='`; `"mayor o igual" se escribe '>=', no '=>'`.
- Dónde: `primary()` cuando el id es `and/or/not` y aparece donde se esperaba un operador (~l. 425-431); y en el binario cuando aparece `>` sin operando izquierdo tras `<` o `=` (~l. 434, "falta una expresión antes de").

**3.21 Número decimal con coma / identificador con espacio o guion** (216, 186, 187, 244).
- `float x = 2,5;` →  `en C los decimales llevan punto, no coma: 2.5`. Dónde: `ident()` (~l. 161) cuando el token inesperado es un número y el anterior era un número en una declaración con `=`.
- Para espacios/guiones: `los nombres de variables no pueden llevar espacios ni guiones: usá mi_var`.

**3.22 `2 ** 3`, `5++`, `int int`, `int float`** (249, 198, 181, 183).
- `5++`: `'++' solo se puede aplicar a una variable` (hoy dice "a la izquierda del = …").
- `int int = 5;`: `'int' es una palabra reservada, no puede usarse como nombre` (ya existe para `for`; el camino de `int` falla porque `typeSpec` consume los dos tipos). Ajustar `typeSpec`/declaración: si después del tipo viene otro `TYPE_KW`, usar el mismo mensaje de `ident()`.

**3.23 Código suelto fuera de funciones** (130) y `int main();` (330), `int main {` (124), función dentro de función (115), falta `}` antes de otra función (329).
- `printf("hola");` en global → `esta instrucción está fuera de una función: va adentro de main() { … }`.
- 330 → `no va ';' después de main() cuando empieza el cuerpo`.
- 124 → `a main le faltan los paréntesis: int main() {`.
- 115 → `no se pueden definir funciones dentro de otra: sacá 'f' fuera de main (con su prototipo arriba)`.
- 329 → al encontrar `tipo nombre (` con `{` abierto dentro de una función: `falta cerrar la llave '}' de la función 'f' (abierta en la línea 2) antes de empezar 'main'`.
- Dónde: parser `program()` (~l. 200-206) y el statement loop; en `stmt()` cuando se ve `TYPE_KW id (` dentro de bloque.

**3.24 Faltan comillas en el texto de printf** (020).
- `printf(Hola mundo\n);` → `al texto de printf le faltan las comillas: printf("Hola mundo\n");`. Dónde: lexer, `carácter no válido '\'` (~l. 200+): si `\` aparece fuera de string, ese texto.

**3.25 Nombre mal escrito: sugerencia** (060, 061, 203, 204, 205, 206).
- `'total' no está declarada. ¿quisiste decir 'Total'? (C distingue mayúsculas y minúsculas)`; para funciones conocidas: `'Printf' no existe: ¿printf? (en C va todo en minúscula)`. Calcular por comparación insensible a mayúsculas y distancia de edición ≤ 2 sobre variables en alcance + funciones de biblioteca. Dónde: los dos `this.err("'" + n.name + "' no está declarada…` (~l. 733 y 743) y `la función '…' no está declarada` (~l. 897).
- Evitar el 2.º error en cascada en 204 ("el operador '&' solo se usa dentro de scanf") y 205 (cout): no emitir errores secundarios sobre la misma sentencia cuando el nombre de la función no existe.

### P3 — Falsos positivos a corregir (código válido rechazado o avisado)

**3.26 Arreglos como parámetro** (v21, w15, w16, 120, 242): aceptar `int v[]`, `int v[5]`, `int m[][3]` y pasarlos por referencia (el arreglo ya es un objeto JS). Es la limitación con más impacto en una materia con funciones + arreglos. Hoy: `compiler.js` ~l. 227 (`if (this.isOp('[')) throw …`). Mientras tanto, mejorar el mensaje: `los arreglos como parámetro todavía no están soportados: pasá el arreglo global o cada elemento`.

**3.27 `sizeof` de un arreglo** (w31): permitir `sizeof(v)` (n * tamaño del tipo) y `sizeof(v[0])`; ~l. 719.

**3.28 `?:` con textos dentro de printf** (v28): aceptar `cond ? "a" : "b"` cuando es argumento directo de printf con `%s`; ~l. 704.

**3.29 Aviso falso de "sin inicializar" con cortocircuito** (w48): no avisar por lecturas que están en el operando derecho de `||` / `&&` / rama de `?:` (patrón `i == 0 || x > mayor`). En `val()` de `id` (~l. 737) pasar un flag `this.inShortCircuit` mientras se evalúa `n.r` de `&&`/`||`; si está en true, no marcar `warned`.

**3.30 Texto/`char[]` en una sola línea de error** (207, 208, w19, 211, 138): hoy 2-4 mensajes en cascada. Detectar en la declaración (`char nombre[10]`, `char s[] = "…"`) y emitir UN solo error: `los textos (char[]) todavía no están soportados en este editor; trabajá con un char por vez`. Suprimir los demás.

### P4 — Ruido y calidad de los mensajes

**3.31 Deduplicar y suprimir ruido**
- Errores de "no declarada" repetidos por cada uso (062/063/`extra/dos_undecl.c`): informar solo la primera vez por nombre (`this.undeclared` Set); donde hoy está `this.err("'" + n.name + "' no está declarada …` (~l. 733/743).
- No emitir WARN de "sin inicializar" sobre una variable que ya generó ERR de declaración/scanf (069, 033-035), ni WARN de printf cuando la expresión ya tiene ERR (084, 141). Opción simple: si `errors.length > 0`, filtrar todos los warnings de la misma línea.

**3.32 Avisos opcionales de baja prioridad**: `scanf("%d, %d")`, `scanf("texto %d")`, `scanf("%d\n")` (041-043: `scanf solo lleva los % del dato que se lee: ni texto ni coma ni \n (el texto va en un printf antes)`); `%.2f` en scanf (333: `scanf no lleva decimales; usá "%f"`); `printf("100%")` (303: `para mostrar el símbolo % escribí %%`); `%ld` con int (058); `int r = sqrt(17)` / `pow` guardado en int (313, 314: `se pierde la parte decimal; usá double`); arreglo con más valores que su tamaño (095: `el arreglo v tiene 3 posiciones pero le diste 5 valores`); `x =+ 1` (306: `'=+' asigna +1; para sumar es '+='`); función y variable global con el mismo nombre (320); uso de `bool` sin `<stdbool.h>` (201); cuando falta el `;` doble `;;` (008) no hace falta aviso.

---

## 4. Las 15 conclusiones más importantes

Ver mensaje de entrega (se repiten abajo para quedar en el informe).

1. 9 programas disparan "error interno" de JS o un mensaje sin número de línea (scanf con menos variables, `break`/`continue` fuera de bucle, `default` repetido, arreglo de tamaño ≤ 0, desbordamiento de pila). Es lo primero a arreglar.
2. `scanf("%d %d", &a)` (falta una variable) pasa la compilación con un WARN y explota recién al ejecutar con `Cannot read properties of undefined`: debe ser ERR en compilación.
3. Falta el aviso de `#include <stdio.h>`/`<math.h>` ausente: el editor ejecuta igual. gcc lo marca y el profe lo pide. Los `#include` ya se recolectan en el lexer pero nadie los usa.
4. Falta el aviso de función usada antes de definir sin prototipo (el editor junta todas las firmas primero); y falta el error cuando el prototipo no coincide con la definición.
5. Una función `int` sin `return` (o con `return` solo dentro de `if`) devuelve 0 en silencio; gcc avisa y en C real devuelve basura. Falta aviso.
6. `switch` sin `break` no avisa; `case` repetido, `case` con variable/float/texto y `default` repetido no dan error.
7. `if (cond);` no avisa (sí lo hacen `for` y `while`); `a == 5;` y `a + 1;` como sentencia tampoco; `&` por `&&` y `0 < a < 3` pasan callados.
8. Bucles infinitos (`while (i<5)` sin tocar `i`, `while(1){}`, `for(;;)`, `x != 1.0` con paso 0.1) corren para siempre sin ningún mensaje: conviene un aviso estático de "ninguna variable de la condición cambia" y un cartel tras unos segundos.
9. Comparar floats con `==` solo avisa contra literales decimales; `if (a == b)` con dos variables float/double no avisa.
10. Tipos mal escritos (`Int`, `string`, `flaot`) y `elseif/elif/then/else (cond)` dan "falta un ';' …", que desorienta; `2 ** 3` dice "los punteros no están soportados". Conviene mensajes específicos.
11. Falsos positivos de código válido: arreglos como parámetro de función (`int v[]`), `sizeof(v)/sizeof(v[0])`, `?:` con textos en printf, `char s[] = "hola"`/`%s`. El primero es el más grave para la materia.
12. `unsigned char c = 200` imprime -56 (se trata como `char` con signo): resultado incorrecto.
13. Aviso falso de "se usa antes de darle un valor" en `if (i == 0 || x > mayor) mayor = x;` (idioma máximo/mínimo muy común).
14. Ruido en cascada: un solo error (variable sin declarar, `scanf` sin `&`, `Scanf`, `char nombre[10]`) genera 2-4 mensajes y un WARN espurio; el mismo error "no declarada" se repite en cada uso. Deduplicar y suprimir warnings cuando ya hay ERR.
15. Lo que ya está muy bien y no hay que tocar: `;` faltante (línea correcta), llaves/paréntesis/comillas, `&` en scanf, formatos de printf/scanf contra el tipo, no declarada / doble declaración, `=` en condición, división por cero e índice fuera de rango en ejecución con línea, argumentos de más/menos, `void` como valor, const, `else` sin `if`, división entera guardada en float (aviso excelente).
