# Revisión de estado de Editor C — 10 de noviembre de 2026

**Destino:** rama `chatgpt`  
**Repositorio:** `Diego-20000/editor-c`  
**Base de producto inspeccionada:** `main`, árbol `b43cec39ca362302358196d94273d28615517759`  
**Rama de trabajo:** `chatgpt`, cabeza `d2d9cb511ab0bb9ab4556fd1de66eff1a6c77b85`  
**Tipo de revisión:** lectura estática; no se ejecutaron Node, GCC ni Playwright.

---

## 1. Resumen ejecutivo

La revisión integral del 9/11 ya había identificado problemas importantes. Al contrastar sus hallazgos con el estado actual de `main`, hay una buena noticia: **cuatro de los problemas centrales de aquella auditoría están corregidos**. No corresponde seguir tratándolos como defectos vigentes.

- El comparador diferencial ahora exige igualdad exacta de stdout y código de salida, y rechaza el timeout 124.
- El entrenador ya no elige arbitrariamente el primer registro cuando una plantilla tiene varios candidatos.
- El validador comprueba que GCC sea versión 13 antes de certificar la base.
- El validador compara también el código de salida de programas corregidos y lecciones.

Sin embargo, siguen existiendo bordes de compatibilidad en `scanf` y UTF-8, y encontré un problema residual en la propia herramienta de validación: puede confundir timeout/señal con un resultado comparable y puede certificar GCC 13 si se usa una variable de entorno que explícitamente saltea el control de versión.

También hay una contradicción legal en el README: anuncia MIT y, a continuación, PolyForm Strict, mientras que el archivo LICENSE contiene PolyForm Strict. Esto debe resolverse antes de distribuir el proyecto.

**No recomiendo reescribir el compilador ni agregar más reglas de diagnóstico todavía.** El paso de mayor retorno es cerrar la confiabilidad de la validación y hacer que la documentación describa exactamente lo que el programa implementa.

## 2. Estado de los hallazgos de la auditoría anterior

| Hallazgo del 9/11 | Estado en `main` al 10/11 | Evidencia |
|---|---|---|
| H-01: `test/diff.sh` aceptaba códigos de salida diferentes | **Corregido** | Compara `rc_ref = rc_my` y excluye 124 |
| H-02: `src/kb.js` podía elegir `lista[0]` ante una plantilla ambigua | **Corregido** | Solo acepta coincidencia única; si no, sigue buscando evidencia inequívoca o devuelve null |
| H-03: `tools/kb-validar.js` no exigía GCC 13 | **Corregido parcialmente** | Verifica major 13, pero `KB_SIN_GCC13` permite saltar el control y aun así `--arreglar` escribe true |
| H-04: el validador ignoraba el código de salida | **Corregido** | Compara stdout y code para programas corregidos y lecciones |
| R-01: límite dinámico de ancho/precisión | **Corregido** | Comprueba el valor resuelto de `*` contra 100000 |
| R-02: `scanf("%%")` consume espacios indebidamente | **Pendiente** | Sigue llamando a `skipWs()` antes de comparar el porcentaje literal |
| R-03: entrada UTF-8 no procesada como bytes | **Pendiente** | `peek()` usa `charCodeAt()` sobre strings UTF-16 |
| R-04: documentación promete todos los formatos | **Pendiente** | README todavía usa «todos sus formatos» |
| R-05: escapes universales de C | **Pendiente de revalidación** | La auditoría anterior lo detectó; hace falta confirmar si hubo cambios posteriores en el lexer |
| R-06: fallback sin Worker puede bloquear durante compilación | **Limitación vigente/documentada** | README reconoce que la compilación de respaldo puede bloquear |

Esta tabla evita duplicar trabajo: los cuatro primeros arreglos deben conservarse con pruebas de regresión, no volver a implementarse.

## 3. Hallazgos nuevos o todavía vigentes

### V-01 — El validador puede certificar GCC 13 después de saltarse el control de versión

