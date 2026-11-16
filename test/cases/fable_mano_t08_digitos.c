#include <stdio.h>
int main() { long N; int S = 0, C = 0, INV = 0, D; scanf("%ld", &N); if (N < 0) N = -N; do { D = N % 10; S += D; C++; INV = INV * 10 + D; N /= 10; } while (N > 0); printf("%d %d %d\n", C, S, INV); return 0; }
