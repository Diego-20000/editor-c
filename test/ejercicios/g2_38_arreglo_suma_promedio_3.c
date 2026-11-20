#include <stdio.h>

int main() {
    int i;
    float VALORES[6];
    double SUMA;
    double PROMEDIO;

    SUMA = 0.0;
    PROMEDIO = 0.0;

    for (i = 0; i < 6; i++) {
        printf("Valor %d: ", i + 1);
        scanf("%f", &VALORES[i]);
        SUMA = SUMA + VALORES[i];
    }

    printf("Valores cargados: ");
    for (i = 0; i < 6; i++) {
        printf("%.2f ", VALORES[i]);
    }
    printf("\n");

    PROMEDIO = SUMA / 6;
    printf("Suma: %.2f\n", SUMA);
    printf("Promedio: %.2f\n", PROMEDIO);
}
