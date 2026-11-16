#include <stdio.h>
int main() { int D, M, A, N; N = scanf("%d/%d/%d", &D, &M, &A); printf("%d %02d-%02d-%d\n", N, D, M, A); N = scanf(" (%d , %d)", &D, &M); printf("%d %d %d\n", N, D, M); return 0; }
