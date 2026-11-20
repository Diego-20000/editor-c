#include <stdio.h>

int main() {
    int i;
    int j;
    int MATRIZ[3][3];
    int MAYOR;
    int FILA;
    int COLUMNA;

    MAYOR = 0;
    FILA = 0;
    COLUMNA = 0;

    for (i = 0; i < 3; i++) {
        for (j = 0; j < 3; j++) {
            printf("Elemento [%d][%d]: ", i + 1, j + 1);
            scanf("%d", &MATRIZ[i][j]);
            if (i == 0 && j == 0) {
                MAYOR = MATRIZ[i][j];
            } else if (MATRIZ[i][j] > MAYOR) {
                MAYOR = MATRIZ[i][j];
                FILA = i;
                COLUMNA = j;
            }
        }
    }

    printf("Mayor valor: %d\n", MAYOR);
    printf("Fila: %d\n", FILA + 1);
    printf("Columna: %d\n", COLUMNA + 1);
}
