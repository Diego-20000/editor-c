#!/bin/bash
# uso: fuzz2_run.sh [CANTIDAD] [PRIMERA_SEMILLA] [DIRECTORIO_PARA_GUARDAR_LAS_DIFERENCIAS]
# Genera programas completos con test/fuzz2.py y compara cada uno contra gcc (salida y código de salida).
# Un programa que gcc no compila sin errores es una falla del generador y también se cuenta. Termina con 1 si algo difiere.
cd "$(dirname "$0")"; n="${1:-50}"; s0="${2:-1}"; keep="$3"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
uno() { # semilla
  local f="$T/z$1.c"
  python3 fuzz2.py "$1" "$f" || { echo "GEN $1"; return; }
  TMPDIR="$T/d$1" bash ./diff.sh "$f" > "$T/z$1.res" 2>&1 || { echo "DIFF con semilla $1"; head -8 "$T/z$1.res"; [ -n "$keep" ] && mkdir -p "$keep" && cp "$f" "${f%.c}.in" "$keep/"; }
}
export -f uno; export T keep
seq "$s0" $((s0 + n - 1)) | xargs -P "$(nproc)" -I{} bash -c 'mkdir -p "$T/d{}"; uno {}' > "$T/todo.txt"
fail=$(grep -c "^DIFF\|^GEN" "$T/todo.txt"); head -40 "$T/todo.txt"
echo "$((n - fail))/$n programas completos iguales a gcc"; [ "$fail" = 0 ]
