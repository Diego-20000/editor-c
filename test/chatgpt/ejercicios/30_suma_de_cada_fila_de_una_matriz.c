#include <stdio.h>

int main(void) {
    int MATRIZ[3][3], SUMAS[3] = {0, 0, 0};
    int FILA, COLUMNA;

    for (FILA = 0; FILA < 3; FILA++) {
        for (COLUMNA = 0; COLUMNA < 3; COLUMNA++) {
            scanf("%d", &MATRIZ[FILA][COLUMNA]);
            SUMAS[FILA] += MATRIZ[FILA][COLUMNA];
        }
    }

    for (FILA = 0; FILA < 3; FILA++) {
        printf("Suma fila %d: %d\n", FILA + 1, SUMAS[FILA]);
    }
    return 0;
}
