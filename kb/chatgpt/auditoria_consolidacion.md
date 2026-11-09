# Auditoría de consolidación — Base de conocimiento de C

## Estado real de la entrega

Los archivos contienen 50 errores de la categoría 1 (Sintaxis y escritura), 153 ayudas contextuales y 35 mini-lecciones. La Parte 1 no está completa: faltan al menos 250 registros para alcanzar el mínimo de 300 y todavía no hay registros entregados para las categorías 2 a 14. No se declara que el catálogo de errores esté terminado.

## Validación técnica

- JSON parseado correctamente: errores.json (50), ayuda.json (153), lecciones.json (35).
- Numeración de errores: 1 a 50, consecutiva y sin repetidos.
- Elementos de ayuda únicos: 153.
- Mini-lecciones: 35; cada explicación tiene cinco líneas y todos los ejemplos compilan.
- GCC usado: gcc (Debian 14.2.0-19) 14.2.0.
- Comando: `gcc -std=gnu99 -Wall -Wextra archivo.c -o programa` (para las lecciones matemáticas se añadió `-lm`).
- Todos los 50 pares codigo_mal/codigo_bien se compilaron. `verificado_gcc: true` significa que GCC produjo el diagnóstico esperado —o se confirmó que no avisa para reglas heurísticas/editor-específicas— y que codigo_bien compila; no significa que GCC detecte todas las sospechas.
- La documentación del editor toma GCC 13 como referencia; aquí se dispone de GCC 14.2. El texto de los diagnósticos puede variar entre versiones.

## Limpieza y fusiones

- Se fusionaron los dos ejemplos repetidos de paréntesis de cierre faltante en llamadas (la tanda previa tenía dos registros equivalentes); queda un solo registro n=7.
- Se fusionaron las variantes de cadena no terminada (salto de línea dentro de la cadena y falta de comilla final) en n=42.
- Se mantuvieron separados los casos de comillas tipográficas dobles y simples porque afectan literales distintos.
- Se agregó `reemplaza_al_catalogo` para indicar qué mensajes de CATALOGO.md se mejoran o sustituyen.

## Tabla resumen de errores.json

