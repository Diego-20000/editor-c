#include <stdio.h>
int main() { int N, B[32], I = 0; scanf("%d", &N); if (N == 0) B[I++] = 0; while (N > 0) { B[I++] = N % 2; N /= 2; } while (I > 0) printf("%d", B[--I]); printf("\n"); return 0; }
