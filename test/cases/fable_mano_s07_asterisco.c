#include <stdio.h>
int main() { int A, B, N; N = scanf("%d %*d %d", &A, &B); printf("%d %d %d\n", N, A, B); N = scanf("%*s %d", &A); printf("%d %d\n", N, A); return 0; }
