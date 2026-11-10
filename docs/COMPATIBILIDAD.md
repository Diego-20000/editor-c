# Qué significa «igual que gcc»

**Contrato.** Para los programas del subconjunto documentado, que usan solo comportamiento definido por C y se ejecutan en el objetivo de referencia, Editor C produce la misma salida estándar y el mismo código de salida. Lo que no está soportado se informa como error; nunca se simula en silencio.

## Objetivo de referencia
- Linux x86-64, gcc 13 (`-std=gnu99`), glibc.
- Modelo LP64: `char` 8 bits con signo, `short` 16, `int` 32, `long` y `long long` 64 (BigInt), versiones `unsigned` de cada uno, `float` binary32, `double` binary64, `bool` de `<stdbool.h>`.
- `printf`/`scanf`, `rand`/`srand` y `ctype.h` imitan a glibc (valores de retorno incluidos).

## Subconjunto soportado
Ver la sección «Qué soporta» del README. Textos: `char[]`, `char *` inicializado con un texto o con otro arreglo, arreglos de textos (`char n[3][20]`, `char *n[]`), `%s` y `%[...]` en `printf`/`scanf`, `fgets`/`gets`, `sprintf`/`snprintf`, `strlen`, `strcpy`, `strncpy`, `strcat`, `strncat`, `strcmp`, `strncmp`, `atoi`, `atol`, `atof`; los textos son bytes UTF-8 como en gcc. Todavía no: punteros en general (aritmética de punteros, `&x`, `malloc`), `strchr`/`strstr`/`strtok` y otras funciones que devuelven punteros, funciones que devuelven `char *`, `sscanf`, `struct`, `union`, `enum`, `typedef`, archivos.

## Comportamiento indefinido
Estos casos no tienen resultado garantizado en C, así que el editor no promete coincidir con gcc:
- desbordamiento de `int` con signo (el editor lo hace dar la vuelta, como gcc sin optimizar);
- conversión de un decimal fuera de rango a entero (gcc da distinto según optimice o no);
- leer una variable local sin inicializar (el editor la inicia en 0 y avisa);
- orden de evaluación de los argumentos de una llamada (gcc evalúa de derecha a izquierda; el editor lo imita cuando hay efectos, pero no está garantizado por el estándar);
- índices fuera de un arreglo (el editor se detiene con un error y el número de línea);
- el signo de un cero o de un NaN en cuentas decimales extremas (por ejemplo negar un NaN o dividir por un cero con signo): el editor imprime `-nan` para el `0/0` típico como gcc, pero no sigue el signo en cadenas largas de operaciones. Lo encontró la prueba con programas aleatorios (`test/fuzz_run.sh`), que ya no genera esos casos.

## Límites propios del editor
- La entrada estándar se recorre como texto (unidades UTF-16 de JavaScript) y no como bytes UTF-8: con letras acentuadas, `ñ` o emoji, los anchos de `%s` y `%c` y el límite de `fgets` pueden contar distinto que glibc. Con texto ASCII coincide. (Detectado por la revisión de ChatGPT; falta decidir si se implementa.)
- Arreglos de hasta 20 millones de elementos; ancho y precisión de formato hasta 100000.
- La recursión se corta antes que en gcc (el límite depende del navegador).
- `%e`/`%g` con 15 o más cifras cerca de potencias de 10 y funciones de `math.h` pueden diferir en 1 ulp de glibc.

## Cómo se comprueba
- `bash test/run_all.sh`: compara contra gcc la salida y el código de salida de cada programa de `test/cases`.
- `bash test/fuzz_run.sh [N] [EXPRESIONES]`: genera programas aleatorios y los compara contra gcc. Puede marcar casos de comportamiento indefinido (ver arriba).
