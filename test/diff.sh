#!/bin/bash
# uso: diff.sh archivo.c [entrada]  -> compara salida y código de salida de gcc contra el intérprete
# termina con 0 si coinciden y con 1 si hay diferencia (o si gcc no compila)
f="$1"; in="${2:-/dev/null}"; [ -f "${f%.c}.in" ] && [ "$in" = "/dev/null" ] && in="${f%.c}.in"
T="${TMPDIR:-/tmp}/_ed$$"; mkdir -p "$T"; trap 'rm -rf "$T"' EXIT
gcc -std=${STD:-gnu99} $GCCFLAGS -w "$f" -o "$T/ref" -lm 2>"$T/gccerr" || { echo "GCC FAIL $f"; head -3 "$T/gccerr"; exit 1; }
timeout 5 "$T/ref" < "$in" > "$T/ref.out" 2>/dev/null; rc_ref=$?
timeout 10 node "$(dirname "$0")/run1.js" "$f" < "$in" > "$T/my.out" 2>"$T/my.err"; rc_my=$?
# el código de salida tiene que ser exactamente el mismo; un timeout (124) nunca cuenta como coincidencia
rc_ok=0
if [ "$rc_ref" = "$rc_my" ] && [ "$rc_ref" != 124 ]; then rc_ok=1; fi
if cmp -s "$T/ref.out" "$T/my.out" && [ "$rc_ok" = 1 ]; then echo "OK   $f"; exit 0; fi
echo "DIFF $f (código de salida: gcc=$rc_ref editor=$rc_my)"
diff <(cat -A "$T/ref.out") <(cat -A "$T/my.out") | head -${LINES_MAX:-12}; head -3 "$T/my.err"
exit 1
