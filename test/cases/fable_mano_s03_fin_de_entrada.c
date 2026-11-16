#include <stdio.h>
int main() { int A = 9, N, S = 0, K = 0; while ((N = scanf("%d", &A)) == 1) { S += A; K++; } printf("%d %d %d %d\n", N, S, K, A); return 0; }
