#include <stdio.h>
int main() { char A, B, C; int N; N = scanf("%c%c%c", &A, &B, &C); printf("%d %d %d %d\n", N, A, B, C); N = scanf(" %c %c", &A, &B); printf("%d %c%c\n", N, A, B); return 0; }
