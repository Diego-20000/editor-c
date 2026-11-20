#include <stdio.h>

int main() {
    int i;
    float MEDICIONES[8];
    double SUMA;
    double PROMEDIO;
    int CANTIDAD;

    SUMA = 0.0;
    PROMEDIO = 0.0;
    CANTIDAD = 0;

    for (i = 0; i < 8; i++) {
        printf("Medicion %d: ", i + 1);
        scanf("%f", &MEDICIONES[i]);
        SUMA = SUMA + MEDICIONES[i];
    }

    PROMEDIO = SUMA / 8;
    printf("Promedio: %.3f\n", PROMEDIO);
    printf("Mediciones superiores al promedio:\n");

    for (i = 0; i < 8; i++) {
        if (MEDICIONES[i] > PROMEDIO) {
            printf("Posicion %d: %.2f\n", i + 1, MEDICIONES[i]);
            CANTIDAD = CANTIDAD + 1;
        }
    }
    printf("Cantidad superior al promedio: %d\n", CANTIDAD);
}