| n | categoria | nombre_corto | frecuencia | deteccion | nivel |
|---:|---|---|---|---|---|
| 1 | Sintaxis y escritura | Declaración sin punto y coma | muy alta (suposición) | estatica | error |
| 2 | Sintaxis y escritura | Asignación sin punto y coma | muy alta (suposición) | estatica | error |
| 3 | Sintaxis y escritura | Return sin punto y coma | alta (suposición) | estatica | error |
| 4 | Sintaxis y escritura | Punto y coma después de if | alta (suposición) | heuristica | aviso |
| 5 | Sintaxis y escritura | For con cuerpo vacío | media (suposición) | heuristica | aviso |
| 6 | Sintaxis y escritura | Paréntesis faltante en if | alta (suposición) | estatica | error |
| 7 | Sintaxis y escritura | Llamada sin cerrar paréntesis | alta (suposición) | estatica | error |
| 8 | Sintaxis y escritura | Llave de bloque sin cerrar | alta (suposición) | estatica | error |
| 9 | Sintaxis y escritura | Llave de cierre sobrante | media (suposición) | estatica | error |
| 10 | Sintaxis y escritura | Corchete de arreglo sin cerrar | media (suposición) | estatica | error |
| 11 | Sintaxis y escritura | Comillas dobles tipográficas | media (suposición) | estatica | error |
| 12 | Sintaxis y escritura | Comillas simples tipográficas | baja (suposición) | estatica | error |
| 13 | Sintaxis y escritura | Comilla simple sin cerrar | media (suposición) | estatica | error |
| 14 | Sintaxis y escritura | Comentario de bloque sin cerrar | media (suposición) | estatica | error |
| 15 | Sintaxis y escritura | Palabra then en if | media (suposición) | heuristica | error |
| 16 | Sintaxis y escritura | Palabra elif en condicional | media (suposición) | estatica | error |
| 17 | Sintaxis y escritura | Operador distinto escrito <> | media (suposición) | estatica | error |
| 18 | Sintaxis y escritura | Operador mayor igual invertido | media (suposición) | estatica | error |
| 19 | Sintaxis y escritura | Palabra and en condición | media (suposición) | estatica | error |
| 20 | Sintaxis y escritura | print en lugar de printf | alta (suposición) | heuristica | error |
| 21 | Sintaxis y escritura | cout en programa C | media (suposición) | estatica | error |
| 22 | Sintaxis y escritura | Tipo Int con mayúscula | alta (suposición) | estatica | error |
| 23 | Sintaxis y escritura | Tipo float mal escrito | media (suposición) | heuristica | error |
| 24 | Sintaxis y escritura | Sufijo f en entero | baja (suposición) | estatica | error |
| 25 | Sintaxis y escritura | Punto y coma Unicode | baja (suposición) | estatica | error |
| 26 | Sintaxis y escritura | main sin paréntesis | alta (suposición) | estatica | error |
| 27 | Sintaxis y escritura | If sin paréntesis | alta (suposición) | estatica | error |
| 28 | Sintaxis y escritura | Paréntesis de cierre sobrante | media (suposición) | estatica | error |
| 29 | Sintaxis y escritura | Asignación sin valor | media (suposición) | estatica | error |
| 30 | Sintaxis y escritura | Operador sin operando izquierdo | media (suposición) | estatica | error |
| 31 | Sintaxis y escritura | Coma final en argumentos | baja (suposición) | estatica | error |
| 32 | Sintaxis y escritura | For sin separador | media (suposición) | estatica | error |
| 33 | Sintaxis y escritura | Do while sin punto y coma | baja (suposición) | estatica | error |
| 34 | Sintaxis y escritura | Case sin dos puntos | baja (suposición) | estatica | error |
| 35 | Sintaxis y escritura | Default sin dos puntos | baja (suposición) | estatica | error |
| 36 | Sintaxis y escritura | Variable usada en case | baja (suposición) | estatica | error |
| 37 | Sintaxis y escritura | Número con dos puntos | baja (suposición) | estatica | error |
| 38 | Sintaxis y escritura | Entero octal inválido | baja (suposición) | estatica | error |
| 39 | Sintaxis y escritura | Identificador comienza con número | media (suposición) | estatica | error |
| 40 | Sintaxis y escritura | Guion medio en variable | media (suposición) | estatica | error |
| 41 | Sintaxis y escritura | Coma como decimal | media (suposición) | heuristica | aviso |
| 42 | Sintaxis y escritura | Cadena de texto sin cerrar | media (suposición) | estatica | error |
| 43 | Sintaxis y escritura | Escape desconocido | baja (suposición) | estatica | aviso |
| 44 | Sintaxis y escritura | Barra invertida fuera de texto | baja (suposición) | estatica | error |
| 45 | Sintaxis y escritura | Ñ en identificador no portable | baja (suposición) | heuristica | aviso |
| 46 | Sintaxis y escritura | Arroba en identificador | baja (suposición) | estatica | error |
| 47 | Sintaxis y escritura | Paréntesis Unicode | baja (suposición) | estatica | error |
| 48 | Sintaxis y escritura | Palabra reservada como variable | media (suposición) | estatica | error |
| 49 | Sintaxis y escritura | Declaración sin nombre | baja (suposición) | estatica | error |
| 50 | Sintaxis y escritura | Literal char con varios caracteres | baja (suposición) | estatica | aviso |

## TOP 50 para implementar primero

El orden prioriza frecuencia estimada, detección estática y ambigüedad baja. Como el archivo actual contiene exactamente 50 errores, el tramo final incluye avisos de menor prioridad; no todos cumplen por igual los tres criterios.

