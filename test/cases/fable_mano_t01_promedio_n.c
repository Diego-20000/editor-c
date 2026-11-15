#include <stdio.h>
int main() { int N, I, X, S = 0, MAY, MEN; float P; scanf("%d", &N); for (I = 1; I <= N; I++) { scanf("%d", &X); S = S + X; if (I == 1 || X > MAY) MAY = X; if (I == 1 || X < MEN) MEN = X; } P = (float) S / N; printf("SUMA=%d PROM=%5.2f MAY=%d MEN=%d\n", S, P, MAY, MEN); return 0; }
