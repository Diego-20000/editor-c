#include <stdio.h>

int main(void) {
    int DATOS[10], N, I;

    scanf("%d", &N);
    if (N < 1 || N > 10) {
        printf("Cantidad invalida\n");
        return 0;
    }
    for (I = 0; I < N; I++) {
        scanf("%d", &DATOS[I]);
    }

    printf("Orden inverso:");
    for (I = N - 1; I >= 0; I--) {
        printf(" %d", DATOS[I]);
    }
    printf("\n");
    return 0;
}
