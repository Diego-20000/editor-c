#include <stdio.h>
int main(void) {
    int A[8], N, I, PRIMERO;
    scanf("%d", &N);
    if (N < 1 || N > 8) return 0;
    for (I = 0; I < N; I++) scanf("%d", &A[I]);
    PRIMERO = A[0];
    for (I = 0; I < N - 1; I++) A[I] = A[I + 1];
    A[N - 1] = PRIMERO;
    for (I = 0; I < N; I++) printf("%d ", A[I]);
    printf("\n");
    return 0;
}
