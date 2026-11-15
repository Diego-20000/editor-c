#include <stdio.h>
int main() { int D, d, Q = 0, R; scanf("%d%d", &D, &d); R = D; while (R >= d) { R = R - d; Q++; } printf("COCIENTE=%d RESTO=%d %d\n", Q, R, D == Q * d + R); return 0; }
