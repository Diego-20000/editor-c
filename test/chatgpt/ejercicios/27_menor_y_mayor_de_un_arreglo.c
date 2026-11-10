#include <stdio.h>

int main(void) {
    int DATOS[10], N, I, MENOR, MAYOR;

    scanf("%d", &N);
    if (N < 1 || N > 10) {
        printf("Cantidad invalida\n");
        return 0;
    }

    scanf("%d", &DATOS[0]);
    MENOR = DATOS[0];
    MAYOR = DATOS[0];
    for (I = 1; I < N; I++) {
        scanf("%d", &DATOS[I]);
        if (DATOS[I] < MENOR) MENOR = DATOS[I];
        if (DATOS[I] > MAYOR) MAYOR = DATOS[I];
    }

    printf("Menor: %d\nMayor: %d\n", MENOR, MAYOR);
    return 0;
}