**Severidad: alta. Archivo:** `tools/kb-validar.js`.

El archivo permite continuar cuando `KB_SIN_GCC13` está definido:

```js
if (gccMayor !== '13' && !process.env.KB_SIN_GCC13) {
  // aborta
}
```

Pero más adelante, con `--arreglar`, asigna incondicionalmente:

```js
e.verificado_gcc13 = true;
```

Por lo tanto, el modo de excepción puede producir un registro que afirma haber sido verificado con GCC 13 aunque se haya usado otra versión. Eso contradice el significado normativo del campo en `kb/SCHEMA.md`.

**Propuesta:** separar «se permitió ejecutar con otra versión» de «se certificó GCC 13». Con la variable de excepción, el validador puede servir para pruebas locales, pero debe guardar `verificado_gcc13: false` y advertir que el resultado no es certificable. Mejor todavía: que el modo de excepción no permita `--arreglar` sobre los campos de verificación.

### V-02 — El validador confunde timeout, señal y error de ejecución

**Severidad: alta. Archivo:** `tools/kb-validar.js`, función `correr()` y función `editor()`.

Ambas funciones reducen cualquier `p.status === null` al texto `'señal'`. En `spawnSync`, un estado nulo también puede aparecer por timeout o por un error al iniciar el proceso; además, `p.error`, `p.signal` y `p.stderr` no se conservan en el resultado normalizado.

Esto permite que dos procesos que no terminaron correctamente se representen con el mismo código artificial. Si ambos imprimieron lo mismo antes de quedar colgados, la comparación puede considerarlos iguales. La corrección de H-04 no cubre este caso porque compara dos valores ya normalizados de forma ambigua.

**Propuesta:** devolver un resultado estructurado: `{stdout, status, signal, error, timedOut}`. La validación solo debe aceptar equivalencia cuando ambos procesos terminaron normalmente, sin timeout ni error de lanzamiento, y coinciden stdout y código de salida. Un proceso terminado por señal debe ser un fallo explícito, no un código comparable.

### V-03 — `scanf("%%")` consume espacios que C no debería descartar

**Severidad: media. Archivo:** `src/runtime.js`, función `scanf()`.

El caso de porcentaje literal ejecuta `await skipWs()` antes de verificar que el siguiente carácter de entrada sea `%`. En `scanf`, `%%` coincide con un porcentaje literal; no es una conversión que descarte espacios iniciales.

**Ejemplo mínimo para agregar a la suite:** formato `"%%"` y entrada `" %"`. El editor no debería consumir el espacio para hacer coincidir el porcentaje.

**Propuesta:** comparar el byte/caracter actual sin llamar a `skipWs()`, y agregar pruebas con espacio, tabulación, porcentaje correcto y porcentaje ausente. Ejecutar cada caso contra GCC 13.

### V-04 — La entrada del runtime sigue modelada como UTF-16, no como bytes UTF-8

**Severidad: media-alta. Archivo:** `src/runtime.js`.

El contrato de compatibilidad dice que los textos se comportan como bytes UTF-8. Sin embargo, la entrada se acumula en un string JavaScript y `peek()` devuelve `buf.charCodeAt(pos)`. Eso recorre unidades UTF-16, no bytes UTF-8.

El problema se propaga a `getchar`, `scanf("%c")`, `scanf("%s")`, conjuntos de `%[]` y límites de ancho. La función `aBytes()` codifica luego el texto, pero hacerlo después de haber contado y consumido unidades UTF-16 no recupera la semántica byte-oriented.

**Propuesta:** convertir stdin una sola vez a bytes UTF-8 y mantener el cursor sobre un `Uint8Array`. `getchar`, `scanf` y `fgets` deben consumir bytes; la conversión a texto se realiza al presentar la salida o cuando la operación de C correspondiente lo requiera. Agregar casos con ñ, vocales acentuadas, caracteres multibyte, emoji y límites de ancho/buffer.

