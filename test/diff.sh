#!/bin/bash
# uso: diff.sh archivo.c [entrada]  -> compara salida de gcc contra el intérprete
f="$1"; in="${2:-/dev/null}"; [ -f "${f%.c}.in" ] && [ "$in" = "/dev/null" ] && in="${f%.c}.in"
gcc -std=${STD:-gnu89} -w "$f" -o /tmp/_ref -lm 2>/tmp/_gccerr || { echo "GCC FAIL $f"; head -3 /tmp/_gccerr; exit 1; }
timeout 5 /tmp/_ref < "$in" > /tmp/_ref.out 2>/dev/null
timeout 10 node "$(dirname "$0")/run1.js" "$f" < "$in" > /tmp/_my.out 2>/tmp/_my.err
if cmp -s /tmp/_ref.out /tmp/_my.out; then echo "OK   $f"; else echo "DIFF $f"; diff <(cat -A /tmp/_ref.out) <(cat -A /tmp/_my.out) | head -${LINES_MAX:-12}; head -3 /tmp/_my.err; fi
