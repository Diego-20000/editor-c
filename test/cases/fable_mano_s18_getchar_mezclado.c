#include <stdio.h>
int main() { int A, C, K = 0; scanf("%d", &A); while ((C = getchar()) != EOF) { if (C == '\n') printf("<nl>"); else putchar(C); K++; } printf("\n%d %d\n", A, K); return 0; }
