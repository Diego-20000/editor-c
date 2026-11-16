#include <stdio.h>
#include <stdlib.h>
int main() { int C[7] = {0}, I, S; scanf("%d", &S); srand(S); for (I = 0; I < 600; I++) C[rand() % 6 + 1]++; for (I = 1; I <= 6; I++) printf("%d:%d ", I, C[I]); printf("\n"); return 0; }
