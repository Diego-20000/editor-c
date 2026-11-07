# Prompt para ChatGPT — lote 2 de la base de conocimiento

Trabajás SOLO en la rama `chatgpt` del repo `Diego-20000/editor-c`. No toques `src/`, `test/`, `tools/` ni los archivos de `kb/errores/`, `kb/ayuda.json` o `kb/lecciones.json`.

Leé antes: `CLAUDE.md`, `kb/SCHEMA.md` y los archivos de `kb/errores/PRF.json` y `SCN.json` (para no repetir casos).

Tarea: crear errores NUEVOS de alumnos de 5.º año (ANSI C básico de la materia) para estas categorías:
- PRF (printf): hoy hay 45. Agregá 30 casos distintos.
- SCN (scanf): hoy hay 37. Agregá 30 casos distintos.
- EJE (errores de ejecución): hoy hay 20. Agregá 15.

Entregá un único archivo por categoría en `kb/chatgpt/lote2/PRF.json`, `SCN.json`, `EJE.json` (arreglo JSON, UTF-8), con el formato exacto de `kb/SCHEMA.md`. Ids desde PRF-046, SCN-038, EJE-021.

Reglas:
- `codigo_mal` completo y compilable con gcc 13 (`-std=gnu99`), máximo 12 líneas, variables en MAYÚSCULAS, sin repetir ni casi repetir casos existentes.
- No inventes lo que dice gcc ni lo que dice el editor: dejá `que_dice_gcc`, `mensaje_editor_actual`, `codigo_editor_actual`, `detectado_editor` como null/false y `verificado_gcc13: false`. Los completa el validador (`tools/kb-validar.js --arreglar`).
- Español rioplatense, mensajes de máximo 2 oraciones, 3 pistas progresivas que no den la solución completa.
- Nada que necesite servidor, IA o red.
