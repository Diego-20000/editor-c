#include <stdio.h>

int main(void) {
    int DATOS[10], N, I;
    int CANTIDAD_PARES = 0, SUMA_PARES = 0;

    scanf("%d", &N);
    if (N < 1 || N > 10) {
        printf("Cantidad invalida\n");
        return 0;
    }

    for (I = 0; I < N; I++) {
        scanf("%d", &DATOS[I]);
        if (DATOS[I] % 2 == 0) {
            CANTIDAD_PARES++;
            SUMA_PARES += DATOS[I];
        }
    }

    printf("Pares: %d\nSuma de pares: %d\n", CANTIDAD_PARES, SUMA_PARES);
    return 0;
}
