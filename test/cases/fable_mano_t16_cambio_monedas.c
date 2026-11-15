#include <stdio.h>
int main() { int M[6] = {1000, 500, 100, 50, 10, 1}, P, I; scanf("%d", &P); for (I = 0; I < 6; I++) { if (P / M[I] > 0) printf("%d de %d\n", P / M[I], M[I]); P %= M[I]; } return 0; }
