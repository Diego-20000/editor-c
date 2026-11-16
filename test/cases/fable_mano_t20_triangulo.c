#include <stdio.h>
int main() { int N, I, J; scanf("%d", &N); for (I = 1; I <= N; I++) { for (J = 0; J < N - I; J++) printf(" "); for (J = 0; J < 2 * I - 1; J++) printf("*"); printf("\n"); } return 0; }