1. **E001 — Declaración sin punto y coma** (muy alta (suposición); estatica; error): Es un error de sintaxis muy frecuente y el analizador puede localizar la declaración incompleta sin depender de la ejecución.
2. **E002 — Asignación sin punto y coma** (muy alta (suposición); estatica; error): La asignación incompleta rompe la instrucción siguiente y se detecta con análisis sintáctico local.
3. **E003 — Return sin punto y coma** (alta (suposición); estatica; error): El return sin terminador es determinístico y frecuente al comenzar con funciones.
4. **E006 — Paréntesis faltante en if** (alta (suposición); estatica; error): Un paréntesis sin cerrar en if es un error sintáctico inequívoco.
5. **E007 — Llamada sin cerrar paréntesis** (alta (suposición); estatica; error): Una llamada sin cerrar paréntesis produce un error claro y frecuente.
6. **E008 — Llave de bloque sin cerrar** (alta (suposición); estatica; error): Una llave abierta sin cierre impide analizar el bloque y puede desplazar muchos diagnósticos posteriores.
7. **E022 — Tipo Int con mayúscula** (alta (suposición); estatica; error): La capitalización incorrecta de int se reconoce por comparación con palabras reservadas.
8. **E026 — main sin paréntesis** (alta (suposición); estatica; error): main sin paréntesis impide definir correctamente la función de entrada.
9. **E027 — If sin paréntesis** (alta (suposición); estatica; error): if sin paréntesis es una equivocación sintáctica común y fácil de diagnosticar.
10. **E020 — print en lugar de printf** (alta (suposición); heuristica; error): print no es la función estándar de C y sin una definición el enlace falla; la sugerencia printf es concreta.
11. **E004 — Punto y coma después de if** (alta (suposición); heuristica; aviso): El punto y coma deja el if vacío; GCC lo advierte y el editor puede señalar exactamente la condición.
12. **E009 — Llave de cierre sobrante** (media (suposición); estatica; error): Una llave sobrante se detecta por balance de delimitadores con riesgo bajo.
13. **E010 — Corchete de arreglo sin cerrar** (media (suposición); estatica; error): Un corchete de arreglo sin cierre es un error sintáctico directo.
14. **E011 — Comillas dobles tipográficas** (media (suposición); estatica; error): Las comillas tipográficas suelen aparecer al copiar y pegar y GCC las rechaza en posición de código.
15. **E013 — Comilla simple sin cerrar** (media (suposición); estatica; error): Una constante de carácter sin cerrar detiene el análisis léxico y tiene una ubicación concreta.
16. **E014 — Comentario de bloque sin cerrar** (media (suposición); estatica; error): Un comentario /* sin */ puede ocultar todo el resto del programa y se detecta con el lexer.
17. **E016 — Palabra elif en condicional** (media (suposición); estatica; error): elif es una confusión típica entre lenguajes y se identifica con precisión en posición de condición.
18. **E017 — Operador distinto escrito <>** (media (suposición); estatica; error): <> no es el operador de desigualdad de C y GCC señala el token inválido.
19. **E018 — Operador mayor igual invertido** (media (suposición); estatica; error): => es una inversión frecuente de >= y produce un error sintáctico inmediato.
20. **E019 — Palabra and en condición** (media (suposición); estatica; error): and no reemplaza && en C; la detección contextual es sencilla.
21. **E021 — cout en programa C** (media (suposición); estatica; error): cout y << como salida corresponden a C++; el ejemplo falla en C y la alternativa printf es enseñable.
22. **E028 — Paréntesis de cierre sobrante** (media (suposición); estatica; error): Un cierre de paréntesis sobrante se detecta por balance y localización.
23. **E030 — Operador sin operando izquierdo** (media (suposición); estatica; error): Un operador binario sin operando izquierdo produce un diagnóstico de sintaxis preciso.
24. **E032 — For sin separador** (media (suposición); estatica; error): El encabezado for requiere dos separadores y el parser puede verificarlo sin ejecutar.
25. **E042 — Cadena de texto sin cerrar** (media (suposición); estatica; error): Una cadena sin cierre es un error léxico frecuente al escribir printf.
26. **E048 — Palabra reservada como variable** (media (suposición); estatica; error): Usar una palabra reservada como nombre de variable es un error determinístico.
27. **E029 — Asignación sin valor** (media (suposición); estatica; error): Una asignación sin expresión a la derecha es un error sintáctico determinístico.
28. **E039 — Identificador comienza con número** (media (suposición); estatica; error): Un identificador que comienza con número viola la regla léxica y se detecta sin heurísticas.
29. **E040 — Guion medio en variable** (media (suposición); estatica; error): El guion medio dentro de una declaración se interpreta como operador; el contexto permite una sugerencia de nombre.
30. **E015 — Palabra then en if** (media (suposición); heuristica; error): then no forma parte de la sintaxis de if de C; una regla contextual evita sugerirlo en otros lugares.
31. **E023 — Tipo float mal escrito** (media (suposición); heuristica; error): Un tipo mal tipeado produce diagnóstico directo; una sugerencia de edición ayuda mucho al principiante.
32. **E005 — For con cuerpo vacío** (media (suposición); heuristica; aviso): El for vacío compila sin aviso de GCC; es útil como sospecha pedagógica, pero debe quedar por debajo de errores seguros.
33. **E041 — Coma como decimal** (media (suposición); heuristica; aviso): La coma decimal es una confusión regional, pero puede confundirse con declaradores múltiples; mantenerla como aviso.
34. **E012 — Comillas simples tipográficas** (baja (suposición); estatica; error): Las comillas simples curvas causan un error claro cuando se usan para escribir un carácter.
35. **E025 — Punto y coma Unicode** (baja (suposición); estatica; error): Un punto y coma Unicode puede pasar inadvertido visualmente, pero el token inválido es detectable por código de carácter.
36. **E034 — Case sin dos puntos** (baja (suposición); estatica; error): case sin dos puntos es un error local dentro de switch.
37. **E035 — Default sin dos puntos** (baja (suposición); estatica; error): default sin dos puntos es un error local dentro de switch.
38. **E044 — Barra invertida fuera de texto** (baja (suposición); estatica; error): Una barra invertida suelta es un carácter inválido, aunque se debe excluir el preprocesador.
39. **E046 — Arroba en identificador** (baja (suposición); estatica; error): La arroba en una declaración es un token inválido claro.
40. **E047 — Paréntesis Unicode** (baja (suposición); estatica; error): Los paréntesis Unicode se ven normales pero tienen códigos distintos; una comprobación Unicode lo detecta.
41. **E024 — Sufijo f en entero** (baja (suposición); estatica; error): 5f es un literal inválido y la corrección 5.0f es clara.
42. **E031 — Coma final en argumentos** (baja (suposición); estatica; error): La coma final en los argumentos es un error local de sintaxis.
43. **E033 — Do while sin punto y coma** (baja (suposición); estatica; error): El do-while tiene un terminador particular que se puede comprobar con contexto sintáctico.
44. **E036 — Variable usada en case** (baja (suposición); estatica; error): case con variable no constante es una restricción de compilación comprobable estáticamente.
45. **E037 — Número con dos puntos** (baja (suposición); estatica; error): Un literal con dos puntos decimales es inválido y GCC lo identifica directamente.
46. **E038 — Entero octal inválido** (baja (suposición); estatica; error): Un dígito 8 o 9 dentro de un literal octal es un error lexical claro.
47. **E049 — Declaración sin nombre** (baja (suposición); estatica; error): La declaración sin identificador se reconoce inmediatamente después del tipo.
48. **E043 — Escape desconocido** (baja (suposición); estatica; aviso): Un escape desconocido genera una advertencia de GCC; se puede explicar sin bloquear.
49. **E050 — Literal char con varios caracteres** (baja (suposición); estatica; aviso): GCC avisa por constantes char multicaracter; conviene mostrarlo como aviso porque el lenguaje deja detalles dependientes de implementación.
50. **E045 — Ñ en identificador no portable** (baja (suposición); heuristica; aviso): GCC acepta identificadores con ñ en UTF-8; esto solo sirve como aviso de portabilidad del editor.

