# Auditoría integral de Editor C
**Fecha:** 9 de noviembre de 2026  
**Repositorio:** Diego-20000/editor-c  
**Rama revisada y destino del informe:** chatgpt  
**Commit base revisado:** f2bec04409726fec0b2b4450610bd9e0461911b8  
**Alcance:** revisión estática de arquitectura, fuentes, runtime, compilador, interfaz, herramientas, pruebas, documentación y base de conocimiento.

---

## 1. Veredicto ejecutivo

Editor C tiene una idea de producto clara y bastante más trabajo real detrás que un editor escolar típico. No es solamente un textarea con colores: es un entorno educativo offline, con un compilador propio para un subconjunto de C, runtime, diagnósticos, base de conocimiento, persistencia, exportación, PWA y pruebas contra GCC. La arquitectura está alineada con las restricciones del proyecto y varias decisiones son muy buenas.

Mi opinión general: **la dirección del proyecto es buena; la implementación es ambiciosa y está razonablemente organizada por responsabilidades, pero todavía no confiaría ciegamente en sus resultados de compatibilidad ni en todas las explicaciones del entrenador.** Hay defectos concretos en el oráculo de pruebas, en el validador de la base y en el desempate de diagnósticos. No son detalles cosméticos: pueden hacer que una prueba dé verde cuando los programas no terminaron igual o que un alumno reciba una explicación que no corresponde.

No recomiendo reescribirlo. Recomiendo corregir primero la cadena de verificación, después las ambigüedades del entrenador y, por último, cerrar los bordes del runtime y ajustar las promesas documentales. La base técnica merece ese trabajo.

### Mi evaluación por área

| Área | Evaluación | Opinión |
|---|---:|---|
| Idea y enfoque pedagógico | 9/10 | Tiene propósito propio y decisiones educativas coherentes. |
| Arquitectura offline | 8/10 | Está bien resuelta para un sitio estático y sin backend. |
| Compilador C → JavaScript | 7/10 | Ambicioso y útil; la fidelidad tiene que seguir acotada al subconjunto. |
| Runtime | 6/10 | Buen trabajo numérico y de tipos; faltan cerrar varios bordes de entrada y formato. |
| Interfaz | 8/10 | Completa, pensada para escritorio y celular, sin depender de frameworks. |
| Base de conocimiento | 7/10 | Mucho contenido y buen esquema; el mecanismo de selección tiene un defecto serio. |
| Privacidad y evidencia de proceso | 8.5/10 | El diseño es honesto y no confunde evidencia con detección de IA. |
| Pruebas y validación | 5/10 | Hay bastantes pruebas, pero dos herramientas importantes pueden dar garantías falsas. |
| Mantenibilidad/documentación | 6.5/10 | La estructura es entendible; los archivos grandes y algunos documentos desactualizados elevan el costo de cambio. |

Las notas son mi juicio técnico, no métricas automatizadas.

---

## 2. Alcance real de esta revisión y límites

El árbol de la rama tenía **436 archivos**, alrededor de **15,9 MB**. La distribución observada fue:

