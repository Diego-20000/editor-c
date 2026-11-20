#include <stdio.h>

int main() {
    int i;
    int j;
    int MATRIZ[3][3];
    double PRINCIPAL;
    double SECUNDARIA;

    PRINCIPAL = 0;
    SECUNDARIA = 0;

    for (i = 0; i < 3; i++) {
        for (j = 0; j < 3; j++) {
            printf("Valor de fila %d, columna %d: ", i + 1, j + 1);
            scanf("%d", &MATRIZ[i][j]);
        }
    }

    printf("Matriz:\n");
    for (i = 0; i < 3; i++) {
        for (j = 0; j < 3; j++) {
            printf("%4d", MATRIZ[i][j]);
        }
        printf("\n");
        PRINCIPAL = PRINCIPAL + MATRIZ[i][i];
        SECUNDARIA = SECUNDARIA + MATRIZ[i][2 - i];
    }

    printf("Diagonal principal: %.0f\n", PRINCIPAL);
    printf("Diagonal secundaria: %.0f\n", SECUNDARIA);
}
