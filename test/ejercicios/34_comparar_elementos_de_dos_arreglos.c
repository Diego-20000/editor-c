#include <stdio.h>

int main(void) {
    int A[5], B[5], N, I, J, COMBINACIONES = 0;

    scanf("%d", &N);
    if (N < 1 || N > 5) {
        printf("Cantidad invalida\n");
        return 0;
    }
    for (I = 0; I < N; I++) scanf("%d", &A[I]);
    for (I = 0; I < N; I++) scanf("%d", &B[I]);

    for (I = 0; I < N; I++) {
        for (J = 0; J < N; J++) {
            if (A[I] > B[J]) COMBINACIONES++;
        }
    }

    printf("Pares con A mayor que B: %d\n", COMBINACIONES);
    return 0;
}