- **src/**: 11 archivos, aproximadamente 469 KB.
- **tools/**: 5 scripts, aproximadamente 120 KB.
- **test/**: 297 archivos; incluye 131 programas de comparación en test/cases, 116 programas de diagnóstico en test/diag y pruebas JavaScript, shell y Python.
- **kb/**: 29 archivos, aproximadamente 1,42 MB.
- **docs/**: 70 archivos, aproximadamente 10,5 MB; tres documentos Markdown y 67 capturas PNG.
- **assets/**: 14 artefactos generados.
- **dist/**: el archivo HTML autocontenido generado.
- Raíz: README, contexto, build, sitio y manifiesto.

Leí de forma detallada los módulos fuente principales (compilador, runtime, aplicación, proceso, conocimiento, compartir, estilos, plantilla y configuración), el proceso de build, service worker, herramientas de mantenimiento y los runners de pruebas. También revisé los contratos, esquemas y documentación del producto, y recorrí el inventario de los casos de prueba y la base activa.

**No ejecuté los comandos de Node, GCC ni Playwright durante esta revisión.** El acceso disponible permitió inspeccionar el contenido de la rama, pero no disponer de un checkout ejecutable del repositorio. Por eso, los defectos señalados abajo se clasifican por inspección estática del código; no digo que haya corrido una reproducción de extremo a extremo. Tampoco conté como código fuente independiente los archivos generados de assets/dist, ni inspeccioné individualmente cada píxel de las 67 capturas.

Esta distinción importa: el informe no convierte una lectura estática en un resultado de CI.

---

## 3. Lo mejor del proyecto

### 3.1. La arquitectura sí responde al problema que querés resolver

La restricción de sitio estático no está tratada como una limitación improvisada. Se diseña alrededor de ella:

- El navegador recibe el sitio y los datos fijos de la base.
- El compilador transforma el subconjunto de C a JavaScript.
- La ejecución y compilación se mueven a un Web Worker cuando el navegador lo permite.
- La aplicación funciona con doble clic mediante file:// y tiene una versión de un solo archivo.
- La PWA precarga sus recursos y puede trabajar sin conexión.
- No hay servidor, cuentas, API propia, CDN ni un modelo de IA dentro del editor.

Esto mantiene el costo operativo bajo y hace que el código del alumno no dependa de un servicio externo. Es una decisión arquitectónica fuerte para el público objetivo.

### 3.2. La experiencia de aprendizaje tiene una postura propia

Me gusta especialmente que el producto no intente escribir el programa por el alumno. El cierre automático viene desactivado, no hay autocompletado de nombres, la ayuda no aparece sola y las pistas son progresivas. La tercera pista está deliberadamente separada y requiere confirmación.

Eso respeta el objetivo de que el alumno piense, escriba, pruebe y corrija. No convierte al editor en una máquina de entregar soluciones.

La regla de no dar avisos dudosos también es acertada. kb/PENDIENTES-REGLAS.md registra casos que no se implementan porque dependen del enunciado o porque ya se comprobó que avisarían en soluciones correctas. En un producto educativo, un falso positivo persistente destruye la confianza mucho más rápido que una regla que todavía no existe.

### 3.3. La base de conocimiento tiene volumen y estructura

La base activa tiene:

| Contenido | Cantidad |
|---|---:|
| Diagnósticos de errores, en 14 categorías | 595 |
| Ayudas contextuales | 351 |
| Mini-lecciones | 46 |
| **Total de entradas** | **992** |

Los 595 IDs de errores son únicos en el conjunto que inspeccioné. El esquema distingue el ejemplo incorrecto, el corregido, la entrada, lo que dice GCC, la explicación, las pistas, la detección, los falsos positivos y el estado de validación. Esa trazabilidad es mucho mejor que una colección de mensajes sueltos.

También está bien separar kb/chatgpt/ como borradores de los datos activos que consume el editor. Los borradores no deberían entrar al build hasta ser revisados y validados.

### 3.4. La privacidad de «Cómo se escribió» está pensada con honestidad

src/proceso.js guarda segmentos de procedencia, contadores, tiempos y huellas de líneas; no serializa el texto del programa ni el contenido del portapapeles. La documentación explica qué mide, qué no puede distinguir y por qué no es una prueba de autoría ni un detector de IA.

Esa honestidad es fundamental. El modo práctica puede desalentar el pegado accidental, pero no es un sistema antitrampa inviolable. El propio proyecto no debería presentarlo como tal.

### 3.5. La interfaz tiene más profundidad de la que aparenta

La aplicación incorpora editor con capas de resaltado, números de línea, marcas de errores, consola con entrada, cancelación, programas guardados, recuperación, importación/exportación, captura PNG, divisor accesible por teclado, vista móvil por pestañas, seguimiento del teclado virtual, ayuda contextual y modos de lectura.

El uso de APIs nativas reduce el peso y la complejidad de dependencias. En el código visible se usa textContent para insertar mensajes de diagnóstico y contenido variable, lo que evita convertir los mensajes del alumno o de la base en HTML ejecutable. Las inserciones HTML que sí aparecen están construidas con escape o con clases internas controladas.

### 3.6. El build es deliberadamente simple

build.js no necesita bundler ni dependencias: toma src/, genera assets/, index.html, service worker, íconos y dist/editor-c.html. El hash de versión se calcula sobre los archivos precargados. La versión de un archivo reduce fricción para compartir el editor por fuera de GitHub Pages.

La regla correcta es mantener src/ y kb/ como fuentes de verdad y tratar assets/, index.html, sw.js y dist/ como resultados del build. No conviene corregir bugs editando manualmente esos resultados.

---

## 4. Hallazgos críticos: corregir antes de confiar en la verificación

Estos son los defectos que más me preocupan. Los ordeno por impacto, no por facilidad.

### H-01 — El comparador puede aprobar códigos de salida diferentes
**Severidad: alta. Archivo: test/diff.sh, línea 10.**

El script compara los códigos de salida de GCC y del editor, pero tiene una excepción demasiado amplia:

- Si ambos códigos son iguales, acepta.
- Si ambos son distintos de cero, acepta también, salvo que el código de referencia sea 124.

Eso significa que un programa que termina con código 1 en GCC y con código 2 en Editor C puede aparecer como OK si la salida estándar coincide. También puede aceptar dos ejecuciones que terminaron por timeout con código 124.

Es un defecto del oráculo: una comparación no puede declarar equivalencia solo porque los dos resultados sean «algún error». El contrato documentado dice que se compara el código de salida, así que tiene que ser exactamente igual, y los timeouts deben ser fallos explícitos, no coincidencias.

**Corrección recomendada:** aceptar únicamente cuando stdout coincide y rc_ref === rc_my, y ninguno de los dos representa timeout. Separar timeout, señal, fallo de ejecución y salida normal en el reporte. Agregar pruebas de regresión con retorno 1 vs 2, timeout vs timeout y timeout vs salida normal.

### H-02 — El entrenador elige la primera explicación de una plantilla ambigua
**Severidad: alta. Archivos: src/kb.js, líneas 139–158; src/app.js, líneas 565–575.**

La API documentada dice que la selección debe ser:

1. ID explícito del diagnóstico.
2. Plantilla del mensaje.
3. Código si lo usa una sola entrada.
4. Si no hay identificación suficiente, null.

La implementación no respeta completamente esa última regla. Si encuentra una plantilla normalizada, intenta coincidencia exacta; después intenta encontrar cualquier entrada de esa plantilla que tenga el mismo código; y si tampoco la encuentra, termina con lista[0].

El problema no queda solucionado por app.js. esAmbiguo() solo cuenta duplicados de la pareja exacta código + mensaje seleccionado. No detecta que el mensaje normalizado contenía varias entradas candidatas diferentes.

Hay ejemplos reales en la base:

- ARR-005 y EJE-004 comparten la plantilla normalizada de índice negativo fuera de arreglo y el código R-runtime, pero sus mensajes concretos describen arreglos de tamaños diferentes. Un nuevo diagnóstico con otro índice puede terminar tomando ARR-005 y mostrar que el arreglo tiene 3 posiciones cuando el arreglo real tiene 5.
- FUN-007, FUN-008 y FUN-009 comparten una plantilla que normaliza el nombre de función y los números de argumentos. Si el mensaje real no coincide literalmente con ninguno, el primer registro puede imponer una cantidad de parámetros equivocada.
- DEC-002 y DEC-003 comparten la forma normalizada de un identificador no declarado con una posible sugerencia. Elegir el primero puede inventar una sugerencia de nombre que no corresponde al programa del alumno.

En la base encontré 76 grupos de mensajes normalizados con más de una entrada. No todos producen por sí mismos un error visible, pero sí demuestran que la ambigüedad es un escenario normal, no hipotético.

**Corrección recomendada:** la búsqueda por plantilla debe devolver una entrada solamente cuando la evidencia deja un candidato inequívoco. Si quedan varios candidatos, no mostrar explicación y guardar el caso como no resuelto. No usar lista[0] como desempate. Si se quiere resolver por contexto, el compilador debe adjuntar un ID estable correcto en kb/kbAlt, no inferirlo después a partir de un mensaje genérico.

**Pruebas necesarias:** agregar fixtures con plantillas normalizadas compartidas, candidatos con el mismo code pero mensajes distintos, números distintos y resultados donde la app tenga que devolver estado ambiguo. Además probar el contenido que finalmente ve el alumno, no solamente el retorno de KB.explicar().

### H-03 — El validador puede afirmar GCC 13 aunque haya ejecutado otra versión
**Severidad: alta. Archivo: tools/kb-validar.js, líneas 21, 133 y 147.**

El validador consulta gcc --version y guarda el texto en gccVer para imprimirlo, pero no comprueba que el major sea 13. Con --arreglar asigna verificado_gcc13 = true incondicionalmente después de correr el programa con el comando gcc disponible.

La diferencia con tools/kb-agregar-caso.js es reveladora: ese script sí calcula esGcc13 y deja verificado_gcc13 en false si el binario no es versión 13. Los dos caminos que alimentan la base no aplican la misma garantía.

El esquema kb/SCHEMA.md es explícito: true significa que realmente se compiló con GCC 13. Hoy el validador puede violar esa regla.

**Corrección recomendada:** detectar y validar la versión antes de correr casos. Si el compilador no es GCC 13, no escribir true; abortar con un mensaje claro o dejar false y no presentar el archivo como validado bajo el contrato. También comprobar el código de salida de spawnSync, timeout y errores de ejecución antes de completar campos.

### H-04 — El validador de la base ignora el código de salida al comparar programas corregidos
**Severidad: media-alta. Archivo: tools/kb-validar.js.**

En la validación de codigo_bien y de ejemplos de lecciones se compara principalmente stdout. La función correr() devuelve un código de salida, pero el flujo de validación no lo compara contra el resultado del editor. En consecuencia, dos programas pueden imprimir lo mismo y terminar con códigos distintos, y el validador igualmente marcar verificado_editor_corrige como true.

Esto es el mismo tipo de debilidad que H-01, dentro de la herramienta que completa los registros.

**Corrección recomendada:** comparar stdout y código de salida en todos los casos corregidos y lecciones. Tratar timeout por separado. El validador debe ser más estricto que la interfaz, no menos.

---

## 5. Hallazgos del runtime y del contrato de C

### R-01 — El límite de ancho y precisión no se aplica a los valores dinámicos con *
**Severidad: media-alta. Archivo: src/runtime.js, líneas 107–117.**

El runtime limita a 100000 los anchos y precisiones escritos literalmente en el formato, pero excluye los especificadores dinámicos. Luego toma los valores de * con Number(...) | 0 y los usa sin volver a aplicar el límite.

Por ejemplo, un ancho dinámico descomunal puede llegar a repeat()/padStart(); una precisión enorme puede terminar en cálculos de potencias BigInt, como 10n ** BigInt(p). Eso puede provocar RangeError, consumo excesivo de memoria o bloquear el hilo de respaldo. El README y COMPATIBILIDAD.md anuncian el máximo de 100000, así que el límite debería ser real en ambas formas.

**Corrección recomendada:** después de resolver width y precision, normalizar los negativos según C, validar el valor absoluto y rechazar de forma controlada cualquier valor por encima de 100000. Agregar casos de ancho y precisión dinámicos en el extremo permitido y justo por encima.

### R-02 — scanf trata %% como si tuviera que saltar espacios
**Severidad: media. Archivo: src/runtime.js, línea 269.**

Al procesar %% dentro del formato de scanf, el runtime llama a skipWs() antes de comprobar el carácter %. En C, %% en scanf hace coincidir el porcentaje literal siguiente; no es una conversión que descarte espacios iniciales.

Con una entrada que empieza con espacios antes del %, el editor puede consumir esos espacios y aceptar una secuencia que GCC no aceptaría de la misma forma.

**Corrección recomendada:** comprobar el siguiente byte de entrada sin skipWs() y agregar casos con espacio, tabulación, porcentaje correcto y porcentaje ausente.

### R-03 — La lectura de texto no es realmente byte-oriented para UTF-8
**Severidad: media. Archivos: src/runtime.js, líneas 196–205, 269–300 y 405–419.**

El contrato dice que los textos son bytes UTF-8 como en GCC. Sin embargo, peek() devuelve charCodeAt(), que trabaja con unidades UTF-16 de JavaScript, no con bytes de entrada C.

Consecuencias:

- scanf("%c") consume una unidad UTF-16, no un byte UTF-8.
- scanf("%s") cuenta txt.length para el ancho, en vez de la cantidad de bytes.
- fgets()/gets() convierten cada unidad UTF-16 a string y vuelven a codificarla; un carácter fuera del BMP se puede romper en dos sustitutos y transformarse en caracteres de reemplazo.
- fgets() comprueba bytes.length < n - 1 antes de añadir todos los bytes del próximo carácter; una secuencia multibyte puede superar el límite n - 1.

El problema no afecta solamente a emojis: también puede cambiar límites de lectura y almacenamiento de letras acentuadas, que son normales en un editor en español.

**Corrección recomendada:** representar stdin internamente como bytes UTF-8 y hacer que getchar, scanf, fgets y gets operen sobre esos bytes. La interfaz puede seguir recibiendo strings; la codificación debe ocurrir una sola vez al alimentar el runtime. Si no se va a implementar ahora, reducir el contrato y documentar claramente el límite.

### R-04 — La promesa «todos los formatos» de printf/scanf es demasiado amplia
**Severidad: media. Archivos: README.md, sección Qué soporta; src/runtime.js, línea 97; src/compiler.js, métodos printfCall() y scanfCall().**

El runtime usa una lista explícita de conversiones. No incluye, por ejemplo, las conversiones hexadecimales de coma flotante %a/%A ni %n. El analizador del formato y scanf tampoco cubren el conjunto completo de conversiones estándar. Además, el proyecto excluye long double y punteros generales.

Esto no invalida el editor: no necesita implementar todo C para enseñar el temario. Lo que sí está mal es decir «todos sus formatos» cuando en realidad hay un subconjunto.

**Corrección recomendada:** enumerar los especificadores soportados y los no soportados en COMPATIBILIDAD.md y README. Los formatos no soportados deberían generar un diagnóstico explícito, no quedar como texto literal o fallar silenciosamente.

### R-05 — Las secuencias universales de caracteres no se implementan como C
**Severidad: baja-media. Archivo: src/compiler.js, función esc(), cerca del bloque del lexer.**

La función esc() contempla escapes octales, hexadecimales y los escapes simples comunes. Para \u y \U devuelve la letra siguiente como carácter ordinario en vez de interpretar una secuencia universal de C. También limita los escapes hexadecimales a uno o dos dígitos, mientras que la gramática de C permite una secuencia hexadecimal de longitud variable.

Es un borde del lenguaje, no una razón para descartar el compilador. Debe documentarse como límite del subconjunto o implementarse con pruebas contra GCC.

### R-06 — El respaldo sin Worker puede seguir bloqueando la página
**Severidad: media-baja. Archivos: src/app.js, bloque BOOT/fallback; src/runtime.js, makeProgram().**

La ruta habitual usa Worker y permite detener la tarea terminando el Worker. La ruta alternativa ejecuta en la página; allí el compilador sigue siendo síncrono. yieldLoops ayuda a ceder control en bucles generados, pero no convierte la compilación ni cualquier operación pesada en una tarea interrumpible.

La documentación ya reconoce que la compilación puede bloquear si no hay Worker. Mantendría el fallback, pero no prometería el mismo aislamiento que la ruta con Worker. Los casos enormes, allocations y operaciones costosas tienen que fallar con límites conservadores también en este modo.

---

## 6. Revisión por módulo

### src/compiler.js — el corazón del producto

Es el módulo más importante y el más caro de mantener. Tiene lexer, preprocesador parcial, parser, análisis de tipos, generación de JavaScript, advertencias y reglas del entrenador. La organización interna por clases y etapas es mejor que intentar resolver el lenguaje con expresiones regulares sueltas.

Puntos fuertes:
- Tokeniza comentarios, literales, operadores, directivas y números con información de línea.
- Distingue tipos y usa BigInt para el modelo de enteros de 64 bits.
- Maneja prototipos, funciones, recursión, arreglos, control de flujo y el subconjunto de macros declarado.
- Mantiene los diagnósticos estructurados con línea, código y vínculos de la base.
- Separa errores que impiden compilar de avisos que permiten ejecutar.
- Las reglas educativas están escritas con cautela y tienen una lista explícita de casos que no se deben detectar.

Riesgos:
- 2668 líneas en un archivo concentran lexer, parser, tipado, generación y reglas. No es obligatorio dividirlo mañana, pero cada nueva regla aumenta la probabilidad de interferir con otra.
- El preprocesador es un subconjunto, no un preprocesador C completo. No hay que venderlo como equivalente a GCC para macros arbitrarias.
- La fidelidad depende del contrato de COMPATIBILIDAD.md. En comportamiento indefinido, extensiones de GCC, punteros y construcciones no soportadas, el compilador debe rechazar o advertir, nunca aparentar equivalencia.
- El orden y los efectos laterales de expresiones son especialmente delicados. La documentación ya reconoce que el orden de evaluación no está garantizado por C.
- Los escapes y formatos deben tener pruebas de regresión específicas; son zonas donde es fácil que el tokenizador y el runtime discrepen.

Mi opinión: el diseño general del compilador es defendible para el objetivo escolar. No lo reemplazaría por una librería enorme ni por WebAssembly si el peso y el funcionamiento offline siguen siendo requisitos. Sí pondría más presión en pruebas diferenciales y en mantener el subconjunto cerrado y explícito.

### src/runtime.js — una implementación sorprendentemente ambiciosa

Tiene trabajo serio: representación de tipos, enteros largos con BigInt, redondeo decimal exacto, formato numérico, entrada, cadenas, arreglos, rand glibc, errores de ejecución y límites.

Puntos fuertes:
- fixedExact() intenta reproducir redondeo decimal sin delegar ciegamente en toFixed().
- Usa BigInt para long/unsigned long y operaciones de 64 bits.
- Los arreglos comprueban índices y tamaño total antes de crear estructuras enormes.
- Los errores de runtime conservan la línea.
- El runtime no depende de DOM y puede probarse desde Node y el Worker.

Puntos débiles:
- Entrada basada en strings UTF-16 mientras el contrato promete bytes UTF-8.
- Límite dinámico * sin control.
- scanf %% no respeta la coincidencia literal.
- Algunas conversiones/formats están incompletos.
- El límite de 20 millones de elementos sigue siendo grande para ciertos navegadores, sobre todo en arreglos multidimensionales representados como arreglos JavaScript anidados. Un límite total no garantiza que una asignación de ese tamaño sea viable en todos los dispositivos.

Mi opinión: no es un runtime improvisado, pero es la parte donde una promesa de compatibilidad exige más tests de bordes. Mantendría los límites por dispositivo conservadores antes que intentar simular memoria ilimitada.

### src/app.js — aplicación completa, pero monolítica

Concentra la coordinación del editor, guardado, render, búsqueda, consola, Worker, entrada, importación/exportación, captura, paneles, settings, tabs, divisor, PWA y APIs usadas por tests.

Puntos fuertes:
- Persiste con tolerancia a localStorage bloqueado o lleno.
- Guarda al cambiar de pestaña/ocultar/cerrar y al alternar programas.
- Tiene recuperación y exportación para no depender exclusivamente del almacenamiento del navegador.
- Los diagnósticos se muestran de manera estructurada y permiten ir a la línea.
- El Worker mantiene la interfaz responsive en el camino normal.
- El código variable se inserta en general con textContent o se escapa al pintar resaltado.
- El modo práctica, la ayuda por niveles y la captura se conectan con módulos separados.

Riesgos:
- 1772 líneas en un IIFE dificultan cambios transversales y pruebas aisladas.
- Hay una API global window.__editorc para pruebas. No la considero una vulnerabilidad por sí misma: el programa del usuario ya se ejecuta en su propio navegador, y el modo práctica no pretende ser una frontera de seguridad. Conviene dejar claro que es una interfaz de prueba, no una función de protección.
- El número de programas creados manualmente no parece tener un tope general comparable al límite de importación. Si se guardan muchos programas, localStorage puede agotarse; el mensaje de error evita que sea silencioso, pero una política de retención o exportación sugerida ayudaría.
- Cuando el Worker no está disponible, el fallback reduce el aislamiento y puede congelar durante la compilación u operaciones que no cedan el control.
- El refresco periódico del service worker genera consultas de actualización al mismo origen.

Privacidad: no encontré una ruta que envíe automáticamente el código del alumno a un servidor externo. La única salida explícita de casos es la acción que el alumno elige para compartir. Sin embargo, README.md dice «no hay pedidos de red» en términos absolutos. Eso no es literal en la versión web: la página carga recursos y el service worker consulta actualizaciones con reg.update() al volver a primer plano y cada hora. Lo correcto es decir que no hay telemetría, servicios externos ni envío automático del código; el sitio sí necesita red para la primera carga y para buscar versiones nuevas. El código del alumno permanece local salvo que la persona elija compartir un caso.

### src/proceso.js — uno de los módulos mejor pensados

El diseño de procedencia por tramos evita guardar de nuevo el contenido del código. La reconciliación por diferencias, la conservación de procedencia al comentar/sangrar y el tratamiento de deshacer/rehacer como origen desconocido son decisiones correctas.

Puntos fuertes:
- Mantiene invariantes entre longitud del texto y suma de segmentos.
- Tiene restauración con validación y fallback a desconocido cuando no hay evidencia confiable.
- No serializa contenido tipeado ni pegado.
- Limita la cantidad de eventos de pegado almacenados.
- El adaptador contempla beforeinput, input, paste, drop, composición, undo/redo y cambios desconocidos.
- La política del modo práctica es sencilla y no bloquea archivos que no son texto.

Límite importante: la procedencia no es prueba de autoría. Un usuario puede escribir en otro lugar, pegar por partes pequeñas o manipular el navegador; el sistema no puede distinguirlo de forma fiable. El proyecto ya lo explica. Seguiría presentándolo como evidencia descriptiva, nunca como detector.

### src/kb.js — buen buscador, selección que necesita corregirse

La normalización de acentos, plurales, sinónimos, símbolos de C y pesos por campo es una idea razonable para una base offline. También es correcto que el panel pueda buscar errores, conceptos y lecciones sin una API.

El defecto de selección H-02 es prioritario. La búsqueda es útil, pero la explicación no puede depender de un desempate arbitrario. Para una herramienta de enseñanza es preferible responder «todavía no tengo una explicación suficientemente precisa» a explicar el caso equivocado.

### src/compartir.js — buena separación de responsabilidades y privacidad

El módulo arma el caso, quita cabeceras y datos de contacto, limita tamaños, deduplica, mantiene un máximo y prepara importación/exportación. El contenido se comparte solo tras una decisión visible del alumno. También contempla el recorte del enlace de WhatsApp y conserva el texto completo para copiar.

Observaciones:
- La limpieza de números/emails/enlaces puede borrar texto legítimo si aparece en comentarios o ejemplos, pero es una compensación conservadora razonable.
- El número de WhatsApp vacío en config.js deja el enlace sin destinatario. Está documentado como pendiente, no lo considero un bug oculto.
- Conviene mantener tests de importación hostil, campos desconocidos y textos largos; el módulo tiene varias fronteras de entrada.

### src/config.js, src/examples.js y src/template.html

- config.js es pequeño y separa configuración del código. VERSION depende del build y el destinatario de WhatsApp permanece configurable.
- examples.js ofrece ejemplos graduados y cercanos al temario. Mantendría las variables en mayúsculas, como pide la materia.
- template.html tiene estructura semántica reconocible, etiquetas accesibles, diálogos y controles nombrados. Es una base simple y adecuada para el producto.

### src/app.css

El CSS mantiene temas, tamaños táctiles, estados y disposición responsive sin introducir una librería de componentes. La guía de diseño y la suite visual comprueban contraste, distribución y comportamiento móvil. Es positivo que se contemplen prefers-reduced-motion y el teclado virtual.

Riesgo residual: depender de funciones CSS relativamente nuevas, como color-mix y unidades dinámicas de viewport, puede degradar en navegadores antiguos. No es bloqueante para navegadores modernos, pero falta documentar una matriz mínima de compatibilidad.

### build.js, src/sw.js y sw.js generado

El build está bien planteado: cero dependencias de compilación, saneamiento de cadenas al incrustar scripts, generación de íconos, manifiesto, precache y versión por hash. La plantilla de service worker se mantiene en src/ y el resultado generado queda en la raíz.

El service worker elimina cachés de versiones anteriores al activar una nueva. En la mayoría de los flujos es razonable; conviene probar el caso de dos pestañas abiertas con versiones diferentes y aceptar una actualización desde una de ellas. No lo clasifico como defecto confirmado, pero es un escenario de regresión válido.

### tools/kb-validar.js y tools/kb-agregar-caso.js

Son herramientas esenciales porque convierten contenido manual en datos revisables. El agregador de casos tiene una política correcta: no pisa el archivo, detecta duplicados y mantiene borradores pendientes de revisión. Además comprueba si el GCC local es versión 13 antes de marcar ese dato.

El validador principal no mantiene esa misma garantía, como se explica en H-03. Además debe comparar códigos de salida y reconocer timeouts. No debería escribir campos de verificación si el comando terminó por timeout, señal o error de ejecución.

### tools/ui-smoke.js, tools/ui-reparos.js y tools/capturas-diseno.js

La cobertura de UI es extensa: ejecución, diagnóstico, avisos, cancelación, salida grande, fuente grande, arreglos, entrada precargada, buscar/reemplazar, edición, persistencia, captura, import/export, settings, silencio de diagnósticos, diseño, contraste, móvil, fallback sin Worker, PWA, entrenador y proceso.

Es una fortaleza. El costo es que una suite grande escrita como un único script Playwright también necesita una versión de Playwright y una configuración de navegador controladas. Hoy no encontré package.json, lockfile ni workflow de CI en el árbol de la rama. El build no necesita dependencias, pero la verificación de UI sí necesita Playwright instalado y el entorno no queda fijado desde el repositorio.

---

## 7. Base de conocimiento: calidad del contenido y confianza de los datos

La estructura de kb/ es una de las fortalezas conceptuales. Hay categorías identificables, IDs, ejemplos buenos/malos, entrada reproducible, mensajes y pistas. También se registran gemelos y falsos positivos evitados.

Pero haría tres ajustes de política:

1. **No confundir «el registro dice verificado» con «el registro fue verificado en este entorno».** Los 595 registros activos llevan verificado_gcc13=true. El validador que puede escribir ese campo no comprueba el major de GCC, así que el valor actual no debe tratarse como garantía independiente hasta corregir H-03 y volver a validar con GCC 13 real.
2. **No permitir que un diagnóstico ambiguo herede una explicación.** Un fallo sin explicación es preferible a una explicación falsa.
3. **Validar producción, no solamente fixtures.** test/kb.test.js usa test/fixtures/kb/. Eso está bien para pruebas unitarias aisladas, pero no reemplaza una prueba de integración que cargue los 595 + 351 + 46 registros reales, controle IDs y referencias y ejecute los casos de validación.

No vi IDs duplicados entre los 595 errores de la base activa. Sí hay 63 parejas exactas de código/mensaje repetidas. Esas repeticiones pueden ser intencionales como casos gemelos y el compilador dispone de kbAlt/GEMELOS; deben seguir estando documentadas y cubiertas por pruebas. No las clasificaría automáticamente como duplicados malos.

---

## 8. Pruebas: mucha cantidad, pero el oráculo importa más que el número

La estrategia es variada:

| Prueba | Qué cubre | Mi evaluación |
|---|---|---|
| test/cases + diff.sh | Salida y código de salida frente a GCC | Buena idea; H-01 invalida parte de la garantía actual. |
| test/diag + diag.js | Código de diagnóstico, KB asociada y tiempo | Útil para reglas y regresiones. |
| test/kb.test.js | Búsqueda, explicación, pistas, compartir e importación | Buena cobertura unitaria; solo fixtures, falta integración con producción. |
| test/proceso.test.js | Procedencia, restauración, adaptador y fuzz | Es una de las suites mejor orientadas. |
| test/fuzz.py + fuzz_run.sh | Expresiones aritméticas, conversiones y comparación con GCC | Útil, pero el generador explora un dominio acotado. |
| tools/ui-smoke.js | UI, escritorio, móvil, PWA y flujo completo | Amplia y valiosa; depende de Playwright no fijado. |
| tools/ui-reparos.js | Reparos puntuales de interacción | Complementa bien la suite grande. |

El fuzz de expresiones no prueba la semántica completa del lenguaje: no genera de forma sistemática combinaciones de control de flujo, scanf, arreglos, cadenas, funciones, macros, errores de ejecución ni estados de la interfaz. Eso está bien como una capa de pruebas, no como sustituto de las otras.

No encontré integración continua en .github/workflows, ni package.json/lockfile. Para un proyecto cuyo valor diferencial es «se comporta igual que GCC en este subconjunto», yo automatizaría los controles con un entorno fijado, particularmente GCC 13. Una suite manual puede ser buena, pero depende de que alguien recuerde ejecutarla.

---

## 9. Documentación y promesas del producto

### Lo que está bien documentado

- El alcance del lenguaje y lo que todavía no soporta.
- El objetivo de referencia Linux x86-64, GCC 13, glibc y gnu99.
- Los casos de comportamiento indefinido.
- La privacidad de la evidencia de proceso.
- La política pedagógica de pistas progresivas.
- El criterio conservador para no disparar reglas con falsos positivos.
- Los comandos para generar y probar el proyecto.

### Lo que corregiría

**A. «Todos los formatos» de printf/scanf.** Reemplazar por una lista cerrada de conversiones implementadas y las exclusiones actuales.

**B. «No hay pedidos de red».** La privacidad del código puede ser correcta sin afirmar que el navegador no realiza peticiones. La web descarga recursos y el service worker consulta actualizaciones. Redactar: «no hay analítica, backend ni envío automático del código; el sitio consulta su origen para cargar/actualizar y el alumno puede compartir un caso voluntariamente».

**C. docs/PROCESO.md tiene una sección de integración desactualizada.** El documento contiene pasos en modo instrucción para agregar el adaptador y envolver eventos en app.js, pero esa integración ya existe en el código actual. También conserva referencias a líneas que ya no coinciden. Separaría la documentación en: diseño y privacidad del módulo, API vigente y guía de integración histórica (o directamente eliminaría esta última).

**D. Versión exacta de herramientas.** Documentar versión mínima/objetivo de Node, GCC 13 y Playwright. No hace falta incorporar dependencias al build, pero sí hacer reproducible el entorno de pruebas.

**E. Capturas de documentación.** Las 67 imágenes son útiles como evidencia visual, pero deben regenerarse solo con una versión conocida y describir a qué versión de la interfaz corresponden. Si la captura no coincide con el código actual, termina siendo documentación engañosa.

---

## 10. Plan de corrección recomendado

No haría un refactor grande ahora. Haría cinco bloques pequeños, cada uno con pruebas de regresión.

### Bloque 1 — Reparar el sistema de verificación (máxima prioridad)
1. Corregir test/diff.sh para exigir igualdad exacta de códigos de salida.
2. Tratar timeout y señales como fallos explícitos.
3. Hacer que tools/kb-validar.js exija GCC 13 antes de escribir verificado_gcc13=true.
4. Comparar códigos de salida en ejemplos y codigo_bien.
5. Añadir un caso de prueba que demuestre que una ejecución con rc 1 no es equivalente a rc 2.

### Bloque 2 — Hacer seguro el desempate de KB
1. Eliminar el fallback a lista[0].
2. Resolver por ID explícito o coincidencia realmente única.
3. Si hay más de un candidato, devolver null/ambiguo.
4. Probar con las familias ARR/EJE de índices, FUN de cantidad de argumentos, DEC de identificadores, SCN y PRF.
5. Probar el resultado final en app.js, incluida la adaptación de nombres.

### Bloque 3 — Cerrar bordes del runtime
1. Aplicar el límite de 100000 también a width/precision dinámicos.
2. Corregir scanf %% para que no consuma espacios.
3. Pasar stdin a una representación byte-oriented UTF-8 o reducir explícitamente el contrato.
4. Hacer que fgets respete n en bytes.
5. Añadir pruebas con acentos, ñ, emojis, límites de buffer, scanf %c, scanf %s y formatos dinámicos.
6. Definir una respuesta explícita para conversiones de formato no soportadas.

### Bloque 4 — Integración de la base real
1. Cargar los archivos reales de kb/ en una prueba automatizada.
2. Revisar IDs, referencias errores_ids, referencias kb/kbAlt y registros gemelos.
3. Validar las 595 entradas con GCC 13 real, no con un GCC cualquiera.
4. Verificar codigo_bien con stdout y exit code.
5. Impedir que un timeout escriba un resultado como validado.

### Bloque 5 — Reproducibilidad y documentación
1. Agregar CI con versiones fijadas de Node, GCC 13 y Playwright.
2. Correr build, comparación, diagnósticos, KB, proceso y UI en el pipeline.
3. Actualizar docs/PROCESO.md.
4. Ajustar README sobre red y formatos.
5. Agregar una tabla breve de compatibilidad de navegadores y límites del fallback sin Worker.

---

## 11. Qué comandos deberían quedar como puerta de calidad

En una máquina preparada con el entorno fijado, la secuencia mínima de validación debería ser:

    node build.js
    bash test/run_all.sh
    node test/diag.js
    node test/kb.test.js
    node test/proceso.test.js
    bash test/fuzz_run.sh 20 200
    node tools/ui-smoke.js
    node tools/ui-reparos.js

La validación de kb/errores/*.json, kb/ayuda.json y kb/lecciones.json debería agregarse explícitamente, con GCC 13 confirmado. Las capturas finales se regeneran solo cuando se decidió que el cambio visual quedó cerrado.

No pude ejecutar esa secuencia en esta revisión, por lo que no declaro ningún comando en verde.

---

## 12. Conclusión sin vueltas

**Editor C tiene fundamentos para convertirse en una herramienta escolar realmente útil.** La visión no es genérica: prioriza que el alumno escriba, que la ayuda no le robe el ejercicio, que el editor funcione sin conexión y que el código no dependa de una cuenta o servicio externo. La combinación de compilador propio, base estática de conocimiento y pruebas diferenciales tiene sentido para ese objetivo.

Pero el producto se apoya en una promesa delicada: explicar bien y parecerse a GCC en un subconjunto definido. Hoy esa promesa está debilitada por tres fallas: el comparador puede aprobar códigos de salida distintos, el validador puede certificar una versión de GCC que no comprobó y el entrenador puede elegir una explicación arbitraria entre plantillas parecidas. Esas tres cosas merecen prioridad absoluta porque afectan la confianza en el resto del sistema.

Después vienen los bordes del runtime —formatos dinámicos, scanf y UTF-8— y el ajuste de las promesas de documentación. No veo motivo para tirar el trabajo y empezar de cero. Veo motivo para endurecer la verificación y hacer que cada afirmación de compatibilidad esté respaldada por una prueba que realmente compruebe lo que dice.

Mi recomendación final: **no sumaría cientos de reglas nuevas ni más funciones de interfaz hasta cerrar H-01 a H-04.** Primero hacer confiable el criterio con el que el proyecto decide que algo está bien. Después sí, seguir ampliando el lenguaje y la base con una tranquilidad que hoy todavía no está justificada.

---

## 13. Archivos principales consultados

- README.md, CLAUDE.md, CAMBIOS_UI.md y LICENSE.
- build.js, index.html, manifest.webmanifest, sw.js.
- src/compiler.js, src/runtime.js, src/app.js, src/app.css, src/template.html.
- src/kb.js, src/compartir.js, src/proceso.js, src/config.js, src/examples.js, src/sw.js.
- tools/kb-validar.js, tools/kb-agregar-caso.js, tools/ui-smoke.js, tools/ui-reparos.js, tools/capturas-diseno.js.
- test/run_all.sh, test/diff.sh, test/run1.js, test/diag.js, test/fuzz.py, test/fuzz_run.sh, test/kb.test.js, test/proceso.test.js.
- docs/COMPATIBILIDAD.md, docs/DISENO.md, docs/PROCESO.md.
- kb/SCHEMA.md, kb/README.md, kb/PENDIENTES-REGLAS.md, kb/chatgpt/PROMPT_LOTE2.md y la base activa de errores, ayuda y lecciones.

**Este commit agrega solamente este informe. No modifica el compilador, runtime, interfaz, base de conocimiento, pruebas ni artefactos generados.**


## 14. Precisión adicional sobre la cobertura de lectura

Para que el alcance no se interprete de más: se inspeccionó el árbol completo y se revisaron los módulos fuente y herramientas centrales por secciones amplias, además de los contratos, documentación y datos activos. Los **247 archivos C de prueba (131 de comparación y 116 de diagnóstico) fueron inventariados por ruta y cobertura**, pero no se hizo una lectura línea por línea de cada uno de esos 247 programas. Tampoco se inspeccionaron visualmente, uno por uno, los 67 PNG de documentación. Los assets y el HTML generado se trataron como productos del build, no como fuentes independientes para una segunda auditoría manual completa.

La limitación más importante sigue siendo la misma: **no se ejecutaron las pruebas**. Por eso este documento es una auditoría estática sustancial, con defectos verificables directamente en el código y la base, pero no una certificación de que el repositorio completo compile, pase todas las suites o funcione correctamente en todos los navegadores. Para cumplir literalmente una lectura exhaustiva de cada fixture y cada imagen haría falta una pasada separada dedicada a esos artefactos.
