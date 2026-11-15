#include <stdio.h>
int main() { char L[40]; int N = 0; while (fgets(L, 40, stdin) != NULL) { N++; printf("%d:%s", N, L); } printf("<%d>\n", N); return 0; }