## Registros con mayor incertidumbre

- **E005 — For con cuerpo vacío:** GCC no avisa y un cuerpo vacío puede ser intencional; debe ser una heurística, nunca un error.
- **E020 — print en lugar de printf:** la sugerencia es útil, pero el alumno podría declarar una función propia llamada print. La regla debe comprobar si existe una definición.
- **E021 — cout en programa C:** el patrón suele venir de C++, aunque los identificadores y operadores pueden tener otros usos; usarlo como sugerencia contextual.
- **E041 — Coma como decimal:** `float A=3,5;` también puede confundirse con una lista de declaradores; requiere contexto y debe ser aviso.
- **E043 — Escape desconocido:** GCC advierte, pero el manejo de escapes no reconocidos puede variar según implementación; no bloquear solo por esta regla.
- **E045 — Ñ en identificador no portable:** GCC 14.2 acepta el identificador en UTF-8; es una restricción del editor, no un error universal de C.
- **E050 — Literal char con varios caracteres:** GCC avisa; las constantes multicaracter tienen valor dependiente de la implementación. Debe ser aviso y no una promesa de error de compilación.
- **E004 — Punto y coma después de if:** el cuerpo vacío es válido en C en casos deliberados; emitir aviso solamente.
- **E011/E012 — Comillas tipográficas:** el análisis debe ignorar los mismos caracteres cuando aparezcan dentro de comentarios o cadenas ya válidas.
- **E025/E047 — Puntuación Unicode:** detectar por código de carácter, no por parecido visual, y excluir cadenas y comentarios.

