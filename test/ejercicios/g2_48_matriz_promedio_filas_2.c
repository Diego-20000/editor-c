#include <stdio.h>

int main() {
    int i;
    int j;
    float DATOS[4][2];
    double SUMA;
    double PROMEDIO;

    SUMA = 0.0;
    PROMEDIO = 0.0;

    for (i = 0; i < 4; i++) {
        for (j = 0; j < 2; j++) {
            printf("Dato de fila %d, columna %d: ", i + 1, j + 1);
            scanf("%f", &DATOS[i][j]);
        }
    }

    for (i = 0; i < 4; i++) {
        SUMA = 0.0;
        for (j = 0; j < 2; j++) {
            SUMA = SUMA + DATOS[i][j];
        }
        PROMEDIO = SUMA / 2;
        printf("Promedio de la fila %d: %.2f\n", i + 1, PROMEDIO);
    }
}
