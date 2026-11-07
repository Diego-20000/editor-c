# Casos de la base que el editor todavía NO detecta (LOG, TIP y OPE) y por qué

Regla de oro del entrenador: **ningún falso positivo**. Un aviso que molesta a un alumno que tiene razón es peor que un aviso que falta. Estos casos se dejaron sin regla porque no se puede cumplir esa condición con reglas fijas (los controles son: el `codigo_bien` de todos los casos, `test/cases`, los programas de la materia de `Diego-20000/brizuela` y los programas «bien escritos» de `test/diag/ok_materia_*.c`).

## Sin implementar

| Caso | Nombre | Motivo |
|---|---|---|
| LOG-021 | Extremos del rango en orden inverso | Depende del enunciado (si garantiza LI < LS no hay error). Avisaría en todo `for` con `N = LS - LI + 1`. |
| LOG-026 | Promedio de positivos sin controlar que haya alguno | **Falso positivo comprobado.** Las soluciones de la materia (`Ej20A_prom_pos_neg_no_nulos`, `EvalU3_T1/T2/T3`, y los `test/cases/mat_u4_*`) hacen `PROMP = AP / CP` sin controlar `CP`, porque el enunciado garantiza datos. La regla avisaba en 20 programas correctos del profesor. |
| LOG-030 | Máximo inicializado en 0 con datos negativos | `MAYOR = 0` es correcto con datos positivos (edades, notas, cantidades). Sin el enunciado avisaría en programas correctos. (Su gemelo LOG-029, mínimo en 0, sí está: con datos positivos el resultado siempre es 0.) |
| LOG-031 | Mostrar el total dentro del lazo | Un total parcial mostrado a propósito («suma acumulada») es válido y no se distingue del error sin el enunciado. |
| LOG-043 | Corte con `> 0` en vez de `!= 0` | Hay muchos lazos legítimos que cortan con `> 0`; solo se podría avisar leyendo el enunciado («termina con 0»). |
| LOG-044 | Corte por contadores con `\|\|` en lugar de `&&` | Depende del enunciado: un lazo que necesita que se cumplan los dos cortes lleva `\|\|`. |
| LOG-048 | Multiplicación por sumas con multiplicador negativo | Avisaría en todo `for (i = 0; i < N; ...)` con N leído por `scanf`. |
| TIP-011 | `char` como acumulador | Sin saber cuántas vueltas ni qué valores, `C = C + 1` (abecedario) o `+ 32` son correctos. Haría falta ejecutar. |
| TIP-013 | `int` mostrado con `%c` | Es legítimo en las tablas ASCII: `for (I = 65; I <= 90; I++) printf("%c", I);`. |
| TIP-014 | Leer un número con `%c` | Leer un carácter y mostrar su código con `%d` es legítimo (ejercicios de código ASCII); no se distingue la intención. |
| TIP-020 | Resta de `unsigned` que da un número gigante | Necesita conocer los valores (ejecución o seguimiento de constantes entre instrucciones). |
| OPE-007 | `++` que no se ejecuta por cortocircuito | Es un modismo válido (`i < N && A[i++] > 0`); solo se podría avisar conociendo el valor del lado izquierdo. |
| OPE-018 | `i` y `i++` en el mismo `printf` | La regla estaba hecha, pero se retiró: avisa en dos programas de `test/cases` (`tp_B05_orden_evaluacion.c`, `rev_r23_scanf_orden.c`) que usan a propósito ese comportamiento indefinido para comparar el orden de evaluación con gcc. Si se decide que esos dos tests pueden tener el aviso, se puede volver a poner. |
| OPE-045 | `A / B * C` | `A / B * 100` es justamente la fórmula correcta de porcentaje; es indistinguible sin el enunciado. |

## Reglas implementadas con alcance reducido (a propósito)

Para no avisar sin razón, estas reglas solo se disparan en el patrón exacto del caso:

- **TIP-018** (decimal a `int`): solo si el decimal es una variable leída con `scanf` y se asigna tal cual (`R = X;`). No avisa con valores fijos (`float T = 36.6; int E = T;`), ni con `(int)`, ni con `pow`/`sqrt`.
- **TIP-012** (`char` con `%d`): solo si la variable recibió una letra entre comillas simples y en ningún `printf` se muestra con `%c`; no avisa si el texto habla de «código», «ASCII», «número» o «valor».
- **TIP-030** (dígito como número): solo `char C = '5'` copiado a un `int` que después entra en una cuenta.
- **TIP-004/005/006/007** (división entera dentro de una fórmula decimal): el caso `x = a / b` completo ya lo avisaba `W-division-entera`; la regla nueva cubre la división metida dentro de la cuenta. No avisa si la división es exacta entre dos constantes (`6 / 3`).
- **LOG-007, LOG-029, OPE-042** usan el nombre de la variable (`MAYOR`/`MAX`, `MENOR`/`MIN`), como pide el caso.
- **LOG-002 / OPE-013** solo con variables llamadas `PROM…` o `MEDIA…`; **LOG-036** solo con contadores `C`, `C1…`, `CP`, `CN`, `CC`, `CI`, `CONT…`.
- **LOG-014, LOG-015, OPE-037, LOG-019, LOG-020** solo si algún texto del `printf` lo confirma («múltiplo», «par», «divisible», «incluidos», «sin contar»…).
- **LOG-032** solo si la instrucción siguiente está en la misma línea que el cuerpo del `if` y el `if` no está escrito todo en una línea (`if (c) a(); b();` dentro de `{ }` de una sola línea no avisa); no cuenta `return`/`break`/`continue`.
- **LOG-022** no avisa si antes del lazo se leyó otro dato que no sea el límite (patrón «leer el primero y después de 1 a N-1»).
- **LOG-053** solo con `i++`, `i--`, `i += k`, `i = i ± x` como instrucción directa del cuerpo del `for`.
- **OPE-026** solo si lo que descarta la coma no tiene efecto (`if (A > 5, B > 5)`), no con `while (scanf(...), x)`.
- **OPE-043** no avisa si la expresión no tiene variables (`3 > 2 && 2 > 1 || 0` en `test/cases/arith.c`).

## Casos gemelos

Un diagnóstico lleva un solo `kb`; si otro caso de la base es el mismo error, va en `kbAlt`: LOG-002 (OPE-013), LOG-018 (OPE-034, CTL-033), LOG-010 (CTL-006), OPE-043 (CTL-036), OPE-011 (CTL-037), LOG-024 (CTL-044, DEC-020), LOG-053 (CTL-046), TIP-021 (EJE-020), TIP-012 (PRF-005), LOG-005 (PRF-026), LOG-006 (SCN-028) y TIP-005 (LOG-052). Los casos de otras categorías de esa lista (CTL, DEC, EJE, PRF, SCN) ahora los detecta el editor: falta correr `node tools/kb-validar.js kb/errores/XXX.json --arreglar` en esos archivos.
