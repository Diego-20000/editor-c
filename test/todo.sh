#!/bin/bash
# Corre TODAS las pruebas y muestra un resumen de una pantalla. No necesita Claude ni conexión: solo node, gcc, python3 y (para la interfaz) playwright.
# uso: bash test/todo.sh [--rapido] [--kb] [--fuzz N]
#   --rapido   sin las pruebas de interfaz (las que abren Chromium)
#   --kb       además valida contra gcc todos los archivos de kb/errores (tarda varios minutos)
#   --fuzz N   cantidad de programas aleatorios (por defecto 30)
# Termina con 0 si todo está en verde y con 1 si algo falla. El detalle de lo que falló queda en test/informes/ultimo.txt
cd "$(dirname "$0")/.." || exit 2
RAPIDO=0; KB=0; FUZZ=30
while [ $# -gt 0 ]; do case "$1" in --rapido) RAPIDO=1;; --kb) KB=1;; --fuzz) shift; FUZZ="${1:-30}";; *) echo "opción desconocida: $1"; exit 2;; esac; shift; done
mkdir -p test/informes; INF=test/informes/ultimo.txt; : > "$INF"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
OK=0; MAL=0; INICIO=$(date +%s)
paso() { # paso "nombre" "tiempo máximo en segundos" comando...
  local nombre="$1" max="$2"; shift 2
  local t0=$(date +%s); timeout "$max" "$@" > "$T/sal.txt" 2>&1 < /dev/null; local rc=$?
  local seg=$(( $(date +%s) - t0 )); local resumen
  resumen=$(grep -E "iguales a gcc|diagnósticos|pruebas bien|casos bien|ok, [0-9]+ fallas|sin problemas|versión|programas aleatorios" "$T/sal.txt" | tail -1 | tr -s ' ' | cut -c1-70)
  [ -z "$resumen" ] && resumen=$(grep -v '^\s*$' "$T/sal.txt" | tail -1 | cut -c1-70)
  if [ "$rc" = 0 ]; then OK=$((OK+1)); printf "  ✔ %-28s %4ss  %s\n" "$nombre" "$seg" "$resumen"
  else MAL=$((MAL+1)); [ "$rc" = 124 ] && resumen="se pasó del tiempo máximo (${max}s)"; printf "  ✘ %-28s %4ss  %s\n" "$nombre" "$seg" "$resumen"
    { echo "=== $nombre (código $rc)"; grep -v "^  ok\|^OK " "$T/sal.txt" | head -60; echo; } >> "$INF"; fi
}
echo "Editor C: todas las pruebas ($(date '+%d/%m/%Y %H:%M'), $(gcc -dumpversion 2>/dev/null | sed 's/^/gcc /'))"
echo
paso "Armar el sitio"                 120 node build.js
paso "Motor contra gcc"               600 bash test/run_all.sh
paso "Programas aleatorios contra gcc" 900 bash test/fuzz_run.sh "$FUZZ"
paso "Diagnósticos del compilador"    300 node test/diag.js
paso "Base de conocimiento (módulos)" 300 node test/kb.test.js
paso "Evidencia de proceso"           300 node test/proceso.test.js
paso "Ejemplos del editor"            300 node test/ejemplos.js
if [ "$KB" = 1 ]; then
  for f in kb/errores/*.json kb/lecciones.json; do paso "Base contra gcc: $(basename "$f" .json)" 900 bash -c "cd \"$T\" && node \"$OLDPWD/tools/kb-validar.js\" \"$OLDPWD/$f\" --silencio"; done
fi
if [ "$RAPIDO" = 0 ]; then
  paso "Interfaz (completa)"          900 node tools/ui-smoke.js
  paso "Interfaz (reparos)"           300 node tools/ui-reparos.js
  paso "Enlace entre dispositivos"    300 node tools/ui-enlace.js
fi
echo
FIN=$(( $(date +%s) - INICIO ))
if [ "$MAL" = 0 ]; then echo "TODO EN VERDE: $OK pasos, ${FIN}s."; rm -f "$INF"; exit 0
else echo "HAY $MAL PASO(S) EN ROJO de $((OK+MAL)) (${FIN}s). Detalle en $INF"; exit 1; fi
