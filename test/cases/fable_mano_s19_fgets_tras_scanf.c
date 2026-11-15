#include <stdio.h>
#include <string.h>
int main() { int A; char T[30]; scanf("%d", &A); fgets(T, 30, stdin); printf("%d [%s] %d\n", A, T, (int) strlen(T)); fgets(T, 6, stdin); printf("[%s]\n", T); fgets(T, 30, stdin); printf("[%s]\n", T); if (fgets(T, 30, stdin) == NULL) printf("fin\n"); return 0; }
