#include <stdio.h>

int main() {
    int i;
    int j;
    int MATRIZ[3][3];
    double SUMA_FILA;
    double SUMA_TOTAL;

    SUMA_FILA = 0;
    SUMA_TOTAL = 0;

    for (i = 0; i < 3; i++) {
        for (j = 0; j < 3; j++) {
            printf("Elemento [%d][%d]: ", i + 1, j + 1);
            scanf("%d", &MATRIZ[i][j]);
        }
    }

    printf("Matriz cargada:\n");
    for (i = 0; i < 3; i++) {
        SUMA_FILA = 0;
        for (j = 0; j < 3; j++) {
            printf("%5d", MATRIZ[i][j]);
            SUMA_FILA = SUMA_FILA + MATRIZ[i][j];
        }
        SUMA_TOTAL = SUMA_TOTAL + SUMA_FILA;
        printf(" | Suma: %.0f\n", SUMA_FILA);
    }
    printf("Suma total: %.0f\n", SUMA_TOTAL);
}
