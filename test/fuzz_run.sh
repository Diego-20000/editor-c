#!/bin/bash
# uso: fuzz_run.sh [CANTIDAD_DE_SEMILLAS] [EXPRESIONES_POR_PROGRAMA]
# genera programas aleatorios, los compara contra gcc (con -fwrapv: el desborde de int con signo es comportamiento indefinido y el editor da la vuelta) y termina con 1 si alguno difiere
cd "$(dirname "$0")"; n="${1:-20}"; e="${2:-100}"; fail=0
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
for seed in $(seq 1 "$n"); do
  python3 fuzz.py "$seed" "$e" "$T/f$seed.c"
  GCCFLAGS=-fwrapv bash ./diff.sh "$T/f$seed.c" >/dev/null || { echo "DIFF con semilla $seed"; GCCFLAGS=-fwrapv bash ./diff.sh "$T/f$seed.c" | head -6; fail=$((fail+1)); }
done
echo "$((n-fail))/$n programas aleatorios iguales a gcc"; [ "$fail" = 0 ]
