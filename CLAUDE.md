# Editor C — contexto del proyecto

Leé esto antes de proponer o cambiar algo. Está escrito para cualquier sesión de Claude, agente o ChatGPT que trabaje en el repo.

## Qué es
Un editor de C que corre en el navegador, para alumnos de 5.º año de la E.E.S.T. N.º 8 de Morón (materia Lenguajes Electrónicos V, profesor Esteban Brizuela, repo de la materia: `Diego-20000/brizuela`). Lo hace Diego Segurotti (ArtPrograms Studio) para él, sus compañeros y los alumnos del profesor. Objetivo: un entorno de verificación **tan fiel a gcc como sea posible** para los programas de la materia, mejor que Programiz u OnlineGDB.

## Restricción de arquitectura que no se negocia: es un sitio ESTÁTICO en GitHub Pages
- **No hay servidor, ni backend, ni base de datos, ni cuentas, ni API.** Solo archivos que el navegador descarga y ejecuta. (`index.html` + `assets/`, y `dist/editor-c.html` en un solo archivo.)
- Por eso el compilador es propio (C → JavaScript, en un Web Worker) y no se puede llamar a gcc ni a clang en un servidor. Un compilador real en WebAssembly existe, pero pesa unos 100 MB, y no cumple las demás reglas.
- **Todo funciona sin conexión** y también abriendo el archivo con doble clic (`file://`). Sin CDNs externos, sin fuentes de Google, sin analítica, sin servicios de terceros: el navegador solo descarga los archivos del propio sitio (y el service worker consulta si hay una versión nueva).
- **Nada del código del alumno sale de su dispositivo.** Los programas se guardan en el navegador (localStorage). No hay forma de que el profesor reciba datos del editor: la entrega es una **captura/imagen** que el alumno sube a Classroom.
- **No hay IA dentro del editor.** Es decisión de Diego. Ninguna función puede depender de un modelo ni de una API. ChatGPT o Claude se usan solo afuera, para generar ideas y textos que después se validan contra gcc y se guardan como datos fijos.
- Cualquier idea que necesite un servidor (ranking, cuentas, tablero del profesor, corrección en línea, detectores) está fuera, salvo que se resuelva con archivos estáticos o con datos que el alumno lleva.

## Cómo piensa Diego la enseñanza
- La idea no es facilitar la escritura ni decirle al alumno exactamente dónde está el error, sino que **piense y tipee**.
- **Referencia: Photomath como «entrenador».** Lo que Diego quiere imitar es cómo «sabe» responder a todo sin ser IA: un **motor de reglas + una base de conocimiento** hecha a mano. Acá: el editor reconoce el caso con reglas fijas (`scanf` sin `&`, contador sin inicializar, `PROM = A / N` con enteros…) y responde con textos ya escritos (qué pasó, por qué, pistas de menos a más, mini-lección). La base está en `kb/` (ver `kb/SCHEMA.md`), se arma afuera (ChatGPT, Claude, casos reales de los alumnos), se **valida contra gcc 13 y contra el editor** y se guarda como datos fijos. No hay foto ni OCR (Diego lo descartó).
- Además hay un **buscador interno** («¿por qué 7/2 da 3?», «¿qué es un prototipo?») que busca palabras en la base, sin modelo, y ayuda al tocar cualquier palabra de C.
- **Casos sin respuesta:** si el editor no sabe explicar algo, lo dice con honestidad (mensaje de gcc + «todavía no tengo una explicación») y guarda el caso en el dispositivo. El alumno **elige** mandárselo a Diego por **WhatsApp** (enlace `wa.me` con el texto armado; Diego lo agrega a la base) o exportarlo como archivo. Es la única salida de datos: **siempre por decisión del alumno, con vista previa, sin nombre ni datos personales, nunca automática.** El número de WhatsApp se configura en `src/config.js` (`WHATSAPP_NUMERO`).
- Valores por defecto decididos (el profesor los puede cambiar con `?ayuda=1|2` en el enlace o en Ajustes; todo se guarda en el dispositivo, no hay servidor): **ayuda nivel 1 = apagada (por defecto)**, como el profe, que no dice dónde está el error. **Nivel 2 = encendida: indica la línea y nada más** (sin sugerencias tipo «¿quisiste decir…?», sin señalar el elemento puntual). Solo hay esos dos niveles. Cierre automático de llaves y comillas **apagado** (que tipee todo).
- Decisión de Diego (08/11/2026, ya implementada): el alumno tiene que **encontrar** el error mirando el código; el editor no se lo entrega por defecto. Por eso la interfaz no muestra explicaciones ni pistas por error: esos textos viven en `kb/` y alimentan el buscador, el «¿qué es esto?» y «Avisar a Diego». Si algún día se quieren mostrar, es una decisión nueva de Diego.
- Medida local de cuánto código se tipeó y cuánto se pegó («evidencia de proceso»): se muestra en la captura de entrega, nunca como «detector de IA» (no existe una marca confiable en el código pegado). Todo se queda en el dispositivo.