## Casos que necesitan ejecución o análisis dinámico

- División entera o resto con divisor calculado desde scanf: solo se confirma para cada entrada cuando el divisor vale cero.
- Acceso a arreglo cuyo índice depende de datos ingresados o de cálculos: el rango real puede conocerse recién al ejecutar.
- Ciclos while/for cuya condición depende de datos de entrada o estados modificados por varias funciones: una heurística estática puede sospechar, pero no demostrar todos los casos.
- Recursión cuya profundidad depende de una entrada: un límite de pasos/stack en el runtime puede detectar el agotamiento.
- Lecturas que dependen del retorno de scanf: hay que comprobar en ejecución cuántas conversiones se realizaron y si el valor quedó actualizado.
- Promedio con contador que puede valer cero, y mínimo/máximo inicializados según datos de entrada: requieren seguir el flujo de datos o ejecutar casos de prueba.
- Errores de algoritmo como no leer el siguiente dato dentro del lazo, mostrar dentro del lazo o intercambiar orden de entrada: el editor necesita reconocer el patrón del ejercicio o comparar con la consigna; no se deducen siempre del C aislado.

## Comportamientos indefinidos o no portables que deben tratarse con especial cuidado

- Leer una variable local automática sin inicializar.
- Desbordar un entero con signo (por ejemplo, superar INT_MAX en una suma). El desbordamiento de unsigned, en cambio, se define módulo 2^N.
- División o resto de enteros por cero.
- Leer o escribir fuera de los límites de un arreglo.
- Pasar a printf argumentos cuyo tipo no coincide con el especificador de formato, o pasar a scanf un destino incompatible (incluido olvidar &).
- Usar el resultado de una función no-void que terminó sin ejecutar return en ese camino.
- Modificar varias veces el mismo objeto escalar sin secuenciación definida en una expresión, por ejemplo `A++ + A++`.
- Desplazar un entero con una cantidad negativa o igual/superior al ancho del tipo; ciertos desplazamientos a izquierda de enteros con signo también son indefinidos.
- Pasar a las funciones de ctype un valor distinto de EOF que no sea representable como unsigned char.
- Las constantes de carácter multicaracter no se deben clasificar automáticamente como UB: su valor es dependiente de la implementación; por eso E050 es aviso.

## Pendiente antes de considerar terminada la base

- Parte 1: faltan categorías 2 a 14 y al menos 250 errores adicionales para llegar a 300. El plan inicial estimaba 425, pero no se generaron esos registros en este hilo.
- Parte 2: ayuda.json supera el mínimo solicitado; falta una revisión específica contra cada apartado del PDF del apunte. El PDF fue localizado en el repositorio, pero no se pudo extraer su contenido binario por el conector.
- Parte 3: lecciones.json tiene 35 entradas; los ejemplos compilan, pero las relaciones de errores apuntan únicamente a los registros 1–50 que existen hoy.
- El entorno de validación fue GCC 14.2, no GCC 13. Para cerrar compatibilidad hay que ejecutar el mismo test en el GCC objetivo del editor y luego probar dentro del intérprete del navegador.
