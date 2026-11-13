# Qué significa «igual que gcc»

**Contrato.** Para los programas del subconjunto documentado, que usan solo comportamiento definido por C y se ejecutan en el objetivo de referencia, Editor C produce la misma salida estándar y el mismo código de salida. Lo que no está soportado se informa como error; nunca se simula en silencio.

## Objetivo de referencia
- Linux x86-64, gcc 13 (`-std=gnu99`), glibc.
- Modelo LP64: `char` 8 bits con signo, `short` 16, `int` 32, `long` y `long long` 64 (BigInt), versiones `unsigned` de cada uno, `float` binary32, `double` binary64, `bool` de `<stdbool.h>`.
- `printf`/`scanf`, `rand`/`srand` y `ctype.h` imitan a glibc (valores de retorno incluidos).
- **Qué es error y qué es aviso** sigue a Programiz (comprobado el 10/11/2026 con 20 programas de errores comunes), que usa un gcc más nuevo y estricto que el 13: son **error** (no se ejecuta) escribir `main()` sin `int`, usar `printf`/`scanf`/otras funciones o constantes sin su `#include`, y llamar a una función antes de definirla sin prototipo. Con gcc 13 esos casos solo dan aviso.
- Diferencias conocidas con Programiz, a propósito: `scanf("%d", A)` (sin `&`) es error en el editor y en Programiz compila y se rompe al ejecutar; un `;` que falta se marca en su línea y gcc lo marca en la línea de abajo; una función mal escrita se marca solo la primera vez, como gcc.

## Subconjunto soportado
Ver la sección «Qué soporta» del README. Textos: `char[]`, `char *` inicializado con un texto o con otro arreglo, arreglos de textos (`char n[3][20]`, `char *n[]`), `%s` y `%[...]` en `printf`/`scanf`, `fgets`/`gets`, `sprintf`/`snprintf`, `strlen`, `strcpy`, `strncpy`, `strcat`, `strncat`, `strcmp`, `strncmp`, `atoi`, `atol`, `atof`; los textos son bytes UTF-8 como en gcc. Todavía no: punteros en general (aritmética de punteros, `&x`, `malloc`), `strchr`/`strstr`/`strtok` y otras funciones que devuelven punteros, funciones que devuelven `char *`, `sscanf`, `struct`, `union`, `enum`, `typedef`, archivos.

## Comportamiento indefinido
Estos casos no tienen resultado garantizado en C, así que el editor no promete coincidir con gcc:
- desbordamiento de `int` con signo (el editor lo hace dar la vuelta, como gcc sin optimizar);
- conversión de un decimal fuera de rango a entero (gcc da distinto según optimice o no);
- leer una variable local sin inicializar (el editor la inicia en 0 y avisa);
- orden de evaluación de los argumentos de una llamada (gcc evalúa de derecha a izquierda; el editor lo imita cuando hay efectos, pero no está garantizado por el estándar);
- índices fuera de un arreglo (el editor se detiene con un error y el número de línea);
- el signo de un cero o de un NaN en cadenas largas de operaciones decimales: el editor imprime `-nan` para `0/0`, `sqrt(-1)` y similares, y `nan` para `NAN`, `atof("nan")` y `scanf` de `nan` (también al negar, `fabs`, `fmax`/`fmin`), como gcc; el signo se sigue con una marca interna que el navegador puede no conservar en cuentas raras.

## Límites propios del editor
- Los textos y la entrada son **bytes UTF-8**, como en glibc: `strlen`, los anchos de `%s`, `%c`, `getchar`, `fgets` y `%[...]` cuentan bytes, y lo que se imprime de a un byte (`%c`, `putchar`) se junta como UTF-8 (dos llamadas con los bytes de una `é` muestran una `é`). Lo único que no se reproduce igual: una secuencia UTF-8 incompleta o inválida (por ejemplo cortar una `é` por la mitad con un ancho) se muestra como «�» en lugar de imprimir el byte suelto, porque la salida del editor es texto.
- Arreglos de hasta 20 millones de elementos; ancho y precisión de formato hasta 100000.
- La recursión se corta antes que en gcc (el límite depende del navegador).
- `%e`/`%g` con 15 o más cifras cerca de potencias de 10 y funciones de `math.h` pueden diferir en 1 ulp de glibc.

## Cómo se comprueba
- `bash test/run_all.sh`: compara contra gcc la salida y el código de salida de cada programa de `test/cases`.
- `bash test/fuzz_run.sh [N] [EXPRESIONES]`: genera programas aleatorios y los compara contra gcc. Puede marcar casos de comportamiento indefinido (ver arriba).