## Lo que enseña la materia (alcance del lenguaje)
ANSI C básico: `char`, `int`, `float`, `double`, operadores, `printf`/`scanf` (`%d %f %5.2f %10d`), `if`/`else`, `for`, `while`, `switch`, funciones con prototipos, arreglos, `math.h`. Variables en MAYÚSCULAS. El método: algoritmo en papel → diagrama Nassi-Shneiderman → verificación → código C → pruebas en computadora. El apunte y las reglas están en `Diego-20000/brizuela` (`CLAUDE.md`, `REFERENCIA_CLAUDE_BRIZUELA.md`, PDFs).

## Reglas del producto
- Mensajes en español, cortos, con el número de línea. Un aviso nunca impide ejecutar; solo un error de compilación lo impide.
- No se agregan al lenguaje cosas que el profesor no enseña, salvo que sirvan para ser fiel a gcc.
- Qué se promete y qué no: `docs/COMPATIBILIDAD.md` (objetivo Linux x86-64, gcc 13, glibc; comportamiento indefinido fuera de contrato).
- Nunca afirmar que algo coincide con gcc si no se comparó: `bash test/run_all.sh`.

## Estado
- Soporta: tipos con `long` de 64 bits exactos, `short`, `unsigned`, `bool`; control de flujo; funciones con recursión y prototipos; arreglos 1D/2D (también como parámetro); textos (`char[]`, `%s`, `fgets`, `sprintf`, `string.h` básico); `#define` con parámetros y `#if`; `rand` igual que glibc; `printf`/`scanf` con todos los formatos.
- No soporta todavía: punteros en general, `struct`, `enum`, `typedef`, archivos, `long double`, `sscanf`, `strchr`/`strstr`/`strtok`.
- Interfaz: diseño estilo iOS con tema claro, oscuro y automático, panel de problemas según el nivel de ayuda, atajos, buscar y reemplazar, programas guardados, captura PNG (código, entrada y salida, abajo o lado a lado, con la línea de proceso), «Avisar a Diego» por WhatsApp, pasar un programa a otro dispositivo por enlace, PWA con service worker (solo en http/https), exportar/importar. Licencia: PolyForm Strict 1.0.0 (`LICENSE`).

## Cómo se trabaja
- Ramas: `main` es lo que se publica. Se trabaja en ramas y se integra con PR. No crear un PR si no lo pidió Diego.
- Comandos (necesitan `node` y `gcc`; la interfaz necesita `playwright`):
  - **`bash test/todo.sh`** corre todas las pruebas y muestra un resumen de una pantalla (`--rapido` sin interfaz, `--kb` valida también la base contra gcc, `--fuzz N` cantidad de programas aleatorios). Sale con 1 si algo falla y deja el detalle en `test/informes/ultimo.txt`.
  - `node build.js` genera el sitio desde `src/`.
  - `bash test/run_all.sh` compara cada programa de `test/cases` contra gcc (salida y código de salida).
  - `node test/diag.js` verifica los diagnósticos esperados de `test/diag`.
  - `bash test/fuzz_run.sh` compara programas aleatorios contra gcc.
  - `node tools/ui-smoke.js`, `node tools/ui-reparos.js` y `node tools/ui-enlace.js` prueban la interfaz con Chromium.
- Nunca ejecutar código descargado de terceros (paquetes npm, etc.) sin que Diego lo autorice: el sistema de permisos lo bloquea.
- Antes de fusionar: tests de motor, diagnósticos e interfaz en verde, y un control final con agentes de prueba (programas estilo TP contra gcc, errores de alumnos, revisión del motor y prueba de punta a punta del sitio).

## Ideas futuras y descartadas (para que nada quede colgado)
- **Descartadas por las reglas del proyecto:** compilar con gcc real en WebAssembly/WebVM (necesita cabeceras que GitHub Pages no da, el disco se baja de la red y hay licencia para organizaciones), cuentas, servidor, IA, estadísticas de visitas, sincronizar en la nube.
- **Futuras, sin fecha:** código QR del enlace para pasar un programa; paso a paso con el valor de las variables (apagado por defecto); formateador de código; tercera tanda de ejercicios de ChatGPT con casos más exóticos (entradas con acentos, `scanf` raros, recursión, matrices); soporte de punteros/`struct` solo si algún profe lo pide.
- **Dominio propio y servidor:** recién cuando lo usen muchos profes. El sitio puede tener dominio propio sin servidor (GitHub Pages lo permite).
- Guía para profes: `docs/PARA_DOCENTES.md`.

## Preguntas abiertas
1. Fuente propia (monoespaciada libre) para el código: necesita aprobación de Diego; hoy se usan las del sistema.
2. Si las explicaciones y pistas por error de `kb/` se muestran de alguna forma (hoy no, por decisión pedagógica).
3. Revisión de ChatGPT (`docs/REVISION_ESTADO_2026-11-10.md`, rama `chatgpt`): lo vigente ya está corregido o documentado.