Si no se quiere asumir ese cambio ahora, hay que reducir el contrato de compatibilidad y declarar el límite. No conviene afirmar compatibilidad de bytes si el cursor cuenta unidades UTF-16.

### V-05 — Contradicción de licencia en README

**Severidad: alta para distribución. Archivos:** `README.md` y `LICENSE`.

El README tiene dos secciones tituladas «Licencia». La primera declara:

```
MIT © 2026 ArtPrograms Studio
```

La segunda dice que el uso es solo dentro del sitio y no permite copiar, modificar, redistribuir ni vender, y enlaza PolyForm Strict 1.0.0. El archivo `LICENSE` contiene efectivamente PolyForm Strict 1.0.0, no MIT.

No son licencias intercambiables: MIT permite redistribución y obras derivadas bajo sus condiciones; PolyForm Strict no concede esos permisos generales.

**Propuesta:** eliminar la declaración MIT si la intención vigente es PolyForm Strict, y dejar una única sección de licencia coherente en README. Revisar también los avisos generados por `build.js`, que ya nombran PolyForm Strict. No cambiar la licencia sin una decisión explícita de Diego.

### V-06 — «No hay pedidos de red» es una afirmación demasiado absoluta

**Severidad: media. Archivos:** `README.md`, `CLAUDE.md`, `src/app.js`, `src/sw.js`.

El proyecto no envía el código automáticamente ni usa backend o analítica, pero la versión web descarga recursos y el service worker consulta actualizaciones al origen. El README dice «todo local» y «no hay pedidos de red», lo que puede entenderse como que el navegador no realiza ninguna petición.

**Propuesta:** usar una frase precisa: «El código del alumno se procesa localmente y no se envía a un servidor. La versión web descarga y consulta actualizaciones del sitio; compartir casos es una acción voluntaria del alumno». Distinguir privacidad del código de ausencia total de tráfico de red.

### V-07 — La documentación del producto no está sincronizada

**Severidad: media. Archivos:** `README.md`, `CLAUDE.md` y documentación pedagógica.

Hay diferencias sobre los niveles de ayuda: README describe niveles 0, 1 y 2 y dice que el nivel predeterminado es 1; CLAUDE.md habla de solo dos niveles y de nivel 1 apagado/nivel 2 encendido. Además, CLAUDE.md dice que el esquema de ayuda todavía falta implementar, mientras que la interfaz y `src/kb.js` ya contienen un entrenador funcional con pistas progresivas.

**Propuesta:** decidir cuál es la política vigente y actualizar ambos documentos en una sola pasada. CLAUDE.md debe funcionar como contrato actual, no como registro histórico mezclado con decisiones viejas. Las decisiones fechadas que ya no aplican deberían moverse a un historial o eliminarse.

## 4. Estado de arquitectura y producto

### Lo que conservaría

- Sitio estático, sin backend, sin cuentas y sin dependencia de servicios externos.
- Compilador propio C → JavaScript y runtime separado.
- Worker para aislar compilación y ejecución cuando el navegador lo permite.
- Fuente de verdad en `src/` y `kb/`; `assets/`, `index.html` y `dist/` como artefactos generados.
- Ayuda progresiva y conservadora: si la base no identifica inequívocamente un error, es preferible no mostrar una explicación incorrecta.
- Evidencia de proceso local, sin venderla como detector de IA.
- Suite diferencial contra GCC y casos de regresión pequeños.

### Lo que no haría todavía

- No reescribiría el compilador.
- No migraría todo a TypeScript ni agregaría un framework por moda.
- No sumaría cientos de diagnósticos nuevos hasta que el validador sea incapaz de certificar resultados incompletos.
- No agregaría IA dentro del editor: contradice el diseño deliberado del producto.
- No editaría manualmente `assets/` ni `dist/`.

### Riesgo de mantenimiento: archivos grandes

