#include <stdio.h>
int ack(int M, int N) { if (M == 0) return N + 1; if (N == 0) return ack(M - 1, 1); return ack(M - 1, ack(M, N - 1)); }
int main() { long N = 27; int P = 0; while (N != 1) { N = N % 2 ? 3 * N + 1 : N / 2; P++; } printf("%d %d %d\n", ack(2, 3), ack(3, 3), P); return 0; }
