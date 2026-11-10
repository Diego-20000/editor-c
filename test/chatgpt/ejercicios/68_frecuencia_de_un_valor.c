#include <stdio.h>
int main(void) {
    int A[10], N, X, I, C = 0;
    scanf("%d", &N);
    if (N < 1 || N > 10) return 0;
    for (I = 0; I < N; I++) scanf("%d", &A[I]);
    scanf("%d", &X);
    for (I = 0; I < N; I++) if (A[I] == X) C++;
    printf("Frecuencia: %d\n", C);
    return 0;
}
