#!/bin/bash
# corre todos los casos de test/cases contra gcc; termina con 1 si alguno falla
cd "$(dirname "$0")"; fail=0; n=0
for f in cases/*.c; do n=$((n+1)); bash ./diff.sh "$f" || fail=$((fail+1)); done
echo "$((n-fail))/$n casos iguales a gcc"; [ "$fail" = 0 ]
