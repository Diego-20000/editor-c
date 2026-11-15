#include <stdio.h>
int main() { int A = 0, I; float F = 0.0f; char C = '\0'; if (A) printf("a"); if (!F) printf("f"); if (!C) printf("c"); if (-1) printf("n"); if (0.1) printf("d"); if ('0') printf("z"); printf("\n"); for (I = 3; I; I--) printf("%d", I); while (A - 3) A++; printf(" %d %d\n", A, !!A + !A); return 0; }
