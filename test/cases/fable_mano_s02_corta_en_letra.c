#include <stdio.h>
int main() { int A = 1, B = 2, N; char C = '?'; N = scanf("%d%d", &A, &B); printf("%d %d %d\n", N, A, B); N = scanf("%c", &C); printf("%d [%c]\n", N, C); return 0; }
