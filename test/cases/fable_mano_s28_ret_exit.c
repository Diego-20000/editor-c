#include <stdio.h>
#include <stdlib.h>
int main() { int A; if (scanf("%d", &A) != 1) { printf("mal\n"); exit(3); } printf("%d\n", A); return A % 256; }