`src/compiler.js` tiene alrededor de 2.700 líneas y `src/app.js` alrededor de 1.900. No es una razón suficiente para fragmentarlos de inmediato: una división prematura puede crear dependencias circulares o hacer más difícil seguir el flujo del compilador.

Sí conviene establecer límites internos claros y extraer módulos solo cuando exista una frontera real y pruebas que cubran la interfaz entre ellos. En el compilador, lexer/preprocesador, parser, generador y reglas de diagnóstico son candidatos naturales, pero no recomiendo una refactorización masiva antes de cerrar la validación.

## 5. Orden de trabajo recomendado

1. **Endurecer `tools/kb-validar.js`:** resultados de proceso estructurados; timeout, señal y error separados; GCC 13 no certificable si se usa el bypass.
2. **Corregir `scanf("%%")`:** caso diferencial mínimo contra GCC 13.
3. **Resolver UTF-8 en stdin:** diseñar cursor por bytes y agregar regresiones antes de cambiar implementación.
4. **Corregir documentación legal:** una sola licencia coherente; requiere confirmar que PolyForm Strict sigue siendo la decisión.
5. **Sincronizar documentación pedagógica y privacidad:** niveles reales de ayuda, estado del entrenador y redacción precisa sobre tráfico.
6. **Automatizar la puerta de calidad:** fijar Node, GCC 13 y Playwright; ejecutar build, pruebas diferenciales, diagnósticos, KB, proceso y UI en CI.

## 6. Pruebas de regresión mínimas que agregaría

- Validador: GCC 12 + `KB_SIN_GCC13=1` nunca produce `verificado_gcc13: true`.
- Validador: timeout de GCC, timeout del editor, señal y error de lanzamiento se reportan como fallos distintos.
- Validador: stdout igual pero exit code distinto no certifica.
- `scanf("%%")`: entrada con espacio previo no debe coincidir tras descartar ese espacio.
- UTF-8: `scanf("%c")`, `scanf("%s")`, `getchar()` y `fgets()` con texto acentuado y límites byte-exactos.
- KB: una plantilla ambigua no debe mostrar una explicación; una coincidencia inequívoca sí.
- Build: README, licencia y avisos generados no deben contradecir el archivo LICENSE.

## 7. Alcance y honestidad de esta revisión

Inspeccioné el árbol completo de ambas ramas y leí los documentos centrales, el esquema y la base, además de revisar los módulos fuente principales de `main`: compilador, runtime, aplicación, KB, proceso, compartir, estilos, plantilla, build, service worker, herramientas de validación y runners de pruebas. Comparé los hallazgos del informe anterior con las implementaciones actuales.

No ejecuté los comandos del proyecto. Por eso no declaro tests en verde ni afirmo que los ejemplos nuevos ya reproduzcan un fallo en ejecución. Los hallazgos de este documento son conclusiones de inspección estática y deben convertirse en pruebas de regresión antes de corregir el comportamiento.

Tampoco afirmo haber leído línea por línea cada fixture C ni inspeccionado visualmente cada captura PNG; el inventario del árbol no equivale a una auditoría individual de esos artefactos.

---

## Conclusión

Editor C ya está bastante más cerca de una base técnica confiable que lo que sugería la auditoría del 9/11: varios de sus defectos más graves fueron corregidos. Eso merece reconocerse.

Mi crítica principal ahora es más específica: **el proyecto necesita que sus herramientas de validación sean tan rigurosas como el contrato que promete**. No alcanza con que el editor dé una salida parecida; hay que saber que GCC y el intérprete terminaron, que se compararon las mismas condiciones y que la versión de GCC certificada fue realmente la declarada.

Después de eso, cerraría los bordes de `scanf` y UTF-8 y limpiaría las contradicciones de documentación. La arquitectura general merece continuar; no necesita una demolición, necesita una cadena de verificación más fuerte.

**Este documento no modifica el producto ni reemplaza la auditoría integral anterior. Es una revisión de seguimiento del estado actual de `main`, guardada en la rama `chatgpt`.**
