#include <stdio.h>
int main() { unsigned I; long S = 0; unsigned long P = 1; int K; for (I = 5; I > 0; I--) S += I; for (K = 0; K < 40; K++) P *= 3; printf("%ld %lu %u\n", S, P, I - 1); for (S = 1; S < 1000000000000L; S *= 10) ; printf("%ld\n", S); return 0; }
