#include <stdio.h>

double calcularPromedio(float NOTAS[], int CANTIDAD);

int main() {
    int i;
    float NOTAS[5];
    double PROMEDIO;

    PROMEDIO = 0.0;

    for (i = 0; i < 5; i++) {
        printf("Nota %d: ", i + 1);
        scanf("%f", &NOTAS[i]);
    }

    PROMEDIO = calcularPromedio(NOTAS, 5);
    printf("Promedio del curso: %.2f\n", PROMEDIO);
}

double calcularPromedio(float NOTAS[], int CANTIDAD) {
    int i;
    double SUMA;
    double PROMEDIO;

    SUMA = 0.0;
    PROMEDIO = 0.0;

    for (i = 0; i < CANTIDAD; i++) {
        SUMA = SUMA + NOTAS[i];
    }
    PROMEDIO = SUMA / CANTIDAD;
    return PROMEDIO;
}
