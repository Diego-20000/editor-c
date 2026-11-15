#include <stdio.h>
int main() { long A = 0, B = 1, T; int I, N; scanf("%d", &N); for (I = 0; I < N; I++) { printf("%ld ", A); T = A + B; A = B; B = T; } printf("\n"); return 0; }
