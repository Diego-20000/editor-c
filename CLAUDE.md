# Editor C — contexto del proyecto

Leé esto antes de proponer o cambiar algo. Está escrito para cualquier sesión de Claude, agente o ChatGPT que trabaje en el repo.

## Qué es
Un editor de C que corre en el navegador, para alumnos de 5.º año de la E.E.S.T. N.º 8 de Morón (materia Lenguajes Electrónicos V, profesor Esteban Brizuela, repo de la materia: `Diego-20000/brizuela`). Lo hace Diego Segurotti (ArtPrograms Studio) para él, sus compañeros y los alumnos del profesor. Objetivo: un entorno de verificación **tan fiel a gcc como sea posible** para los programas de la materia, mejor que Programiz u OnlineGDB.

## Restricción de arquitectura que no se negocia: es un sitio ESTÁTICO en GitHub Pages
- **No hay servidor, ni backend, ni base de datos, ni cuentas, ni API.** Solo archivos que el navegador descarga y ejecuta. (`index.html` + `assets/`, y `dist/editor-c.html` en un solo archivo.)
- Por eso el compilador es propio (C → JavaScript, en un Web Worker) y no se puede llamar a gcc ni a clang en un servidor. Un compilador real en WebAssembly existe, pero pesa unos 100 MB, y no cumple las demás reglas.
- **Todo funciona sin conexión** y también abriendo el archivo con doble clic (`file://`). Sin CDNs externos, sin fuentes de Google, sin analítica, sin pedidos de red.
- **Nada del código del alumno sale de su dispositivo.** Los programas se guardan en el navegador (localStorage). No hay forma de que el profesor reciba datos del editor: la entrega es una **captura/imagen** que el alumno sube a Classroom.
- **No hay IA dentro del editor.** Es decisión de Diego. Ninguna función puede depender de un modelo ni de una API. ChatGPT o Claude se usan solo afuera, para generar ideas y textos que después se validan contra gcc y se guardan como datos fijos.
- Cualquier idea que necesite un servidor (ranking, cuentas, tablero del profesor, corrección en línea, detectores) está fuera, salvo que se resuelva con archivos estáticos o con datos que el alumno lleva.

## Cómo piensa Diego la enseñanza
- La idea no es facilitar la escritura ni decirle al alumno exactamente dónde está el error, sino que **piense y tipee**.
- **Referencia: Photomath como «entrenador».** Lo que Diego quiere imitar es cómo «sabe» responder a todo sin ser IA: un **motor de reglas + una base de conocimiento** hecha a mano. Acá: el editor reconoce el caso con reglas fijas (`scanf` sin `&`, contador sin inicializar, `PROM = A / N` con enteros…) y responde con textos ya escritos (qué pasó, por qué, pistas de menos a más, mini-lección). La base está en `kb/` (ver `kb/SCHEMA.md`), se arma afuera (ChatGPT, Claude, casos reales de los alumnos), se **valida contra gcc 13 y contra el editor** y se guarda como datos fijos. No hay foto ni OCR (Diego lo descartó).
- Además hay un **buscador interno** («¿por qué 7/2 da 3?», «¿qué es un prototipo?») que busca palabras en la base, sin modelo, y ayuda al tocar cualquier palabra de C.
- **Casos sin respuesta:** si el editor no sabe explicar algo, lo dice con honestidad (mensaje de gcc + «todavía no tengo una explicación») y guarda el caso en el dispositivo. El alumno **elige** mandárselo a Diego por **WhatsApp** (enlace `wa.me` con el texto armado; Diego lo agrega a la base) o exportarlo como archivo. Es la única salida de datos: **siempre por decisión del alumno, con vista previa, sin nombre ni datos personales, nunca automática.** El número de WhatsApp se configura en `src/config.js` (`WHATSAPP_NUMERO`).
- Valores por defecto decididos (el profesor los puede cambiar con `?ayuda=0|1|2` en el enlace o en Ajustes): ayuda nivel 1 (mensaje corto y pistas, sin la solución), cierre automático de llaves y comillas **apagado** (que tipee todo).
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
- Interfaz: panel de problemas, atajos, buscar y reemplazar, programas guardados, captura PNG, PWA con service worker (solo en http/https), exportar/importar.

## Cómo se trabaja
- Ramas: `main` es lo que se publica. Se trabaja en ramas y se integra con PR. No crear un PR si no lo pidió Diego.
- Comandos (necesitan `node` y `gcc`; la interfaz necesita `playwright`):
  - `node build.js` genera el sitio desde `src/`.
  - `bash test/run_all.sh` compara cada programa de `test/cases` contra gcc (salida y código de salida).
  - `node test/diag.js` verifica los diagnósticos esperados de `test/diag`.
  - `bash test/fuzz_run.sh` compara programas aleatorios contra gcc.
  - `node tools/ui-smoke.js` y `node tools/ui-reparos.js` prueban la interfaz con Chromium.
- Nunca ejecutar código descargado de terceros (paquetes npm, etc.) sin que Diego lo autorice: el sistema de permisos lo bloquea.
- Antes de fusionar: tests de motor, diagnósticos e interfaz en verde, y un control final con agentes de prueba (programas estilo TP contra gcc, errores de alumnos, revisión del motor y prueba de punta a punta del sitio).

## Preguntas abiertas
1. Número de WhatsApp de Diego para `src/config.js` (`WHATSAPP_NUMERO`); mientras falte, el botón abre WhatsApp sin destinatario.
2. Dirección de diseño para pulir la interfaz (Diego quiere «más lindo», sin estilo genérico de IA, pensando en funciones útiles y que el alumno piense y tipee).
