#include <stdio.h>
int main() { long A = 2147483647; long B = A * 2; long C = 1L << 40; int I = 100000; long D = (long) I * I; long E = 9223372036854775807L; printf("%ld %ld %ld %ld\n", B, C, D, E); printf("%ld %ld\n", E / 1000000007L, E % 1000000007L); unsigned long U = E; U = U * 2 + 1; printf("%lu\n", U); I = (int) (C + 5); printf("%d\n", I); printf("%ld\n", -E - 1); return 0; }
