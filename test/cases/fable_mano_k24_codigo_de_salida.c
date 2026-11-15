#include <stdio.h>
#include <stdlib.h>
void salir(int N) { if (N > 2) exit(N * 100 + 44); salir(N + 1); }
int main() { printf("antes\n"); salir(0); printf("despues\n"); return 1; }
